// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IComet } from "./interfaces/IComet.sol";
import { ICometMultiplierAdapter } from "./interfaces/ICometMultiplierAdapter.sol";
import { ICometSwapPlugin } from "./interfaces/ICometSwapPlugin.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";
import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CometMultiplierAdapter is ReentrancyGuard, ICometMultiplierAdapter {
    using SafeERC20 for IERC20;

    uint256 constant LEVERAGE_PRECISION = 10_000;
    uint256 constant MAX_LEVERAGE = 50_000;
    bytes32 constant SLOT_ADAPTER = bytes32(uint256(keccak256("CometMultiplierAdapter.adapter")) - 1);

    mapping(bytes4 => Plugin) public plugins;

    constructor(Plugin[] memory _plugins) {
        for (uint256 i = 0; i < _plugins.length; i++) {
            Plugin memory plugin = _plugins[i];
            bytes4 pluginSelector = ICometFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR();
            require(pluginSelector != bytes4(0), InvalidPluginSelector());
            plugins[pluginSelector] = plugin;
        }
    }

    fallback() external payable {
        address endpoint = plugins[msg.sig].endpoint;
        require(endpoint != address(0), UnknownCallbackSelector());

        (bool ok, bytes memory payload) = endpoint.delegatecall(msg.data);
        _catch(ok);

        ICometFlashLoanPlugin.CallbackData memory data = abi.decode(payload, (ICometFlashLoanPlugin.CallbackData));
        require(IERC20(data.asset).balanceOf(address(this)) == data.snapshot + data.debt, InvalidAmountOut());

        bytes32 slot = SLOT_ADAPTER;
        Mode mode;
        assembly {
            mode := tload(add(slot, 0xa0))
        }

        if (mode == Mode.EXECUTE) {
            _execute(data, endpoint);
        } else if (mode == Mode.WITHDRAW) {
            _withdraw(data, endpoint);
        } else {
            revert InvalidMode();
        }
    }

    receive() external payable {}

    function executeMultiplier(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external nonReentrant {
        Plugin memory plugin = plugins[opts.loanSelector];
        require(plugin.endpoint != address(0), InvalidPluginSelector());
        IComet comet = IComet(opts.market);

        uint256 leveraged = _leveraged(comet, collateral, collateralAmount, leverage);

        address baseAsset = comet.baseToken();

        _tstore(collateralAmount, opts.market, collateral, minAmountOut, opts.swapSelector, Mode.EXECUTE);

        IERC20(collateral).safeTransferFrom(msg.sender, address(this), collateralAmount);

        _loan(
            plugin.endpoint,
            ICometFlashLoanPlugin.CallbackData(
                leveraged,
                0,
                IERC20(baseAsset).balanceOf(address(this)),
                msg.sender,
                opts.flp,
                baseAsset,
                swapData
            ),
            plugin.config
        );
    }

    function withdrawMultiplier(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external nonReentrant {
        Plugin memory loanPlugin = plugins[opts.loanSelector];
        IComet comet = IComet(opts.market);

        uint256 repayAmount = comet.borrowBalanceOf(msg.sender);
        require(repayAmount > 0, NothingToDeleverage());

        address baseAsset = comet.baseToken();

        uint256 loanDebt = _convert(comet, collateral, collateralAmount, false);
        loanDebt = Math.min(loanDebt, repayAmount);

        require(loanDebt > 0, InvalidLeverage());

        _tstore(collateralAmount, opts.market, collateral, minAmountOut, opts.swapSelector, Mode.WITHDRAW);

        _loan(
            loanPlugin.endpoint,
            ICometFlashLoanPlugin.CallbackData({
                debt: loanDebt,
                fee: 0,
                snapshot: IERC20(baseAsset).balanceOf(address(this)),
                user: msg.sender,
                flp: opts.flp,
                asset: baseAsset,
                swapData: swapData
            }),
            loanPlugin.config
        );
    }

    function _execute(ICometFlashLoanPlugin.CallbackData memory data, address endpoint) private {
        (uint256 amount, address market, address collateral, uint256 minAmountOut, bytes4 swapSelector) = _tload();

        uint256 totalAmount = _swap(data.asset, collateral, data.debt, minAmountOut, swapSelector, data.swapData) +
            amount;

        IERC20(collateral).approve(market, totalAmount);
        IComet(market).supplyTo(data.user, collateral, totalAmount);
        IComet(market).withdrawFrom(data.user, address(this), data.asset, data.debt + data.fee);

        (bool done, ) = endpoint.delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.repayFlashLoan.selector,
                data.flp,
                data.asset,
                data.debt + data.fee
            )
        );

        _catch(done);
    }

    function _withdraw(ICometFlashLoanPlugin.CallbackData memory data, address endpoint) private {
        (uint256 amount, address market, address collateral, uint256 minAmountOut, bytes4 swapSelector) = _tload();

        IERC20(data.asset).approve(market, data.debt);
        IComet(market).supplyTo(data.user, data.asset, data.debt);

        uint128 collateralBalance = IComet(market).collateralBalanceOf(data.user, collateral);
        uint128 take = _converted(market, collateral, data.debt, amount, collateralBalance);

        if (take == 0) revert NothingToDeleverage();

        IComet(market).withdrawFrom(data.user, address(this), collateral, take);
        uint256 amountOut = _swap(collateral, data.asset, take, minAmountOut, swapSelector, data.swapData);
        if (amountOut < data.debt) {
            revert InvalidAmountOut();
        }

        uint256 baseLeft = IERC20(data.asset).balanceOf(address(this));

        (bool done, ) = endpoint.delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.repayFlashLoan.selector,
                data.flp,
                data.asset,
                data.debt + data.fee
            )
        );

        _catch(done);

        baseLeft -= data.debt + data.fee;

        if (baseLeft > 0) IERC20(data.asset).safeTransfer(data.user, baseLeft);

        uint256 collateralLeft = IERC20(collateral).balanceOf(address(this));
        if (collateralLeft > 0) IERC20(collateral).safeTransfer(data.user, collateralLeft);
    }

    function _swap(
        address srcToken,
        address dstToken,
        uint256 amount,
        uint256 minAmountOut,
        bytes4 swapSelector,
        bytes memory swapData
    ) internal returns (uint256 amountOut) {
        if (srcToken == dstToken) {
            return amount;
        }

        Plugin memory plugin = plugins[swapSelector];
        require(plugin.endpoint != address(0), UnknownSwapPlugin());

        bytes memory callData = abi.encodeWithSelector(
            ICometSwapPlugin.executeSwap.selector,
            srcToken,
            dstToken,
            amount,
            minAmountOut,
            plugin.config,
            swapData
        );

        (bool ok, bytes memory data) = address(plugin.endpoint).delegatecall(callData);
        _catch(ok);

        amountOut = abi.decode(data, (uint256));

        require(amountOut >= minAmountOut, InvalidAmountOut());
    }

    function _loan(address endpoint, ICometFlashLoanPlugin.CallbackData memory data, bytes memory config) internal {
        (bool ok, ) = endpoint.delegatecall(
            abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector, data, config)
        );
        _catch(ok);
    }

    function _leveraged(
        IComet comet,
        address collateralAsset,
        uint256 initialAmount,
        uint256 leverage
    ) internal view returns (uint256) {
        IComet.AssetInfo memory info = comet.getAssetInfoByAddress(collateralAsset);
        uint256 initialValueBase = Math.mulDiv(
            Math.mulDiv(initialAmount, comet.getPrice(info.priceFeed), 1e8),
            comet.baseScale(),
            info.scale
        );
        return Math.mulDiv(initialValueBase, leverage - LEVERAGE_PRECISION, LEVERAGE_PRECISION);
    }

    function _convert(
        IComet comet,
        address col,
        uint256 amount,
        bool debtToCollateral
    ) internal view returns (uint256) {
        IComet.AssetInfo memory info = comet.getAssetInfoByAddress(col);
        uint256 price = comet.getPrice(info.priceFeed);
        uint64 collateralFactor = info.borrowCollateralFactor;

        uint256 num = price * comet.baseScale() * uint256(collateralFactor);
        uint256 den = _scale(info.priceFeed, uint256(info.scale)) * 1e18;

        if (debtToCollateral) {
            uint256 unlocked = Math.mulDiv(amount, den, num);
            return unlocked > type(uint128).max ? type(uint128).max : unlocked;
        } else {
            return Math.mulDiv(amount, num, den);
        }
    }

    function _converted(
        address market,
        address collateral,
        uint256 debt,
        uint256 amount,
        uint128 collateralBalance
    ) private view returns (uint128) {
        uint256 unlocked = _convert(IComet(market), collateral, debt, true);
        uint256 maxAmount = (amount == type(uint256).max)
            ? collateralBalance
            : Math.min(amount, uint256(collateralBalance));
        return uint128(Math.min(unlocked, maxAmount));
    }

    function _scale(address priceFeed, uint256 scale) internal view returns (uint256) {
        return 10 ** AggregatorV3Interface(priceFeed).decimals() * scale;
    }

    function _tstore(
        uint256 amount,
        address market,
        address collateral,
        uint256 minAmountOut,
        bytes4 swapSelector,
        Mode mode
    ) internal {
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            tstore(slot, amount)
            tstore(add(slot, 0x20), market)
            tstore(add(slot, 0x40), collateral)
            tstore(add(slot, 0x60), minAmountOut)
            tstore(add(slot, 0x80), swapSelector)
            tstore(add(slot, 0xa0), mode)
        }
    }

    function _tload()
        internal
        returns (uint256 amount, address market, address collateral, uint256 minAmountOut, bytes4 swapSelector)
    {
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            amount := tload(slot)
            market := tload(add(slot, 0x20))
            collateral := tload(add(slot, 0x40))
            minAmountOut := tload(add(slot, 0x60))
            swapSelector := tload(add(slot, 0x80))
            //mode excluded, loaded in the fallback
            tstore(slot, 0)
            tstore(add(slot, 0x20), 0)
            tstore(add(slot, 0x40), 0)
            tstore(add(slot, 0x60), 0)
            tstore(add(slot, 0x80), 0)
        }
    }

    function _catch(bool success) internal pure {
        if (!success) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }
    }
}
