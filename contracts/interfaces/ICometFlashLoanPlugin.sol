// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface ICometFlashLoanPlugin {
    error UnauthorizedCallback();
    error InvalidFlashLoanId();
    error InvalidFlashLoanData();

    struct CallbackData {
        uint256 debt;
        uint256 fee;
        uint256 snapshot;
        address user;
        address flp;
        address asset;
        bytes swapData;
    }

    /// @notice The selector of the callback function
    function CALLBACK_SELECTOR() external view returns (bytes4);

    /// @notice Storage slot to store the flash loan ID
    function SLOT_PLUGIN() external view returns (bytes32);

    function takeFlashLoan(CallbackData memory data, bytes memory config) external;

    function repayFlashLoan(address flp, address asset, uint256 amount) external;
}
