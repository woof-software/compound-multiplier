// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { ICometFlashLoanPlugin } from "../interfaces/ICometFlashLoanPlugin.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FlashloanPluginTest {
    address public flp;
    ICometFlashLoanPlugin public endpoint;

    ICometFlashLoanPlugin.CallbackData public lastCallbackData;

    uint256 public amm;

    bytes4 public constant CALLBACK_SELECTOR = 0xa6dad371;

    constructor(address _flp, address _endpoint) {
        flp = _flp;
        endpoint = ICometFlashLoanPlugin(_endpoint);
    }

    function flash(ICometFlashLoanPlugin.CallbackData memory data) external {
        (bool success, ) = address(endpoint).delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.takeFlashLoan.selector,
                data,
                "" // config
            )
        );
        _catch(success);
    }

    function attackAAVE(
        ICometFlashLoanPlugin.CallbackData memory data,
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bool toFailFlid
    ) external {
        bytes memory _data = toFailFlid ? abi.encode(data, 1) : abi.encode(data);
        bytes32 flid = keccak256(_data);
        bytes32 slot = endpoint.SLOT_PLUGIN();

        assembly {
            tstore(slot, flid)
        }

        (bool ok, ) = address(endpoint).delegatecall(
            abi.encodeWithSelector(endpoint.CALLBACK_SELECTOR(), asset, amount, premium, initiator, abi.encode(data))
        );

        _catch(ok);
    }

    function attackBalancer(
        ICometFlashLoanPlugin.CallbackData memory data,
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bool toFailFlid
    ) external {
        bytes memory _data = toFailFlid ? abi.encode(data, 1) : abi.encode(data);
        bytes32 flid = keccak256(_data);
        bytes32 slot = endpoint.SLOT_PLUGIN();

        assembly {
            tstore(slot, flid)
        }

        (bool ok, ) = address(endpoint).delegatecall(
            abi.encodeWithSelector(endpoint.CALLBACK_SELECTOR(), tokens, amounts, feeAmounts, abi.encode(data))
        );
        _catch(ok);
    }

    function attackCallback() public pure returns (ICometFlashLoanPlugin.CallbackData memory) {
        return
            ICometFlashLoanPlugin.CallbackData({
                debt: 1000,
                fee: 0,
                snapshot: 0,
                user: address(0),
                flp: address(0),
                asset: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
                swapData: ""
            });
    }

    fallback() external payable {
        (, bytes memory payload) = address(endpoint).delegatecall(msg.data);

        ICometFlashLoanPlugin.CallbackData memory data = abi.decode(payload, (ICometFlashLoanPlugin.CallbackData));

        lastCallbackData = data;

        (bool ok, ) = address(endpoint).delegatecall(
            abi.encodeWithSelector(
                ICometFlashLoanPlugin.repayFlashLoan.selector,
                data.flp,
                data.asset,
                data.debt + data.fee
            )
        );
        require(ok);

        assembly {
            mstore(0x00, 1)
            return(0x00, 0x20)
        }
    }

    function _catch(bool success) internal pure {
        if (!success) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }
    }

    receive() external payable {}
}
