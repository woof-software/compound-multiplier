// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IMorphoBase } from "../interfaces/IMorpho.sol";
import { IMorphoFlashLoanCallback } from "../interfaces/IMorpho.sol";
import { ICometFlashLoanPlugin } from "../interfaces/ICometFlashLoanPlugin.sol";
import "hardhat/console.sol";

contract MorphoPlugin is ICometFlashLoanPlugin {
    /// @notice Callback selector: keccak256("onMorphoFlashLoan(uint256 assets, bytes calldata data)") = 0x31f57072
    bytes4 public constant CALLBACK_SELECTOR = 0x31f57072;

    // bytes32(uint256(keccak256("MorphoPlugin.plugin")) - 1);
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("MorphoPlugin.plugin")) - 1);

    function takeFlashLoan(CallbackData memory data, bytes memory) public {
        bytes memory _data = abi.encode(data);
        bytes32 flid = keccak256(_data);
        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flid)
        }
        IMorphoBase(data.flp).flashLoan(data.base, data.debt, _data);
    }

    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).approve(flp, amount);
    }

    function onMorphoFlashLoan(uint256, bytes calldata data) external returns (CallbackData memory _data) {
        bytes32 flid = keccak256(abi.encode(data, block.timestamp));
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
