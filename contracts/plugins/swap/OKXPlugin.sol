// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { ICometSwapPlugin } from "../../interfaces/ICometSwapPlugin.sol";
import { IOKX } from "../../external/okx/IOKX.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ICometAlerts as ICA } from "../../interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "../../interfaces/ICometEvents.sol";

/**
 * @title OKXPlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Swap plugin for integrating OKX DEX aggregator with CometMultiplier
 * @dev Implements ICometSwapPlugin interface for OKX dagSwap routing
 */
contract OKXPlugin is ICometSwapPlugin {
    using SafeERC20 for IERC20;

    bytes4 public constant SWAP_SELECTOR = bytes4(bytes("OKX"));

    bytes4 public constant DAG_SWAP_SELECTOR = IOKX.dagSwapTo.selector;
    bytes4 public constant DAG_SWAP_BY_ORDER_ID_SELECTOR = IOKX.dagSwapByOrderId.selector;

    bytes4 public constant SMART_SWAP_TO_SELECTOR = IOKX.smartSwapTo.selector;
    bytes4 public constant SMART_SWAP_BY_ORDER_ID_SELECTOR = IOKX.smartSwapByOrderId.selector;

    bytes4 public constant UNIV3_SWAP_SELECTOR = IOKX.uniswapV3SwapTo.selector;

    bytes4 public constant UNXSWAP_TO_SELECTOR = IOKX.unxswapTo.selector;
    bytes4 public constant UNXSWAP_BY_ORDER_ID_SELECTOR = IOKX.unxswapByOrderId.selector;

    /**
     * @inheritdoc ICometSwapPlugin
     */
    function swap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut) {
        require(srcToken != address(0) && dstToken != address(0) && srcToken != dstToken, ICA.InvalidTokens());
        require(amountIn > 0, ICA.InvalidAmountIn());

        bytes4 selector = bytes4(swapData[:4]);

        uint256 minReturn = _decodeAndValidateSwapData(selector, swapData, srcToken, dstToken, amountIn);
        (address router, address approveProxy) = abi.decode(config, (address, address));

        require(router.code.length > 0, ICA.InvalidSwapParameters());
        require(approveProxy.code.length > 0, ICA.InvalidSwapParameters());

        IERC20(srcToken).safeIncreaseAllowance(approveProxy, amountIn);
        uint256 balBefore = IERC20(dstToken).balanceOf(address(this));

        (bool ok, ) = router.call(swapData);

        if (!ok) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }

        amountOut = IERC20(dstToken).balanceOf(address(this)) - balBefore;
        require(amountOut >= minReturn, ICA.InvalidAmountOut());

        emit ICE.Swap(router, srcToken, dstToken, amountOut);
    }

    /**
     * @notice Decodes and validates swap data based on the function selector
     * @param selector Function selector from swapData
     * @param swapData Encoded swap data from OKX API
     * @param srcToken Expected source token address
     * @param dstToken Expected destination token address
     * @param amountIn Expected input amount
     * @return The minimum return amount extracted from swapData
     * @dev Routes to the appropriate decoder/validator based on the selector
     */
    function _decodeAndValidateSwapData(
        bytes4 selector,
        bytes calldata swapData,
        address srcToken,
        address dstToken,
        uint256 amountIn
    ) internal view returns (uint256) {
        if (selector == DAG_SWAP_SELECTOR || selector == DAG_SWAP_BY_ORDER_ID_SELECTOR) {
            return _decodeAndValidateDagSwap(selector, swapData, srcToken, dstToken, amountIn);
        }
        if (selector == SMART_SWAP_TO_SELECTOR || selector == SMART_SWAP_BY_ORDER_ID_SELECTOR) {
            return _decodeAndValidateSmartSwap(selector, swapData, srcToken, dstToken, amountIn);
        }
        if (selector == UNXSWAP_TO_SELECTOR || selector == UNXSWAP_BY_ORDER_ID_SELECTOR) {
            return _decodeAndValidateUnxSwap(selector, swapData, srcToken, amountIn);
        }
        if (selector == UNIV3_SWAP_SELECTOR) {
            return _decodeAndValidateUniV3Swap(swapData, amountIn);
        }
        revert ICA.InvalidSelector();
    }

    /**
     * @notice Decodes and validates DAG swap parameters
     * @param selector Function selector (DAG_SWAP_SELECTOR or DAG_SWAP_BY_ORDER_ID_SELECTOR)
     * @param swapData Encoded swap data from OKX API
     * @param srcToken Expected source token address
     * @param dstToken Expected destination token address
     * @param amountIn Expected input amount
     * @return minReturn Minimum return amount from baseRequest
     * @dev Validates receiver, amounts, paths, and token addresses for DAG swaps
     */
    function _decodeAndValidateDagSwap(
        bytes4 selector,
        bytes calldata swapData,
        address srcToken,
        address dstToken,
        uint256 amountIn
    ) internal view returns (uint256 minReturn) {
        IOKX.BaseRequest memory baseRequest;
        IOKX.RouterPath[] memory paths;
        address receiver;

        if (selector == DAG_SWAP_SELECTOR) {
            (, receiver, baseRequest, paths) = abi.decode(
                swapData[4:],
                (uint256, address, IOKX.BaseRequest, IOKX.RouterPath[])
            );
        } else {
            (, baseRequest, paths) = abi.decode(swapData[4:], (uint256, IOKX.BaseRequest, IOKX.RouterPath[]));
            receiver = address(this);
        }

        require(receiver == address(this), ICA.InvalidReceiver());
        require(baseRequest.minReturnAmount != 0, ICA.InvalidSwapParameters());
        require(baseRequest.fromTokenAmount == amountIn, ICA.InvalidSwapParameters());
        require(paths.length > 0, ICA.InvalidSwapParameters());

        uint256 fromToken = paths[0].fromToken;
        require(
            baseRequest.fromToken == fromToken &&
                uint160(fromToken) == uint160(srcToken) &&
                baseRequest.toToken == dstToken,
            ICA.InvalidTokens()
        );

        minReturn = baseRequest.minReturnAmount;
    }

    /**
     * @notice Decodes and validates Smart swap parameters
     * @param selector Function selector (SMART_SWAP_TO_SELECTOR or SMART_SWAP_BY_ORDER_ID_SELECTOR)
     * @param swapData Encoded swap data from OKX API
     * @return minReturn Minimum return amount from baseRequest
     * @dev Validates receiver, amounts for Smart swaps. Handles PMMSwapRequest[] extraData parameter.
     */
    function _decodeAndValidateSmartSwap(
        bytes4 selector,
        bytes calldata swapData,
        address srcToken,
        address dstToken,
        uint256 amountIn
    ) internal view returns (uint256 minReturn) {
        IOKX.BaseRequest memory baseRequest;
        address receiver;

        if (selector == SMART_SWAP_TO_SELECTOR) {
            (, receiver, baseRequest, , , ) = abi.decode(
                swapData[4:],
                (uint256, address, IOKX.BaseRequest, uint256[], IOKX.RouterPath[][], IOKX.PMMSwapRequest[])
            );
        } else {
            (, baseRequest, , , ) = abi.decode(
                swapData[4:],
                (uint256, IOKX.BaseRequest, uint256[], IOKX.RouterPath[][], IOKX.PMMSwapRequest[])
            );
            receiver = address(this);
        }

        require(receiver == address(this), ICA.InvalidReceiver());
        require(baseRequest.minReturnAmount != 0, ICA.InvalidSwapParameters());
        require(baseRequest.fromTokenAmount == amountIn, ICA.InvalidSwapParameters());
        require(
            uint160(baseRequest.fromToken) == uint160(srcToken) && baseRequest.toToken == dstToken,
            ICA.InvalidTokens()
        );

        minReturn = baseRequest.minReturnAmount;
    }

    /**
     * @notice Decodes and validates Uniswap V3 swap parameters
     * @param swapData Encoded swap data from OKX API
     * @param amountIn Expected input amount
     * @return minReturn Minimum return amount from swap parameters
     * @dev Validates receiver, amounts for Uniswap V3 swaps. For UNIV3_SWAP_SELECTOR,
     *      receiver is encoded as uint256 and must be converted to address.
     */
    function _decodeAndValidateUniV3Swap(
        bytes calldata swapData,
        uint256 amountIn
    ) internal view returns (uint256 minReturn) {
        uint256 amount;

        uint256 _receiver;
        (_receiver, amount, minReturn, ) = abi.decode(swapData[4:], (uint256, uint256, uint256, uint256[]));
        address receiver = address(uint160(_receiver));

        require(receiver == address(this), ICA.InvalidReceiver());
        require(minReturn != 0, ICA.InvalidSwapParameters());
        require(amount == amountIn, ICA.InvalidSwapParameters());

        return minReturn;
    }

    /**
     * @notice Decodes and validates Unxswap parameters
     * @param selector Function selector (UNXSWAP_TO_SELECTOR, UNXSWAP_BY_ORDER_ID_SELECTOR, UNXSWAP_EXACT_OUT_SELECTOR, or UNXSWAP_EXACT_OUT_BY_ORDER_ID_SELECTOR)
     * @param swapData Encoded swap data from OKX API
     * @param amountIn Expected input amount
     * @return minReturn Minimum return amount from swap parameters
     * @dev Validates receiver, amounts for Unxswap operations
     */
    function _decodeAndValidateUnxSwap(
        bytes4 selector,
        bytes calldata swapData,
        address srcToken,
        uint256 amountIn
    ) internal view returns (uint256 minReturn) {
        address receiver;
        uint256 fromToken;
        uint256 amount;

        if (selector == UNXSWAP_TO_SELECTOR) {
            (fromToken, amount, minReturn, receiver, ) = abi.decode(
                swapData[4:],
                (uint256, uint256, uint256, address, bytes32[])
            );
        } else {
            (fromToken, amount, minReturn, ) = abi.decode(swapData[4:], (uint256, uint256, uint256, bytes32[]));
            receiver = address(this);
        }

        require(receiver == address(this), ICA.InvalidReceiver());
        require(minReturn != 0, ICA.InvalidSwapParameters());
        require(amount == amountIn, ICA.InvalidSwapParameters());
        require(uint160(fromToken) == uint160(srcToken), ICA.InvalidTokens());
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometSwapPlugin).interfaceId;
    }
}
