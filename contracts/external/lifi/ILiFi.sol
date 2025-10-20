pragma solidity =0.8.30;

interface ILiFi {
    struct SwapData {
        address callTo;
        address approveTo;
        address sendingAssetId;
        address receivingAssetId;
        uint256 fromAmount;
        bytes callData;
        bool requiresDeposit;
    }

    function swapTokensMultipleV3ERC20ToERC20(
        bytes32 _transactionId,
        string calldata _integrator,
        string calldata _referrer,
        address payable _receiver,
        uint256 _minAmountOut,
        SwapData[] calldata _swapData
    ) external;
}
