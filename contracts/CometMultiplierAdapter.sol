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

contract CometMultiplierAdapter is Ownable, ICometMultiplierAdapter {
    using SafeERC20 for IERC20;

    uint256 constant LEVERAGE_PRECISION = 10_000;

    bytes32 constant SLOT_ADAPTER = bytes32(uint256(keccak256("CometMultiplierAdapter.adapter")) - 1);

    IAggregationRouterV6 public router;

    mapping(address => mapping(address => bytes4)) public selectors;
    mapping(bytes4 => uint256) public leverages;
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

        require(ok, FlashLoanFailed());
        (address flp, uint256 debt) = abi.decode(payload, (address, uint256));

        bytes memory data;
        bytes32 slot = SLOT_ADAPTER;
        assembly {
            data := tload(slot)
            tstore(slot, 0)
        }

        (
            uint256 initialAmount,
            address market,
            address baseAsset,
            address collateralAsset,
            uint256 minAmountOut,
            bytes memory swapData
        ) = abi.decode(data, (uint256, address, address, address, uint256, bytes));

        uint256 amountOut = _executeSwap(baseAsset, collateralAsset, debt, minAmountOut, swapData);

        uint256 totalAmount = amountOut + initialAmount;

        IERC20(collateralAsset).approve(market, totalAmount);

        IComet(market).supplyTo(msg.sender, collateralAsset, totalAmount);
        IComet(market).withdrawFrom(msg.sender, address(this), baseAsset, debt);

        IERC20(baseAsset).transfer(flp, debt);
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
        bytes4 pluginSelector,
        uint256 leverage
    ) external onlyOwner {
        require(plugins[pluginSelector].endpoint != address(0), InvalidPluginSelector());
        require(leverage <= LEVERAGE_PRECISION && leverage > 0, InvalidLeverage());
        selectors[market][collateralAsset] = pluginSelector;
        leverages[pluginSelector] = leverage;

        emit AssetAdded(market, collateralAsset, pluginSelector);
    }

    function executeMultiplier(
        address market,
        address collateralAsset,
        uint256 initialAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external {
        bytes4 selector = selectors[market][collateralAsset];
        Plugin memory plugin = plugins[selector];
        require(plugin.endpoint != address(0), UnsupportedAsset());
        require(leverage <= leverages[selector] && leverage > 0, InvalidLeverage());

        address priceFeed = IComet(market).getAssetInfoByAddress(collateralAsset).priceFeed;
        require(priceFeed != address(0), UnsupportedPriceFeed());

        uint256 baseAmount = (initialAmount * IComet(market).getPrice(priceFeed) * LEVERAGE_PRECISION) / leverage;

        IERC20(collateralAsset).transferFrom(msg.sender, address(this), initialAmount);

        address baseAsset = IComet(market).baseToken();

        bytes32 slot = SLOT_ADAPTER;

        bytes memory data = abi.encode(initialAmount, market, baseAsset, collateralAsset, minAmountOut, swapData);

        assembly {
            tstore(slot, data)
        }

        (bool ok, ) = plugin.endpoint.delegatecall(
            abi.encodeWithSelector(
                ICometMultiplierPlugin.takeFlashLoan.selector,
                baseAsset,
                baseAmount,
                swapData,
                plugin.config
            )
        );

        require(ok, FlashLoanFailed());
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

        IAggregationRouterV6.SwapDescription memory desc = IAggregationRouterV6.SwapDescription({
            srcToken: IERC20(srcToken),
            dstToken: IERC20(dstToken),
            srcReceiver: address(this),
            dstReceiver: address(this),
            amount: amount,
            minReturnAmount: minAmountOut,
            flags: 0
        });

        (returnAmount, ) = router.swap{ value: msg.value }(
            IAggregationExecutor(payable(address(this))),
            desc,
            swapData
        );

        require(returnAmount >= minAmountOut, InsufficiantAmountOut());
    }
}
