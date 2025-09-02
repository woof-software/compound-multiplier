// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IBalancerVault, IERC20, IFlashLoanRecipient } from "../interfaces/IBalancerVault.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BalancerPlugin is IFlashLoanRecipient {
    using SafeERC20 for IERC20;

    bytes4 public constant CALLBACK_SELECTOR = BalancerPlugin.receiveFlashLoan.selector;

    function takeFlashLoan(
        address user,
        address baseAsset,
        address flp,
        uint256 amount,
        bytes memory,
        bytes memory swapData
    ) public {
        // Snapshot balance to validate receipt in callback if desired
        uint256 snapshot = IERC20(baseAsset).balanceOf(address(this));
        // Encode consistent payload: (user, baseAsset, flp, snapshot, swapData)
        bytes memory data = abi.encode(user, baseAsset, flp, snapshot, swapData);

        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(baseAsset);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        IBalancerVault(flp).flashLoan(this, tokens, amounts, data);
    }

    /**
     * @dev This function is called by the Vault when a flash loan is received.
     * @param tokens The tokens being loaned.
     * @param amounts The amounts of each token being loaned.
     * @param feeAmounts The fees for each token being loaned.
     * @param userData Arbitrary user data passed from the Vault.
     */
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        // Decode exactly the shape encoded in takeFlashLoan
        (, address baseAsset, address flp, , ) = abi.decode(userData, (address, address, address, uint256, bytes));

        // Basic safety checks
        require(msg.sender == flp, "WrongVault");
        require(tokens.length == 1 && amounts.length == 1 && feeAmounts.length == 1, "BadArrayLengths");
        require(address(tokens[0]) == baseAsset, "UnexpectedToken");

        // Optional invariant: received amount equals snapshot delta
        // Not strictly necessary for Balancer but mirrors other plugins' style
        // require(IERC20(baseAsset).balanceOf(address(this)) == snapshot + amounts[0], "InvalidAmountOut");

        // Repay by transferring back to the Vault (not approve)
        tokens[0].safeTransfer(flp, amounts[0] + feeAmounts[0]);
    }

    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).safeTransfer(flp, amount);
    }
}
