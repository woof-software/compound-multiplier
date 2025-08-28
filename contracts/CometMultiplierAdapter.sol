// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import { IComet } from "./interfaces/IComet.sol";
import { ICometMultiplierAdapter } from "./interfaces/ICometMultiplierAdapter.sol";
import { ICometMultiplierPlugin } from "./interfaces/ICometMultiplierPlugin.sol";
import { IAggregationRouterV6, IAggregationExecutor } from "./interfaces/IAggregationRouterV6.sol";

import "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolActions.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "hardhat/console.sol";

contract CometMultiplierAdapter is Ownable, ICometMultiplierAdapter {
    using SafeERC20 for IERC20;

    uint256 constant LEVERAGE_PRECISION = 10_000;
    uint256 constant MAX_LEVERAGE = 50_000;

    bytes32 constant SLOT_ADAPTER = bytes32(uint256(keccak256("CometMultiplierAdapter.adapter")) - 1);

    IAggregationRouterV6 public router;

    mapping(address => mapping(address => Asset)) public assets;
    mapping(bytes4 => Plugin) public plugins;

    constructor(IAggregationRouterV6 _router, Plugin[] memory _plugins) Ownable(msg.sender) {
        for (uint256 i = 0; i < _plugins.length; i++) {
            Plugin memory plugin = _plugins[i];
            bytes4 pluginSelector = ICometMultiplierPlugin(plugin.endpoint).CALLBACK_SELECTOR();
            plugins[pluginSelector] = plugin;
        }

        router = _router;
    }

    fallback() external payable {
        Plugin memory plugin = plugins[msg.sig];
        require(plugin.endpoint != address(0), UnknownCallbackSelector());

        (bool ok, bytes memory payload) = plugin.endpoint.delegatecall(msg.data);

        _catch(ok);

        (address user, address flp, uint256 debt, bytes memory swapData) = abi.decode(
            payload,
            (address, address, uint256, bytes)
        );

        uint256 initialAmount;
        address market;
        address baseAsset;
        address collateralAsset;
        uint256 minAmountOut;

        bytes32 slot = SLOT_ADAPTER;

        assembly {
            initialAmount := tload(slot)
            market := tload(add(slot, 0x20))
            baseAsset := tload(add(slot, 0x40))
            collateralAsset := tload(add(slot, 0x60))
            minAmountOut := tload(add(slot, 0x80))
            tstore(slot, 0)
            tstore(add(slot, 0x20), 0)
            tstore(add(slot, 0x40), 0)
            tstore(add(slot, 0x60), 0)
            tstore(add(slot, 0x80), 0)
        }

        uint256 amountOut = _executeSwap(baseAsset, collateralAsset, debt, minAmountOut, swapData);
        uint256 totalAmount = amountOut + initialAmount;

        IERC20(collateralAsset).approve(market, totalAmount);

        IComet(market).supplyTo(user, collateralAsset, totalAmount);
        IComet(market).withdrawFrom(user, address(this), baseAsset, debt);
        (bool done, ) = plugin.endpoint.delegatecall(
            abi.encodeWithSelector(ICometMultiplierPlugin.repayFlashLoan.selector, flp, baseAsset, debt)
        );

        _catch(done);
    }

    receive() external payable {}

    function addPlugin(address plugin, bytes memory config) external onlyOwner {
        bytes4 pluginSelector = ICometMultiplierPlugin(plugin).CALLBACK_SELECTOR();
        if (pluginSelector == bytes4(0)) {
            revert InvalidPluginSelector();
        }
        plugins[pluginSelector] = Plugin({ endpoint: plugin, config: config });
        emit PluginAdded(plugin, pluginSelector);
    }

    function addAsset(
        address market,
        address collateralAsset,
        address flp,
        bytes4 pluginSelector,
        uint256 leverage
    ) external onlyOwner {
        require(plugins[pluginSelector].endpoint != address(0), InvalidPluginSelector());
        require(leverage > LEVERAGE_PRECISION && leverage <= MAX_LEVERAGE, InvalidLeverage());
        assets[market][collateralAsset] = Asset({ pluginSelector: pluginSelector, leverage: leverage, flp: flp });

        emit AssetAdded(market, collateralAsset, pluginSelector);
    }

    function executeMultiplier(
        address market,
        address collateralAsset,
        uint256 initialAmount,
        uint256 leverageBps,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external {
        Asset memory asset = assets[market][collateralAsset];
        Plugin memory plugin = plugins[asset.pluginSelector];
        require(plugin.endpoint != address(0), UnsupportedAsset());
        require(leverageBps >= LEVERAGE_PRECISION && leverageBps <= asset.leverage, InvalidLeverage());

        IComet comet = IComet(market);
        IComet.AssetInfo memory info = comet.getAssetInfoByAddress(collateralAsset);

        uint256 baseScale = comet.baseScale();
        uint256 price = comet.getPrice(info.priceFeed);
        uint256 initialValueBase = Math.mulDiv(Math.mulDiv(initialAmount, price, 1e8), baseScale, info.scale);

        uint256 deltaBps = leverageBps - LEVERAGE_PRECISION;
        uint256 baseAmount = Math.mulDiv(initialValueBase, deltaBps, LEVERAGE_PRECISION);

        IERC20(collateralAsset).transferFrom(msg.sender, address(this), initialAmount);

        address baseAsset = comet.baseToken();
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            tstore(slot, initialAmount)
            tstore(add(slot, 0x20), market)
            tstore(add(slot, 0x40), baseAsset)
            tstore(add(slot, 0x60), collateralAsset)
            tstore(add(slot, 0x80), minAmountOut)
        }

        (bool ok, ) = plugin.endpoint.delegatecall(
            abi.encodeWithSelector(
                ICometMultiplierPlugin.takeFlashLoan.selector,
                msg.sender,
                baseAsset,
                asset.flp,
                baseAmount,
                plugin.config,
                swapData
            )
        );

        _catch(ok);
    }

    function _executeSwap(
        address srcToken,
        address dstToken,
        uint256 amount,
        uint256 minAmountOut,
        bytes memory swapData
    ) internal returns (uint256 returnAmount) {
        if (srcToken == dstToken) {
            return amount;
        }

        IERC20(srcToken).approve(address(router), amount);
        (bool ok, bytes memory data) = address(router).call(swapData);
        _catch(ok);

        (returnAmount, ) = abi.decode(data, (uint256, uint256));

        require(returnAmount >= minAmountOut, InsufficiantAmountOut());
    }

    function _catch(bool success) internal pure {
        if (success) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }
    }
}
