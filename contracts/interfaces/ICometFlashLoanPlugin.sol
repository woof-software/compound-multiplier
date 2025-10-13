// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICometFlashLoanPlugin is IERC165 {
    error UnauthorizedCallback();
    error InvalidFlashLoanId();
    error InvalidFlashLoanData();
    error InvalidAmountOut();

    /**
     * @notice Data structure for flash loan callback parameters
     * @param debt The amount of debt to be repaid
     * @param fee The fee associated with the flash loan
     * @param snapshot A unique identifier for the flash loan operation
     * @param user The address of the user initiating the flash loan
     * @param flp The address of the flash loan provider
     * @param asset The address of the asset being borrowed
     * @param swapData Encoded data for executing a swap if needed
     * @dev This struct is used to pass necessary information during the flash loan callback
     *      and must be encoded/decoded appropriately.
     */
    struct CallbackData {
        uint256 debt;
        uint256 fee;
        uint256 snapshot;
        address user;
        address flp;
        IERC20 asset;
        bytes swapData;
    }

    /// @notice The selector of the callback function
    function CALLBACK_SELECTOR() external view returns (bytes4);

    /// @notice Storage slot to store the flash loan ID
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

    /**
     * @notice Checks if the contract implements a specific interface
     * @param interfaceId The interface identifier, as specified in ERC-165
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
