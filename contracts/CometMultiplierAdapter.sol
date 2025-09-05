// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import { IComet } from "./interfaces/IComet.sol";
import { ICometMultiplierAdapter } from "./interfaces/ICometMultiplierAdapter.sol";
import { ICometSwapPlugin } from "./interfaces/ICometSwapPlugin.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";
import { IAggregationRouterV6, IAggregationExecutor } from "./interfaces/IAggregationRouterV6.sol";

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CometMultiplierAdapter is Ownable, Pausable, ReentrancyGuard, ICometMultiplierAdapter {
    using SafeERC20 for IERC20;

    uint256 constant LEVERAGE_PRECISION = 10_000;
    uint256 constant MAX_LEVERAGE = 50_000;

    bytes32 constant SLOT_ADAPTER = bytes32(uint256(keccak256("CometMultiplierAdapter.adapter")) - 1);

    mapping(address => Asset) public assets;
    mapping(address => bool) public markets;

    mapping(bytes4 => Plugin) public plugins;

    mapping(address => mapping(address => uint256)) public leverages;

    constructor(Plugin[] memory _plugins) Ownable(msg.sender) {
        for (uint256 i = 0; i < _plugins.length; i++) {
            Plugin memory plugin = _plugins[i];
            bytes4 pluginSelector = ICometFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR();
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

        (uint256 amount, address market, address collateral, uint256 minAmountOut, Mode mode) = _tload();

        bool done;

        if (mode == Mode.EXECUTE) {
            uint256 totalAmount = _executeSwap(data.asset, collateral, data.debt, minAmountOut, data.swapData) + amount;

            IERC20(collateral).approve(market, totalAmount);

            IComet(market).supplyTo(data.user, collateral, totalAmount);
            IComet(market).withdrawFrom(data.user, address(this), data.asset, data.debt);
            (done, ) = endpoint.delegatecall(
                abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector, data.flp, data.asset, data.debt)
            );

            _catch(done);

            return;
        }
        if (mode == Mode.WITHDRAW) {
            IERC20(data.asset).approve(market, data.debt);
            IComet(market).supplyTo(data.user, data.asset, data.debt);

            IComet(market).withdrawFrom(data.user, address(this), collateral, type(uint256).max);

            require(
                _executeSwap(collateral, data.asset, amount, minAmountOut, data.swapData) >= data.debt,
                InsufficiantAmountOut()
            );

            (done, ) = endpoint.delegatecall(
                abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector, data.flp, data.asset, data.debt)
            );
            _catch(done);

            uint256 leftoverAsset = IERC20(data.asset).balanceOf(address(this));
            if (leftoverAsset > 0) IERC20(data.asset).safeTransfer(data.user, leftoverAsset);

            uint256 leftoverColl = IERC20(collateral).balanceOf(address(this));
            if (leftoverColl > 0) IERC20(collateral).safeTransfer(data.user, leftoverColl);

            return;
        }
        revert InvalidMode();
    }

    receive() external payable {}

    function addPlugin(address plugin, bytes memory config) external onlyOwner {
        bytes4 pluginSelector = ICometFlashLoanPlugin(plugin).CALLBACK_SELECTOR();
        if (pluginSelector == bytes4(0)) {
            revert InvalidPluginSelector();
        }
        plugins[pluginSelector] = Plugin({ endpoint: plugin, config: config });
        emit PluginAdded(plugin, pluginSelector);
    }

    function addMarket(address market, Asset memory asset) external onlyOwner {
        require(!markets[market], AlreadyExists());
        markets[market] = true;

        address baseAsset = IComet(market).baseToken();
        _addAsset(baseAsset, asset);
    }

    function addCollateral(
        address market,
        address collateralAsset,
        Asset memory asset,
        uint256 leverage
    ) external onlyOwner {
        require(markets[market], UnknownMarket());
        _addAsset(collateralAsset, asset);
        require(leverage > LEVERAGE_PRECISION && leverage <= MAX_LEVERAGE, InvalidLeverage());
        leverages[market][collateralAsset] = leverage;
    }

    function executeMultiplier(
        address market,
        address collateralAsset,
        uint256 initialAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused {
        require(markets[market], UnknownMarket());
        Asset memory asset = assets[collateralAsset];
        Plugin memory plugin = plugins[asset.loanSelector];
        require(plugin.endpoint != address(0), UnsupportedAsset());
        require(leverage >= LEVERAGE_PRECISION && leverage <= leverages[market][collateralAsset], InvalidLeverage());
        IComet comet = IComet(market);

        uint256 levereged = _leveraged(comet, collateralAsset, initialAmount, leverage);

        address baseAsset = comet.baseToken();
        _tstore(initialAmount, market, collateralAsset, minAmountOut, Mode.EXECUTE);
        _takeFlashLoan(
            plugin.endpoint,
            ICometFlashLoanPlugin.CallbackData(
                (levereged * (leverage - LEVERAGE_PRECISION)) / LEVERAGE_PRECISION,
                IERC20(baseAsset).balanceOf(address(this)),
                0,
                msg.sender,
                asset.flp,
                baseAsset,
                swapData
            )
        );
    }

    function withdrawMultiplier(
        address market,
        address collateralAsset,
        uint256 sellAmount,
        bytes calldata swapData,
        uint256 minBaseOut
    ) external nonReentrant whenNotPaused {
        Plugin memory loanPlugin = plugins[assets[collateralAsset].loanSelector];
        require(loanPlugin.endpoint != address(0), UnsupportedAsset());

        IComet comet = IComet(market);

        uint256 repayAmount = comet.borrowBalanceOf(msg.sender);
        require(repayAmount > 0, NothingToDeleverage());

        address baseAsset = comet.baseToken();

        _tstore(sellAmount, market, collateralAsset, minBaseOut, Mode.WITHDRAW);
        _takeFlashLoan(
            loanPlugin.endpoint,
            ICometFlashLoanPlugin.CallbackData(
                repayAmount,
                IERC20(baseAsset).balanceOf(address(this)),
                0,
                msg.sender,
                assets[baseAsset].flp,
                baseAsset,
                swapData
            )
        );
    }

    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        _unpause();
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

        bytes memory _calldata = abi.encodeWithSelector(
            ICometSwapPlugin.executeSwap.selector,
            srcToken,
            dstToken,
            amount,
            minAmountOut,
            plugin.config,
            swapData
        );

        (bool ok, bytes memory data) = address(plugin.endpoint).delegatecall(_calldata);

        _catch(ok);

        amountOut = abi.decode(data, (uint256));

        require(amountOut >= minAmountOut, InsufficiantAmountOut());
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

    function _takeFlashLoan(address endpoint, ICometFlashLoanPlugin.CallbackData memory data) internal {
        (bool ok, ) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector, data));

        _catch(ok);
    }

    function _addAsset(address collateralAsset, Asset memory asset) internal onlyOwner {
        if (assets[collateralAsset].flp != address(0)) {
            return;
        }
        require(
            plugins[asset.loanSelector].endpoint != address(0) && plugins[asset.swapSelector].endpoint != address(0),
            InvalidPluginSelector()
        );

        assets[collateralAsset] = Asset({
            loanSelector: asset.loanSelector,
            swapSelector: asset.swapSelector,
            flp: asset.flp
        });

        emit AssetAdded(collateralAsset, asset.loanSelector);
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
