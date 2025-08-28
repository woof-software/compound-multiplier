// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IEulerDToken } from "../interfaces/IEulerDToken.sol";
import { IEulerMarkets } from "../interfaces/IEulerMarkets.sol";
import { ICometMultiplierPlugin } from "../interfaces/ICometMultiplierPlugin.sol";
import { IComet } from "../interfaces/IComet.sol";
import { IEVault } from "../interfaces/IEVault.sol";
import "hardhat/console.sol";

contract EulerV2Plugin is ICometMultiplierPlugin {
    // keccak256("onEulerFlashLoan(bytes)") = 0xc4850ea8
    bytes4 public constant CALLBACK_SELECTOR = 0xc4850ea8;

    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("EulerV2Plugin.plugin")) - 1);

    /**
     * @dev Allows a user to take a flash loan from Euler for a given token and amount
     * @param baseAsset The address of the token to borrow
     * @param amount The amount of the token to borrow
     */
    function takeFlashLoan(
        address user,
        address baseAsset,
        address flp,
        uint256 amount,
        bytes memory,
        bytes memory swapData
    ) public {
        uint256 snapshot = IERC20(baseAsset).balanceOf(address(this));
        bytes memory data = abi.encode(user, flp, baseAsset, amount, snapshot, swapData);
        bytes32 flid = keccak256(abi.encode(data, block.timestamp));
        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flid)
        }

        IEVault(flp).flashLoan(amount, data);
    }

    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).transfer(flp, amount);
    }

    function onFlashLoan(bytes calldata data) external returns (address, address, uint256, bytes memory) {
        bytes32 flid = keccak256(abi.encode(data, block.timestamp));
        bytes32 flidExpected;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flidExpected := tload(slot)
            tstore(slot, 0)
        }

        require(flid == flidExpected, InvalidFlashLoanId());

        (address user, address flp, address baseAseet, uint256 debt, uint256 snapshot, bytes memory swapData) = abi
            .decode(data, (address, address, address, uint256, uint256, bytes));

        require(flp == msg.sender, UnauthorizedCallback());
        require(IERC20(baseAseet).balanceOf(address(this)) == snapshot + debt, InvalidAmountOut());
        return (user, flp, debt, swapData);
    }
}
