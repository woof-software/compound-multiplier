// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IMorphoBase } from "../interfaces/IMorpho.sol";
import { IMorphoFlashLoanCallback } from "../interfaces/IMorpho.sol";
import { ICometMultiplierPlugin } from "../interfaces/ICometMultiplierPlugin.sol";
import "hardhat/console.sol";

contract MorphoPlugin is ICometMultiplierPlugin {
    /// @notice Callback selector: keccak256("onMorphoFlashLoan(uint256 assets, bytes calldata data)") = 0x31f57072
    bytes4 public constant CALLBACK_SELECTOR = 0x31f57072;

    // bytes32(uint256(keccak256("MorphoPlugin.plugin")) - 1);
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("MorphoPlugin.plugin")) - 1);

    function takeFlashLoan(
        address user,
        address baseAsset,
        address flp,
        uint256 amount,
        bytes memory,
        bytes memory swapData
    ) public {
        uint256 snapshot = IERC20(baseAsset).balanceOf(address(this));
        bytes memory data = abi.encode(user, baseAsset, flp, snapshot, swapData);
        bytes32 flid = keccak256(abi.encode(data, block.timestamp));
        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flid)
        }
        IMorphoBase(flp).flashLoan(baseAsset, amount, data);
    }

    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).approve(flp, amount);
    }

    function onMorphoFlashLoan(
        uint256 debt,
        bytes calldata data
    ) external returns (address, address, uint256, bytes memory) {
        bytes32 flid = keccak256(abi.encode(data, block.timestamp));
        bytes32 flidExpected;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flidExpected := tload(slot)
            tstore(slot, 0)
        }

        require(flid == flidExpected, InvalidFlashLoanId());

        (address user, address baseAsset, address flp, uint256 snapshot, bytes memory swapData) = abi.decode(
            data,
            (address, address, address, uint256, bytes)
        );

        require(flp == msg.sender, UnauthorizedCallback());
        require(IERC20(baseAsset).balanceOf(address(this)) == snapshot + debt, InvalidAmountOut());
        return (user, flp, debt, swapData);
    }
}
