// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

/**
 * @title IOKX
 * @notice Interface for OKX DEX Router
 * @dev Main interface for dagSwap methods used by OKX aggregator
 */
interface IOKX {
    struct BaseRequest {
        uint256 fromToken; // Encoded token address
        address toToken; // Destination token
        uint256 fromTokenAmount; // Amount to swap
        uint256 minReturnAmount; // Minimum output amount
        uint256 deadLine; // Expiration timestamp
    }

    struct RouterPath {
        address[] mixAdapters; // Array of adapter addresses
        address[] assetTo; // Array of intermediate token addresses
        uint256[] rawData; // Encoded pool addresses and weights
        bytes[] extraData; // Extra data for adapters
        uint256 fromToken; // Source token (encoded)
    }

    // PMMSwapRequest structure from PMMLib
    // This matches the structure used in OKX Router contract
    struct PMMSwapRequest {
        uint256 pathIndex;
        address payer;
        address fromToken;
        address toToken;
        uint256 fromTokenAmountMax;
        uint256 toTokenAmountMax;
        uint256 salt;
        uint256 deadLine;
        bool isPushOrder;
        bytes extension;
    }

    /**
     * @notice Executes a DAG swap to a specified receiver
     * @param orderId Unique identifier for the swap order
     * @param receiver Address to receive the swapped tokens
     * @param baseRequest Swap parameters (tokens, amounts, deadline)
     * @param paths Array of RouterPath defining the swap route
     * @return returnAmount Total amount of destination tokens received
     */
    function dagSwapTo(
        uint256 orderId,
        address receiver,
        BaseRequest calldata baseRequest,
        RouterPath[] calldata paths
    ) external payable returns (uint256 returnAmount);

    /**
     * @notice Executes a Uniswap V3 swap to a specified receiver
     * @param receiver Encoded receiver address (uint256, with address in lower 160 bits)
     * @param amount Amount of source token to swap
     * @param minReturn Minimum amount of destination token to receive
     * @param pools Array of encoded pool addresses and swap directions
     * @return returnAmount Total amount of destination tokens received
     */
    function uniswapV3SwapTo(
        uint256 receiver,
        uint256 amount,
        uint256 minReturn,
        uint256[] calldata pools
    ) external payable returns (uint256 returnAmount);

    /**
     * @notice Executes a DAG swap by order ID (receiver is msg.sender)
     * @param orderId Unique identifier for the swap order
     * @param baseRequest Swap parameters (tokens, amounts, deadline)
     * @param paths Array of RouterPath defining the swap route
     * @return returnAmount Total amount of destination tokens received
     */
    function dagSwapByOrderId(
        uint256 orderId,
        BaseRequest calldata baseRequest,
        RouterPath[] calldata paths
    ) external payable returns (uint256 returnAmount);

    /**
     * @notice Executes a smart swap to a specified receiver
     * @param orderId Unique identifier for the swap order
     * @param receiver Address to receive the swapped tokens
     * @param baseRequest Swap parameters (tokens, amounts, deadline)
     * @param batchesAmount Array of amounts for each batch
     * @param batches Array of RouterPath arrays defining the swap route for each batch
     * @param extraData Array of PMM swap request data
     * @return returnAmount Total amount of destination tokens received
     */
    function smartSwapTo(
        uint256 orderId,
        address receiver,
        BaseRequest calldata baseRequest,
        uint256[] calldata batchesAmount,
        RouterPath[][] calldata batches,
        PMMSwapRequest[] calldata extraData
    ) external payable returns (uint256 returnAmount);

    /**
     * @notice Executes a smart swap by order ID (receiver is msg.sender)
     * @param orderId Unique identifier for the swap order
     * @param baseRequest Swap parameters (tokens, amounts, deadline)
     * @param batchesAmount Array of amounts for each batch
     * @param batches Array of RouterPath arrays defining the swap route for each batch
     * @param extraData Array of PMM swap request data
     * @return returnAmount Total amount of destination tokens received
     */
    function smartSwapByOrderId(
        uint256 orderId,
        BaseRequest calldata baseRequest,
        uint256[] calldata batchesAmount,
        RouterPath[][] calldata batches,
        PMMSwapRequest[] calldata extraData
    ) external payable returns (uint256 returnAmount);

    /**
     * @notice Executes a Uniswap V3 swap to a specified receiver with base request
     * @param orderId Unique identifier for the swap order
     * @param receiver Address to receive the swapped tokens
     * @param baseRequest Swap parameters (tokens, amounts, deadline)
     * @param pools Array of encoded pool addresses and swap directions
     * @return returnAmount Total amount of destination tokens received
     */
    function uniswapV3SwapToWithBaseRequest(
        uint256 orderId,
        address receiver,
        BaseRequest calldata baseRequest,
        uint256[] calldata pools
    ) external payable returns (uint256 returnAmount);

    /**
     * @notice Executes an Unxswap to a specified receiver
     * @param srcToken Encoded source token address
     * @param amount Amount of source token to swap
     * @param minReturn Minimum amount of destination token to receive
     * @param receiver Address to receive the swapped tokens
     * @param pools Array of encoded pool addresses
     * @return returnAmount Total amount of destination tokens received
     */
    function unxswapTo(
        uint256 srcToken,
        uint256 amount,
        uint256 minReturn,
        address receiver,
        bytes32[] calldata pools
    ) external payable returns (uint256 returnAmount);

    /**
     * @notice Executes an Unxswap by order ID (receiver is msg.sender)
     * @param srcToken Encoded source token address
     * @param amount Amount of source token to swap
     * @param minReturn Minimum amount of destination token to receive
     * @param pools Array of encoded pool addresses
     * @return returnAmount Total amount of destination tokens received
     */
    function unxswapByOrderId(
        uint256 srcToken,
        uint256 amount,
        uint256 minReturn,
        bytes32[] calldata pools
    ) external payable returns (uint256 returnAmount);

    /**
     * @notice Executes an Unxswap to a specified receiver with base request
     * @param orderId Unique identifier for the swap order
     * @param receiver Address to receive the swapped tokens
     * @param baseRequest Swap parameters (tokens, amounts, deadline)
     * @param pools Array of encoded pool addresses
     * @return returnAmount Total amount of destination tokens received
     */
    function unxswapToWithBaseRequest(
        uint256 orderId,
        address receiver,
        BaseRequest calldata baseRequest,
        bytes32[] calldata pools
    ) external payable returns (uint256 returnAmount);
}
