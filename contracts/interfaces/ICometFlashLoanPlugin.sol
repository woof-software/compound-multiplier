// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { ICometFoundation as ICF } from "./ICometFoundation.sol";

interface ICometFlashLoanPlugin is IERC165 {
    /// @notice The selector of the callback function
    function CALLBACK_SELECTOR() external view returns (bytes4);

    /// @notice Storage slot to store the flash loan ID
    function SLOT_PLUGIN() external view returns (bytes32);

    /**
     * @notice Initiates a flash loan
     * @param data Flash loan parameters including debt amount, asset, and user information
     * @dev Stores flash loan ID in transient storage for callback validation
     */
    function takeFlashLoan(ICF.CallbackData memory data, bytes memory) external payable;

    /**
     * @notice Repays the flash loan
     * @param flp Address of the flash loan provider
     * @param baseAsset Address of the borrowed asset
     * @param amount Total repayment amount (principal + fee)
     */
    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external;
}
