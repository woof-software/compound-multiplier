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
}
