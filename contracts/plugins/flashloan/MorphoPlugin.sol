// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IMorpho } from "../../external/morpho/IMorpho.sol";
import { ICometFlashLoanPlugin } from "../../interfaces/ICometFlashLoanPlugin.sol";

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
    function takeFlashLoan(CallbackData memory data, bytes memory) external payable {
        bytes memory _data = abi.encode(data);
        bytes32 flid = keccak256(_data);
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            tstore(slot, flid)
        }
        IMorpho(data.flp).flashLoan(data.asset, data.debt, _data);
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
    function onMorphoFlashLoan(uint256, bytes calldata data) external returns (CallbackData memory _data) {
        bytes32 flid = keccak256(data);
        bytes32 flidExpected;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flidExpected := tload(slot)
            tstore(slot, 0)
        }
        require(flid == flidExpected, InvalidFlashLoanId());
        _data = abi.decode(data, (CallbackData));
        require(_data.flp == msg.sender, UnauthorizedCallback());
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometFlashLoanPlugin).interfaceId;
    }
}
