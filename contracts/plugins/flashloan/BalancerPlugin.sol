// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IBalancerVault, IERC20, IFlashLoanRecipient } from "contracts/external/balancer/IBalancerVault.sol";
import { ICometFlashLoanPlugin } from "contracts/interfaces/ICometFlashLoanPlugin.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ICometStructs as ICS } from "contracts/interfaces/ICometStructs.sol";
import { ICometAlerts as ICA } from "contracts/interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "contracts/interfaces/ICometEvents.sol";

/**
 * @title Balancer Flash Loan Plugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice This contract implements a plugin for interacting with the Balancer protocol's flash loan feature. It allows a caller to request
 * a flash loan, handles the callback from Balancer when the loan is issued, and provides a method to transfer of the borrowed funds.
 * The contract uses a unique identifier to securely track each flash loan operation and ensures that only authorized callbacks are
 * processed. It is designed to be used as part of a larger system that supports composable flash loan plugins.
 */
// aderyn-fp-next-line(locked-ether)
contract BalancerPlugin is IFlashLoanRecipient, ICometFlashLoanPlugin {
    using SafeERC20 for IERC20;
    /// @inheritdoc ICometFlashLoanPlugin
    bytes4 public constant CALLBACK_SELECTOR = BalancerPlugin.receiveFlashLoan.selector;
    /// @inheritdoc ICometFlashLoanPlugin
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("BalancerPlugin.plugin")) - 1);

    /// @inheritdoc ICometFlashLoanPlugin
    function takeFlashLoan(ICS.CallbackData memory data, bytes memory config) external payable {
        bytes memory _data = abi.encode(data);
        address flp = abi.decode(config, (address));
        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flp)
        }

        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(data.asset);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = data.debt;

        IBalancerVault(flp).flashLoan(this, tokens, amounts, _data);
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
    ) external returns (ICS.CallbackData memory _data) {
        address flp;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flp := tload(slot)
            tstore(slot, 0)
        }

        _data = abi.decode(userData, (ICS.CallbackData));

        require(flp == msg.sender, ICA.UnauthorizedCallback());

        require(address(_data.asset) == address(tokens[0]) && _data.debt == amounts[0], ICA.InvalidFlashLoanData());

        _data.fee = feeAmounts[0];
        _data.flp = flp;
        emit ICE.FlashLoan(flp, address(tokens[0]), amounts[0], feeAmounts[0]);
    }

    /// @inheritdoc ICometFlashLoanPlugin
    function repayFlashLoan(address flp, address asset, uint256 amount) external {
        IERC20(asset).safeTransfer(flp, amount);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometFlashLoanPlugin).interfaceId;
    }
}
