// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ICometFlashLoanPlugin } from "../interfaces/ICometFlashLoanPlugin.sol";
import { IUniswapV3Pool } from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract UniswapV3Plugin is ICometFlashLoanPlugin {
    /// @notice Callback selector: keccak256("uniswapV3FlashCallback(uint256,uint256,bytes)") = 0xe9cbafb0
    bytes4 public constant CALLBACK_SELECTOR = 0xe9cbafb0;

    // bytes32(uint256(keccak256("UniswapV3Plugin.plugin")) - 1)
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("UniswapV3Plugin.plugin")) - 1);

    function takeFlashLoan(CallbackData memory data, bytes memory) public {
        bytes memory _data = abi.encode(data);
        bytes32 flid = keccak256(_data);

        bytes32 slot = SLOT_PLUGIN;
        assembly {
            tstore(slot, flid)
        }

        IUniswapV3Pool pool = IUniswapV3Pool(data.flp);
        address token0 = pool.token0();
        address token1 = pool.token1();

        require(token0 == data.asset || token1 == data.asset, UnauthorizedCallback());

        uint256 amount0 = token0 == data.asset ? data.debt : 0;
        uint256 amount1 = token1 == data.asset ? data.debt : 0;

        pool.flash(address(this), amount0, amount1, _data);
    }

    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).transfer(flp, amount);
    }

    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external returns (CallbackData memory _data) {
        bytes32 flid = keccak256(data);
        bytes32 flidExpected;
        bytes32 slot = SLOT_PLUGIN;
        assembly {
            flidExpected := tload(slot)
            tstore(slot, 0)
        }
        require(flid == flidExpected, InvalidFlashLoanId());

        _data = abi.decode(data, (CallbackData));

        require(_data.flp == msg.sender, UnauthorizedCallback());

        IUniswapV3Pool pool = IUniswapV3Pool(_data.flp);
        address token0 = pool.token0();
        address token1 = pool.token1();

        uint256 fee = token0 == _data.asset ? fee0 : (token1 == _data.asset ? fee1 : type(uint256).max);
        require(fee != type(uint256).max, UnauthorizedCallback());
        _data.debt;
        _data.fee = fee;
    }
}
