// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IBalancerFlashLoanRecipient } from "./IBalancerFlashLoanRecipient.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IBalancerVaultV2
 * @notice V2 version of Balancer Vault interface for flash loans
 * @dev Uses V2 IBalancerFlashLoanRecipient which uses V2 IStructs.CallbackData
 */
interface IBalancerVaultV2 {
    /**
     * @dev Performs a 'flash loan', sending tokens to `recipient`, executing the `receiveFlashLoan` hook on it,
     * and then reverting unless the tokens plus a proportional protocol fee have been returned.
     *
     * The `tokens` and `amounts` arrays must have the same length, and each entry in these indicates the loan amount
     * for each token contract. `tokens` must be sorted in ascending order.
     *
     * The 'userData' field is ignored by the Vault, and forwarded as-is to `recipient` as part of the
     * `receiveFlashLoan` call.
     *
     * Emits `FlashLoan` events.
     */
    function flashLoan(
        IBalancerFlashLoanRecipient recipient,
        IERC20[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;
}
