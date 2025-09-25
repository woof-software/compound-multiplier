// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IEVault } from "../../external/IEVault.sol";
import { ICometFlashLoanPlugin } from "../../interfaces/ICometFlashLoanPlugin.sol";

/**
 * @title EulerV2Plugin
 * @author WOOF!
 * @notice Flash loan plugin for integrating Euler V2 vaults with CometMultiplierAdapter
 * @dev Implements ICometFlashLoanPlugin interface to provide standardized flash loan functionality
 */
contract EulerV2Plugin is ICometFlashLoanPlugin {
    /// @notice Callback function selector for Euler V2 flash loans
    bytes4 public constant CALLBACK_SELECTOR = 0xc4850ea8;

    /// @notice Storage slot for transient flash loan ID validation
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("EulerV2Plugin.plugin")) - 1);

    /**
     * @notice Initiates a flash loan from an Euler V2 vault
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
        IEVault(data.flp).flashLoan(data.debt, _data);
    }

    /**
     * @notice Repays the flash loan to the Euler V2 vault
     * @param flp Address of the flash loan provider (vault)
     * @param baseAsset Address of the borrowed asset
     * @param amount Total repayment amount (principal + fee)
     */
    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).transfer(flp, amount);
    }

    /**
     * @notice Handles flash loan callback from Euler V2 vault
     * @param data Encoded callback data from flash loan initiation
     * @return _data Decoded callback data for adapter processing
     * @dev Validates flash loan ID and sender authorization before processing
     */
    function onFlashLoan(bytes calldata data) external returns (CallbackData memory _data) {
        bytes32 flidExpected;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flidExpected := tload(slot)
            tstore(slot, 0)
        }
        require(keccak256(data) == flidExpected, InvalidFlashLoanId());
        _data = abi.decode(data, (CallbackData));
        require(_data.flp == msg.sender, UnauthorizedCallback());
    }
}
