// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IEulerDToken } from "../interfaces/IEulerDToken.sol";
import { IEulerMarkets } from "../interfaces/IEulerMarkets.sol";
import { ICometMultiplierPlugin } from "../interfaces/ICometMultiplierPlugin.sol";
import { IComet } from "../interfaces/IComet.sol";

contract EulerV2Plugin is ICometMultiplierPlugin {
    // keccak256("onEulerFlashLoan(bytes)") = 0xc4850ea8
    bytes4 public constant CALLBACK_SELECTOR = 0xc4850ea8;

    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("EulerV2Plugin.plugin")) - 1);

    /**
     * @dev Allows a user to take a flash loan from Euler for a given token and amount
     * @param baseAsset The address of the token to borrow
     * @param amount The amount of the token to borrow
     */
    function takeFlashLoan(address baseAsset, uint256 amount, bytes memory config) public {
        address euler;
        address markets;

        assembly {
            euler := mload(add(config, 20))
            markets := mload(add(config, 40))
        }

        uint256 snapshot = IERC20(baseAsset).balanceOf(address(this));
        bytes memory data = abi.encode(euler, baseAsset, amount, snapshot);

        bytes32 flid = keccak256(data);
        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flid)
        }

        IEulerDToken _dToken = dToken(baseAsset, markets);
        _dToken.flashLoan(amount, data);
    }

    /**
     * @dev Helper function that returns the context of the flash loan for a given token
     * @param token The address of the token of the flash loan
     * @param markets The address of the Euler Markets contract
     * @return _dToken The dToken contract for the given token
     */
    function dToken(address token, address markets) internal view returns (IEulerDToken _dToken) {
        _dToken = IEulerDToken(IEulerMarkets(markets).underlyingToDToken(token));
    }

    function onFlashLoan(bytes calldata data) external returns (address, uint256) {
        bytes32 flid = keccak256(abi.encodePacked(data, block.timestamp));
        bytes32 flidExpected;
        bytes32 slot;
        assembly {
            flidExpected := tload(slot)
            tstore(slot, 0)
        }

        require(flid == flidExpected, InvalidFlashLoanId());

        (address euler, address baseAseet, uint256 debt, uint256 snapshot) = abi.decode(
            data,
            (address, address, uint256, uint256)
        );

        require(euler == msg.sender, UnauthorizedCallback());
        require(IERC20(baseAseet).balanceOf(address(this)) == snapshot + debt, InvalidAmountOut());
        return (euler, debt);
    }
}
