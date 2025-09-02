// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IEulerDToken } from "../interfaces/IEulerDToken.sol";
import { IEulerMarkets } from "../interfaces/IEulerMarkets.sol";
import { ICometFlashLoanPlugin } from "../interfaces/ICometFlashLoanPlugin.sol";
import { IComet } from "../interfaces/IComet.sol";
import { IEVault } from "../interfaces/IEVault.sol";
import "hardhat/console.sol";

contract EulerV2Plugin is ICometFlashLoanPlugin {
    // keccak256("onEulerFlashLoan(bytes)") = 0xc4850ea8
    bytes4 public constant CALLBACK_SELECTOR = 0xc4850ea8;

    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("EulerV2Plugin.plugin")) - 1);

    function takeFlashLoan(CallbackData memory data, bytes memory) public {
        bytes memory _data = abi.encode(data);
        bytes32 flid = keccak256(_data);
        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flid)
        }

        IEVault(data.flp).flashLoan(data.debt, _data);
    }

    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).transfer(flp, amount);
    }

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
