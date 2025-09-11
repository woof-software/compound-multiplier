// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { IBalancerVault, IERC20, IFlashLoanRecipient } from "../interfaces/IBalancerVault.sol";
import { ICometFlashLoanPlugin } from "../interfaces/ICometFlashLoanPlugin.sol";

/**
 * @title Balancer Flash Loan Plugin
 * @author Woof Software
 * @notice This contract implements a plugin for interacting with the Balancer protocol's flash loan feature. It allows a caller to request
 * a flash loan, handles the callback from Balancer when the loan is issued, and provides a method to transfer of the borrowed funds.
 * The contract uses a unique identifier to securely track each flash loan operation and ensures that only authorized callbacks are
 * processed. It is designed to be used as part of a larger system that supports composable flash loan plugins.
 */
contract BalancerPlugin is IFlashLoanRecipient, ICometFlashLoanPlugin {
    /// @inheritdoc ICometFlashLoanPlugin
    bytes4 public constant CALLBACK_SELECTOR = BalancerPlugin.receiveFlashLoan.selector;
    /// @inheritdoc ICometFlashLoanPlugin
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("BalancerPlugin.plugin")) - 1);

    /// @inheritdoc ICometFlashLoanPlugin
    function takeFlashLoan(CallbackData memory data, bytes memory) external {
        bytes memory _data = abi.encode(data);
        bytes32 flid = keccak256(_data);
        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flid)
        }

        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(data.asset);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = data.debt;

        IBalancerVault(data.flp).flashLoan(this, tokens, amounts, _data);
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
    ) external returns (CallbackData memory _data) {
        bytes32 flidExpected;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flidExpected := tload(slot)
            tstore(slot, 0)
        }

        require(keccak256(userData) == flidExpected, InvalidFlashLoanId());

        _data = abi.decode(userData, (CallbackData));

        require(_data.flp == msg.sender, UnauthorizedCallback());
        require(_data.asset == address(tokens[0]) && _data.debt == amounts[0], InvalidFlashLoanData());

        _data.fee = feeAmounts[0];
    }

    /// @inheritdoc ICometFlashLoanPlugin
    function repayFlashLoan(address flp, address asset, uint256 amount) external {
        IERC20(asset).transfer(flp, amount);
    }
}
