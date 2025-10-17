// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IEVault } from "../../external/euler/IEVault.sol";
import { ICometFlashLoanPlugin } from "../../interfaces/ICometFlashLoanPlugin.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { ICometStructs as ICS } from "../../interfaces/ICometStructs.sol";
import { ICometAlerts as ICA } from "../../interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "../../interfaces/ICometEvents.sol";

/**
 * @title EulerV2Plugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Flash loan plugin for integrating Euler V2 vaults with CometMultiplier
 * @dev Implements ICometFlashLoanPlugin interface to provide standardized flash loan functionality
 */
// aderyn-fp-next-line(locked-ether)
contract EulerV2Plugin is ICometFlashLoanPlugin {
    using SafeERC20 for IERC20;
    /// @notice Callback function selector for Euler V2 flash loans
    bytes4 public constant CALLBACK_SELECTOR = EulerV2Plugin.onFlashLoan.selector;

    /// @notice Storage slot for transient flash loan ID validation
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("EulerV2Plugin.plugin")) - 1);

    /**
     * @inheritdoc ICometFlashLoanPlugin
     */
    function takeFlashLoan(ICS.CallbackData memory data, bytes memory config) external payable {
        bytes memory _data = abi.encode(data);
        address flp = abi.decode(config, (address));
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            tstore(slot, flp)
        }
        IEVault(flp).flashLoan(data.debt, _data);
    }

    /**
     * @inheritdoc ICometFlashLoanPlugin
     */
    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).safeTransfer(flp, amount);
    }

    /**
     * @notice Handles flash loan callback from Euler V2 vault
     * @param data Encoded callback data from flash loan initiation
     * @return _data Decoded callback data for adapter processing
     * @dev Validates flash loan ID and sender authorization before processing
     */
    function onFlashLoan(bytes calldata data) external returns (ICS.CallbackData memory _data) {
        address flp;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flp := tload(slot)
            tstore(slot, 0)
        }

        require(flp == msg.sender, ICA.UnauthorizedCallback());

        _data = abi.decode(data, (ICS.CallbackData));
        _data.flp = flp;
        emit ICE.FlashLoan(flp, address(_data.asset), _data.debt, 0);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometFlashLoanPlugin).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
