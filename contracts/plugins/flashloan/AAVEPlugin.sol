// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IPool } from "contracts/external/aave/IPool.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ICometFlashLoanPlugin } from "contracts/interfaces/ICometFlashLoanPlugin.sol";
import { ICometFoundation as ICF } from "contracts/interfaces/ICometFoundation.sol";
import { ICometAlerts as ICA } from "contracts/interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "contracts/interfaces/ICometEvents.sol";

/**
 * @title AAVE Flash Loan Plugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice This contract implements a plugin for interacting with the AAVE protocol's flash loan feature. It allows a caller to request
 * a flash loan, handles the callback from AAVE when the loan is issued, and provides a method to approve repayment of the borrowed funds.
 * The contract uses a unique identifier to securely track each flash loan operation and ensures that only authorized callbacks are
 * processed. It is designed to be used as part of a larger system that supports composable flash loan plugins.
 */
contract AAVEPlugin is ICometFlashLoanPlugin {
    using SafeERC20 for IERC20;

    /// @inheritdoc ICometFlashLoanPlugin
    bytes4 public constant CALLBACK_SELECTOR = AAVEPlugin.executeOperation.selector;
    /// @inheritdoc ICometFlashLoanPlugin
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("AAVEPlugin.plugin")) - 1);
    /// @notice Referral code for AAVE flash loans, unused and set to 0
    uint16 private constant REFERAL_CODE = 0;

    /// @inheritdoc ICometFlashLoanPlugin
    function takeFlashLoan(ICF.CallbackData memory data, bytes memory config) external payable {
        bytes memory _data = abi.encode(data);
        bytes32 slot = SLOT_PLUGIN;
        address flp = abi.decode(config, (address));

        assembly {
            tstore(slot, flp)
        }

        IPool(flp).flashLoanSimple(address(this), data.asset, data.debt, _data, REFERAL_CODE);
    }

    /**
     * @notice Executes a flash loan operation
     * @param asset The address of the asset being borrowed
     * @param amount The amount of the asset being borrowed
     * @param premium The premium to be paid for the flash loan (fee)
     * @param initiator The address initiating the flash loan
     * @param params Additional parameters for the flash loan
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (ICF.CallbackData memory _data) {
        address flp;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flp := tload(slot)
            tstore(slot, 0)
        }

        _data = abi.decode(params, (ICF.CallbackData));

        require(flp == msg.sender, ICA.UnauthorizedCallback());

        require(
            _data.debt == amount && address(_data.asset) == asset && initiator == address(this),
            ICA.InvalidFlashLoanData()
        );

        _data.fee = premium;
        _data.flp = flp;

        emit ICE.FlashLoan(flp, asset, amount, premium);
    }

    /// @inheritdoc ICometFlashLoanPlugin
    function repayFlashLoan(address flp, address asset, uint256 amount) external {
        IERC20(asset).safeIncreaseAllowance(flp, amount);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometFlashLoanPlugin).interfaceId;
    }
}
