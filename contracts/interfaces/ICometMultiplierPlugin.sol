pragma solidity ^0.8.30;

interface ICometMultiplierPlugin {
    error UnauthorizedCallback();

    error InvalidFlashLoanId();

    error InvalidAmountOut();

    function CALLBACK_SELECTOR() external view returns (bytes4);

    function SLOT_PLUGIN() external view returns (bytes32);

    function takeFlashLoan(
        address user,
        address market,
        address flp,
        uint256 amount,
        bytes memory config,
        bytes memory swapData
    ) external;

    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external;
}
