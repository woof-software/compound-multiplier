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

    mapping(address => Asset) public assets;
    mapping(address => bool) public markets;
    mapping(bytes4 => Plugin) public plugins;
    mapping(address => mapping(address => uint256)) public leverages;

    constructor(Plugin[] memory _plugins, Market[] memory _markets) {
        for (uint256 i = 0; i < _plugins.length; i++) {
            Plugin memory plugin = _plugins[i];
            bytes4 pluginSelector = ICometFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR();
            require(pluginSelector != bytes4(0), InvalidPluginSelector());
            plugins[pluginSelector] = plugin;
        }

        for (uint256 i = 0; i < _markets.length; i++) {
            Market memory marketConfig = _markets[i];
            require(!markets[marketConfig.market], AlreadyExists());
            markets[marketConfig.market] = true;
            address baseAsset = IComet(marketConfig.market).baseToken();
            _addAsset(baseAsset, marketConfig.baseAsset);

            for (uint256 j = 0; j < marketConfig.collaterals.length; j++) {
                Collateral memory collateral = marketConfig.collaterals[j];

                _addAsset(collateral.asset, collateral.config);

                require(
                    collateral.leverage > LEVERAGE_PRECISION && collateral.leverage <= MAX_LEVERAGE,
                    InvalidLeverage()
                );

                leverages[marketConfig.market][collateral.asset] = collateral.leverage;
            }
        }
    }

    fallback() external payable {
        address endpoint = plugins[msg.sig].endpoint;
        require(endpoint != address(0), UnknownCallbackSelector());

        (bool ok, bytes memory payload) = endpoint.delegatecall(msg.data);

        _catch(ok);

        ICometFlashLoanPlugin.CallbackData memory data = abi.decode(payload, (ICometFlashLoanPlugin.CallbackData));

        require(IERC20(data.asset).balanceOf(address(this)) == data.snapshot + data.debt, InvalidAmountOut());

        (uint256 amount, address market, address collateral, uint256 minAmountOut, Mode mode) = _tload();

        bool done;

        if (mode == Mode.EXECUTE) {
            uint256 totalAmount = _executeSwap(data.asset, collateral, data.debt, minAmountOut, data.swapData) + amount;

            IERC20(collateral).approve(market, totalAmount);

            IComet(market).supplyTo(data.user, collateral, totalAmount);
            IComet(market).withdrawFrom(data.user, address(this), data.asset, data.debt + data.fee);

            (done, ) = endpoint.delegatecall(
                abi.encodeWithSelector(
                    ICometFlashLoanPlugin.repayFlashLoan.selector,
                    data.flp,
                    data.asset,
                    data.debt + data.fee
                )
            );
            _catch(done);

            return;
        }

        if (mode == Mode.WITHDRAW) {
            IERC20(data.asset).approve(market, data.debt);
            IComet(market).supplyTo(data.user, data.asset, data.debt);

            uint128 bal = IComet(market).collateralBalanceOf(data.user, collateral);

            uint256 want = (amount == type(uint256).max) ? bal : Math.min(amount, uint256(bal));

            uint128 take = uint128(Math.min(uint256(_unlocked(IComet(market), collateral, data.debt)), want));

            if (take == 0) revert NothingToDeleverage();

            IComet(market).withdrawFrom(data.user, address(this), collateral, take);

            if (_executeSwap(collateral, data.asset, take, minAmountOut, data.swapData) < data.debt) {
                revert InvalidAmountOut();
            }

            uint256 baseLeft = IERC20(data.asset).balanceOf(address(this));

            (done, ) = endpoint.delegatecall(
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

            return;
        }
        revert InvalidMode();
    }

    receive() external payable {}

    function executeMultiplier(
        address market,
        address collateralAsset,
        uint256 collateralAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external nonReentrant {
        require(markets[market], UnknownMarket());
        Asset memory asset = assets[collateralAsset];
        Plugin memory plugin = plugins[asset.loanSelector];
        require(plugin.endpoint != address(0), UnsupportedAsset());
        require(leverage >= LEVERAGE_PRECISION && leverage <= leverages[market][collateralAsset], InvalidLeverage());
        IComet comet = IComet(market);

        uint256 leveraged = _leveraged(comet, collateralAsset, collateralAmount, leverage);

        address baseAsset = comet.baseToken();

        _tstore(collateralAmount, market, collateralAsset, minAmountOut, Mode.EXECUTE);

        IERC20(collateralAsset).safeTransferFrom(msg.sender, address(this), collateralAmount);

        _takeFlashLoan(
            plugin.endpoint,
            ICometFlashLoanPlugin.CallbackData(
                leveraged,
                0,
                IERC20(baseAsset).balanceOf(address(this)),
                msg.sender,
                asset.flp,
                baseAsset,
                swapData
            ),
            plugin.config
        );
    }

    function withdrawMultiplier(
        address market,
        address collateralAsset,
        uint256 baseAmount,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external nonReentrant {
        Plugin memory loanPlugin = plugins[assets[collateralAsset].loanSelector];
        require(loanPlugin.endpoint != address(0), UnsupportedAsset());

        IComet comet = IComet(market);

        uint256 repayAmount = comet.borrowBalanceOf(msg.sender);
        require(repayAmount > 0, NothingToDeleverage());

        address baseAsset = comet.baseToken();
        uint256 loanDebt = Math.min(repayAmount, minAmountOut);
        require(loanDebt > 0, InvalidLeverage());

        _tstore(baseAmount, market, collateralAsset, minAmountOut, Mode.WITHDRAW);

        _takeFlashLoan(
            loanPlugin.endpoint,
            ICometFlashLoanPlugin.CallbackData({
                debt: loanDebt,
                fee: 0,
                snapshot: IERC20(baseAsset).balanceOf(address(this)),
                user: msg.sender,
                flp: assets[baseAsset].flp,
                asset: baseAsset,
                swapData: swapData
            }),
            loanPlugin.config
        );
    }

    function _executeSwap(
        address srcToken,
        address dstToken,
        uint256 amount,
        uint256 minAmountOut,
        bytes memory swapData
    ) internal returns (uint256 amountOut) {
        if (srcToken == dstToken) {
            return amount;
        }

        Asset memory asset = assets[dstToken];
        Plugin memory plugin = plugins[asset.swapSelector];
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

    function _unlocked(IComet comet, address col, uint256 repayBase) internal view returns (uint128) {
        IComet.AssetInfo memory info = comet.getAssetInfoByAddress(col);
        uint256 price = comet.getPrice(info.priceFeed);
        uint64 collateralFactor = info.borrowCollateralFactor;

        uint256 num = price * comet.baseScale() * uint256(collateralFactor);
        uint256 den = _scale(info.priceFeed, uint256(info.scale)) * 1e18;

        uint256 unlocked = Math.mulDiv(repayBase, den, num);
        if (unlocked > type(uint128).max) unlocked = type(uint128).max;
        return uint128(unlocked);
    }

    function _takeFlashLoan(
        address endpoint,
        ICometFlashLoanPlugin.CallbackData memory data,
        bytes memory config
    ) internal {
        (bool ok, ) = endpoint.delegatecall(
            abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector, data, config)
        );
        _catch(ok);
    }

    function _addAsset(address assetAddress, Asset memory asset) internal {
        if (assets[assetAddress].flp != address(0)) {
            return;
        }
        require(
            plugins[asset.loanSelector].endpoint != address(0) && plugins[asset.swapSelector].endpoint != address(0),
            InvalidPluginSelector()
        );

        assets[assetAddress] = Asset({
            loanSelector: asset.loanSelector,
            swapSelector: asset.swapSelector,
            flp: asset.flp
        });

        emit AssetAdded(assetAddress, asset.loanSelector);
    }

    function _scale(address priceFeed, uint256 scale) internal view returns (uint256) {
        return 10 ** AggregatorV3Interface(priceFeed).decimals() * scale;
    }

    function _tstore(uint256 amount, address market, address collateral, uint256 minAmountOut, Mode mode) internal {
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            tstore(slot, amount)
            tstore(add(slot, 0x20), market)
            tstore(add(slot, 0x40), collateral)
            tstore(add(slot, 0x60), minAmountOut)
            tstore(add(slot, 0x80), mode)
        }
    }

    function _tload()
        internal
        returns (uint256 amount, address market, address collateral, uint256 minAmountOut, Mode mode)
    {
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            amount := tload(slot)
            market := tload(add(slot, 0x20))
            collateral := tload(add(slot, 0x40))
            minAmountOut := tload(add(slot, 0x60))
            mode := tload(add(slot, 0x80))
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
