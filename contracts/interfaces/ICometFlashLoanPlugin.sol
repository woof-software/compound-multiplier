pragma solidity ^0.8.30;

interface ICometFlashLoanPlugin {
    error UnauthorizedCallback();

    error InvalidFlashLoanId();

    struct CallbackData {
        uint256 debt;
        uint256 fee;
        uint256 snapshot;
        address user;
        address flp;
        address asset;
        bytes swapData;
    }

    function CALLBACK_SELECTOR() external view returns (bytes4);

    function SLOT_PLUGIN() external view returns (bytes32);

    /**
     * @notice Initiates a flash loan
     * @param data Flash loan parameters including debt amount, asset, and user information
     * @dev Stores flash loan ID in transient storage for callback validation
     */
    function takeFlashLoan(CallbackData memory data, bytes memory) external payable;

    /**
     * @notice Repays the flash loan
     * @param flp Address of the flash loan provider
     * @param baseAsset Address of the borrowed asset
     * @param amount Total repayment amount (principal + fee)
     */
    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external;
}
