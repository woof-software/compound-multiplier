// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IEulerDToken } from "../interfaces/IEulerDToken.sol";
import { IEulerMarkets } from "../interfaces/IEulerMarkets.sol";
import { ICometFlashLoanPlugin } from "../interfaces/ICometFlashLoanPlugin.sol";
import { IComet } from "../interfaces/IComet.sol";
import { IEVault } from "../interfaces/IEVault.sol";

contract FakeFlashLoanPlugin is ICometFlashLoanPlugin {
    // keccak256("onEulerFlashLoan(bytes)") = 0xc4850ea8
    bytes4 public constant CALLBACK_SELECTOR = 0xc4850ea8;

    address constant WHALE = 0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055;

    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("FakeFalshLoanPlugin.plugin")) - 1);

    function takeFlashLoan(CallbackData memory data, bytes memory) public {
        bytes memory _data = abi.encode(data);
        bytes32 flid = keccak256(_data);
        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flid)
        }

        (bool sucess, bytes memory data) = address(this).delegatecall(abi.encodeWithSelector(CALLBACK_SELECTOR, _data));

        if (!sucess) {
            assembly {
                revert(add(data, 32), mload(data))
            }
        }
    }

    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).transfer(flp, amount);
    }

    function onFlashLoan(bytes calldata data) external returns (CallbackData memory _data) {
        _data = abi.decode(data, (CallbackData));
        uint256 allowance = IERC20(_data.asset).allowance(WHALE, address(this));
        if (allowance < _data.debt) {
            IERC20(_data.asset).transferFrom(msg.sender, address(this), _data.debt);
        }
    }
}
