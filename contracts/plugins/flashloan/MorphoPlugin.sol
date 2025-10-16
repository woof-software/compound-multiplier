// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IMorpho } from "../../external/morpho/IMorpho.sol";
import { ICometFlashLoanPlugin } from "../../interfaces/ICometFlashLoanPlugin.sol";
import { ICometFoundation as ICF } from "../../interfaces/ICometFoundation.sol";
import { ICometAlerts as ICA } from "../../interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "../../interfaces/ICometEvents.sol";

/**
 * @title MorphoPlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Flash loan plugin for integrating Morpho protocol with CometMultiplier
 * @dev Implements ICometFlashLoanPlugin interface to provide standardized flash loan functionality
 */
contract MorphoPlugin is ICometFlashLoanPlugin {
    using SafeERC20 for IERC20;
    /// @notice Callback function selector for Morpho flash loans
    bytes4 public constant CALLBACK_SELECTOR = MorphoPlugin.onMorphoFlashLoan.selector;

    /// @notice Storage slot for transient flash loan ID validation
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("MorphoPlugin.plugin")) - 1);

    /**
     * @inheritdoc ICometFlashLoanPlugin
     */
    function takeFlashLoan(ICF.CallbackData memory data, bytes memory config) external payable {
        address flp = abi.decode(config, (address));
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            tstore(slot, flp)
        }
        IMorpho(flp).flashLoan(data.asset, data.debt, abi.encode(data));
    }

    /**
     * @inheritdoc ICometFlashLoanPlugin
     */
    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).safeIncreaseAllowance(flp, amount);
    }

    /**
     * @notice Handles flash loan callback from Morpho protocol
     * @param data Encoded callback data from flash loan initiation
     * @return _data Decoded callback data for adapter processing
     * @dev Validates flash loan ID and sender authorization before processing
     */
    function onMorphoFlashLoan(uint256, bytes calldata data) external returns (ICF.CallbackData memory _data) {
        address flp;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flp := tload(slot)
            tstore(slot, 0)
        }
        require(flp == msg.sender, ICA.UnauthorizedCallback());
        _data = abi.decode(data, (ICF.CallbackData));
        _data.flp = flp;
        emit ICE.FlashLoan(flp, address(_data.asset), _data.debt, 0);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometFlashLoanPlugin).interfaceId;
    }
}
