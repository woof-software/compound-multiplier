// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IMorphoBase } from "../../external/IMorpho.sol";
import { ICometFlashLoanPlugin } from "../../interfaces/ICometFlashLoanPlugin.sol";

/**
 * @title MorphoPlugin
 * @notice Flash loan plugin for integrating Morpho protocol with CometMultiplierAdapter
 * @dev Implements ICometFlashLoanPlugin interface to provide standardized flash loan functionality
 */
contract MorphoPlugin is ICometFlashLoanPlugin {
    /// @notice Callback function selector for Morpho flash loans
    bytes4 public constant CALLBACK_SELECTOR = 0x31f57072;

    /// @notice Storage slot for transient flash loan ID validation
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("MorphoPlugin.plugin")) - 1);

    /**
     * @notice Initiates a flash loan from Morpho protocol
     * @param data Flash loan parameters including debt amount, asset, and user information
     * @dev Stores flash loan ID in transient storage for callback validation
     */
    function takeFlashLoan(CallbackData memory data, bytes memory) public {
        bytes memory _data = abi.encode(data);
        bytes32 flid = keccak256(_data);
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            tstore(slot, flid)
        }
        IMorphoBase(data.flp).flashLoan(data.asset, data.debt, _data);
    }

    /**
     * @notice Repays the flash loan to Morpho protocol
     * @param flp Address of the flash loan provider (Morpho contract)
     * @param baseAsset Address of the borrowed asset
     * @param amount Total repayment amount (principal + fee)
     * @dev Uses approve instead of transfer as Morpho pulls repayment
     */
    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).approve(flp, amount);
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
}
