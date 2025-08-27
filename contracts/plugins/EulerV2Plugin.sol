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
        address baseAsset,
        address flp,
        uint256 amount,
        bytes memory config,
        bytes memory swapData
    ) public {
        console.log("Taking flash loan of %s from Euler", amount);
        (address euler, address markets) = abi.decode(config, (address, address));

        console.log("euler: %s", euler);
        console.log("markets: %s", markets);
        uint256 snapshot = IERC20(baseAsset).balanceOf(address(this));
        console.log("snapshot: %s", snapshot);
        bytes memory data = abi.encode(flp, baseAsset, amount, snapshot, swapData);
        console.logBytes(data);

        bytes32 flid = keccak256(abi.encode(data, block.timestamp));
        console.logBytes32(flid);
        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flid)
        }

        console.log("flashloan id stored");
        console.log("flp: %s", flp);
        IEVault(flp).flashLoan(amount, data);
        console.log("flashloan taken");
    }

    function onFlashLoan(bytes calldata data) external returns (address, uint256, bytes memory) {
        console.log("onFlashLoan called");
        bytes32 flid = keccak256(abi.encode(data, block.timestamp));
        bytes32 flidExpected;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flidExpected := tload(slot)
            tstore(slot, 0)
        }

        console.logBytes32(flid);
        console.logBytes32(flidExpected);

        require(flid == flidExpected, InvalidFlashLoanId());

        (address flp, address baseAseet, uint256 debt, uint256 snapshot, bytes memory swapData) = abi.decode(
            data,
            (address, address, uint256, uint256, bytes)
        );

        require(flp == msg.sender, UnauthorizedCallback());
        require(IERC20(baseAseet).balanceOf(address(this)) == snapshot + debt, InvalidAmountOut());
        return (flp, debt, swapData);
    }
}
