pragma solidity ^0.8.30;

interface ICometMultiplierPlugin {
    error UnauthorizedCallback();

    error InvalidFlashLoanId();

    error InvalidAmountOut();

    function CALLBACK_SELECTOR() external view returns (bytes4);

    function SLOT_PLUGIN() external view returns (bytes32);

    function takeFlashLoan(address market, uint256 amount, bytes memory config) external;

    function onFlashLoan(bytes calldata data) external returns (address endpoint, uint256 debt);
}
