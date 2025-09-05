// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { IPool } from "../interfaces/IPool.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ICometFlashLoanPlugin } from "../interfaces/ICometFlashLoanPlugin.sol";

contract AAVEPlugin is ICometFlashLoanPlugin {
    using SafeERC20 for IERC20;

    bytes4 public constant CALLBACK_SELECTOR = AAVEPlugin.executeOperation.selector;

    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("AAVEPlugin.plugin")) - 1);

    uint16 private constant REFERAL_CODE = 0;

    function takeFlashLoan(CallbackData memory data, bytes memory) external {
        bytes memory _data = abi.encode(data);
        bytes32 flid = keccak256(_data);
        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flid)
        }

        IPool(data.flp).flashLoanSimple(address(this), data.asset, data.debt, _data, REFERAL_CODE);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (CallbackData memory _data) {
        bytes32 flidExpected;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flidExpected := tload(slot)
            tstore(slot, 0)
        }

        require(keccak256(params) == flidExpected, InvalidFlashLoanId());

        _data = abi.decode(params, (CallbackData));
        require(_data.flp == msg.sender, UnauthorizedCallback());
        require(_data.debt == amount || _data.asset == asset || initiator == address(this), InvalidFlashLoanData());

        _data.flashLoanFee = premium;
    }

    function repayFlashLoan(address flp, address asset, uint256 amount) external {
        IERC20(asset).safeTransfer(flp, amount);
    }
}
