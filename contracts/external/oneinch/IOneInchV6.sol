pragma solidity =0.8.30;

interface IOneInchV6 {
    struct SwapDescription {
        address srcToken;
        address dstToken;
        address srcReceiver;
        address dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
    }

    /// @notice Performs a swap
    /// @param executor Aggregation executor that executes calls described in data
    /// @param desc Swap description containing all swap parameters
    /// @param data Encoded calls that executor should execute in between of swaps
    /// @return returnAmount Resulting token amount received
    /// @return spentAmount Source token amount spent
    function swap(
        address executor,
        SwapDescription calldata desc,
        bytes calldata data
    ) external payable returns (uint256 returnAmount, uint256 spentAmount);
}
