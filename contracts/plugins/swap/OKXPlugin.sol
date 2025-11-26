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
    bytes4 public constant UNIV3_SWAP_TO_WITH_BASE_REQUEST_SELECTOR = IOKX.uniswapV3SwapToWithBaseRequest.selector;

    bytes4 public constant UNXSWAP_TO_SELECTOR = IOKX.unxswapTo.selector;
    bytes4 public constant UNXSWAP_BY_ORDER_ID_SELECTOR = IOKX.unxswapByOrderId.selector;
    bytes4 public constant UNXSWAP_TO_WITH_BASE_REQUEST_SELECTOR = IOKX.unxswapToWithBaseRequest.selector;

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

        address self = address(this);
        uint256 minReturnAmount = _decodeAndValidateSwapData(selector, swapData, srcToken, dstToken, amountIn, self);
        (address router, address approveProxy) = abi.decode(config, (address, address));

        require(router.code.length > 0, ICA.InvalidSwapParameters());
        require(approveProxy.code.length > 0, ICA.InvalidSwapParameters());

        IERC20(srcToken).safeIncreaseAllowance(approveProxy, amountIn);
        uint256 balBefore = IERC20(dstToken).balanceOf(self);

        (bool ok, ) = router.call(swapData);

        if (!ok) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }

        amountOut = IERC20(dstToken).balanceOf(self) - balBefore;
        require(amountOut >= minReturnAmount, ICA.InvalidAmountOut());

        emit ICE.Swap(router, srcToken, dstToken, amountOut);
    }

    /**
     * @notice Decodes and validates swap data based on the function selector
     * @param selector Function selector from swapData
     * @param swapData Encoded swap data from OKX API
     * @param srcToken Expected source token address
     * @param dstToken Expected destination token address
     * @param amountIn Expected input amount
     * @param self Address of this contract (for receiver validation)
     * @return minReturnAmount Minimum return amount extracted from swapData
     * @dev Routes to the appropriate decoder/validator based on the selector
     */
    function _decodeAndValidateSwapData(
        bytes4 selector,
        bytes calldata swapData,
        address srcToken,
        address dstToken,
        uint256 amountIn,
        address self
    ) internal pure returns (uint256 minReturnAmount) {
        if (selector == DAG_SWAP_SELECTOR || selector == DAG_SWAP_BY_ORDER_ID_SELECTOR) {
            return _decodeAndValidateDagSwap(selector, swapData, srcToken, dstToken, amountIn, self);
        } else if (selector == SMART_SWAP_TO_SELECTOR || selector == SMART_SWAP_BY_ORDER_ID_SELECTOR) {
            return _decodeAndValidateSmartSwap(selector, swapData, amountIn, self);
        } else if (selector == UNIV3_SWAP_SELECTOR || selector == UNIV3_SWAP_TO_WITH_BASE_REQUEST_SELECTOR) {
            return _decodeAndValidateUniV3Swap(selector, swapData, amountIn, self);
        } else if (
            selector == UNXSWAP_TO_SELECTOR ||
            selector == UNXSWAP_BY_ORDER_ID_SELECTOR ||
            selector == UNXSWAP_TO_WITH_BASE_REQUEST_SELECTOR
        ) {
            return _decodeAndValidateUnxSwap(selector, swapData, amountIn, self);
        } else {
            revert ICA.InvalidSelector();
        }
    }

    /**
     * @notice Decodes and validates DAG swap parameters
     * @param selector Function selector (DAG_SWAP_SELECTOR or DAG_SWAP_BY_ORDER_ID_SELECTOR)
     * @param swapData Encoded swap data from OKX API
     * @param srcToken Expected source token address
     * @param dstToken Expected destination token address
     * @param amountIn Expected input amount
     * @param self Address of this contract (for receiver validation)
     * @return minReturnAmount Minimum return amount from baseRequest
     * @dev Validates receiver, amounts, paths, and token addresses for DAG swaps
     */
    function _decodeAndValidateDagSwap(
        bytes4 selector,
        bytes calldata swapData,
        address srcToken,
        address dstToken,
        uint256 amountIn,
        address self
    ) internal pure returns (uint256 minReturnAmount) {
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
            receiver = self;
        }

        require(receiver == self, ICA.InvalidReceiver());
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

        return baseRequest.minReturnAmount;
    }

    /**
     * @notice Decodes and validates Smart swap parameters
     * @param selector Function selector (SMART_SWAP_TO_SELECTOR or SMART_SWAP_BY_ORDER_ID_SELECTOR)
     * @param swapData Encoded swap data from OKX API
     * @param amountIn Expected input amount
     * @param self Address of this contract (for receiver validation)
     * @return minReturnAmount Minimum return amount from baseRequest
     * @dev Validates receiver, amounts for Smart swaps
     */
    function _decodeAndValidateSmartSwap(
        bytes4 selector,
        bytes calldata swapData,
        uint256 amountIn,
        address self
    ) internal pure returns (uint256 minReturnAmount) {
        IOKX.BaseRequest memory baseRequest;
        address receiver;

        if (selector == SMART_SWAP_TO_SELECTOR) {
            (, receiver, baseRequest, , ) = abi.decode(
                swapData[4:],
                (uint256, address, IOKX.BaseRequest, uint256[], IOKX.RouterPath[][])
            );
        } else {
            (, baseRequest, , ) = abi.decode(swapData[4:], (uint256, IOKX.BaseRequest, uint256[], IOKX.RouterPath[][]));
            receiver = self;
        }

        require(receiver == self, ICA.InvalidReceiver());
        require(baseRequest.minReturnAmount != 0, ICA.InvalidSwapParameters());
        require(baseRequest.fromTokenAmount == amountIn, ICA.InvalidSwapParameters());

        return baseRequest.minReturnAmount;
    }

    /**
     * @notice Decodes and validates Uniswap V3 swap parameters
     * @param selector Function selector (UNIV3_SWAP_SELECTOR or UNIV3_SWAP_TO_WITH_BASE_REQUEST_SELECTOR)
     * @param swapData Encoded swap data from OKX API
     * @param amountIn Expected input amount
     * @param self Address of this contract (for receiver validation)
     * @return minReturnAmount Minimum return amount from swap parameters
     * @dev Validates receiver, amounts for Uniswap V3 swaps. For UNIV3_SWAP_SELECTOR,
     *      receiver is encoded as uint256 and must be converted to address.
     */
    function _decodeAndValidateUniV3Swap(
        bytes4 selector,
        bytes calldata swapData,
        uint256 amountIn,
        address self
    ) internal pure returns (uint256 minReturnAmount) {
        address receiver;
        uint256 amount;
        uint256 minReturn;

        if (selector == UNIV3_SWAP_SELECTOR) {
            uint256 _receiver;
            (_receiver, amount, minReturn, ) = abi.decode(swapData[4:], (uint256, uint256, uint256, uint256[]));
            receiver = address(uint160(_receiver));
        } else {
            IOKX.BaseRequest memory baseRequest;
            (, receiver, baseRequest, ) = abi.decode(swapData[4:], (uint256, address, IOKX.BaseRequest, uint256[]));
            amount = baseRequest.fromTokenAmount;
            minReturn = baseRequest.minReturnAmount;
        }

        require(receiver == self, ICA.InvalidReceiver());
        require(minReturn != 0, ICA.InvalidSwapParameters());
        require(amount == amountIn, ICA.InvalidSwapParameters());

        return minReturn;
    }

    /**
     * @notice Decodes and validates Unxswap parameters
     * @param selector Function selector (UNXSWAP_TO_SELECTOR, UNXSWAP_BY_ORDER_ID_SELECTOR, or UNXSWAP_TO_WITH_BASE_REQUEST_SELECTOR)
     * @param swapData Encoded swap data from OKX API
     * @param amountIn Expected input amount
     * @param self Address of this contract (for receiver validation)
     * @return minReturnAmount Minimum return amount from swap parameters
     * @dev Validates receiver, amounts for Unxswap operations
     */
    function _decodeAndValidateUnxSwap(
        bytes4 selector,
        bytes calldata swapData,
        uint256 amountIn,
        address self
    ) internal pure returns (uint256 minReturnAmount) {
        address receiver;
        uint256 amount;
        uint256 minReturn;

        if (selector == UNXSWAP_TO_SELECTOR) {
            (, amount, minReturn, receiver, ) = abi.decode(
                swapData[4:],
                (uint256, uint256, uint256, address, bytes32[])
            );
        } else if (selector == UNXSWAP_BY_ORDER_ID_SELECTOR) {
            (, amount, minReturn, ) = abi.decode(swapData[4:], (uint256, uint256, uint256, bytes32[]));
            receiver = self;
        } else {
            IOKX.BaseRequest memory baseRequest;
            (, receiver, baseRequest, ) = abi.decode(swapData[4:], (uint256, address, IOKX.BaseRequest, bytes32[]));
            amount = baseRequest.fromTokenAmount;
            minReturn = baseRequest.minReturnAmount;
        }

        require(receiver == self, ICA.InvalidReceiver());
        require(minReturn != 0, ICA.InvalidSwapParameters());
        require(amount == amountIn, ICA.InvalidSwapParameters());

        return minReturn;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometSwapPlugin).interfaceId;
    }
}
