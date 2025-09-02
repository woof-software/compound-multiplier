// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IFlashLoanSimpleReceiver } from "../interfaces/IFlashLoanSimpleReceiver.sol";
import { IPool } from "../interfaces/IPool.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "hardhat/console.sol";

contract AAVEPlugin is IFlashLoanSimpleReceiver {
    using SafeERC20 for IERC20;

    bytes4 public constant CALLBACK_SELECTOR = AAVEPlugin.executeOperation.selector;

    error WrongInitiator();
    error WrongPool();

    function takeFlashLoan(
        address user,
        address market,
        address flp,
        uint256 amount,
        bytes memory,
        bytes memory swapData
    ) public {
        bytes memory data = abi.encode(user, market, flp, swapData);

        IPool(flp).flashLoanSimple(address(this), market, amount, data, 0);
    }

    /// @inheritdoc IFlashLoanSimpleReceiver
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(initiator == address(this), WrongInitiator());
        (, , address flp, ) = abi.decode(params, (address, address, address, bytes));
        require(msg.sender == flp, WrongPool());

        IERC20(asset).approve(flp, amount + premium);
        return true;
    }
}
