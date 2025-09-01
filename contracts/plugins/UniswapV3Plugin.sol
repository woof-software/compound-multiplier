// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ICometMultiplierPlugin } from "../interfaces/ICometMultiplierPlugin.sol";
import { IUniswapV3Pool } from "../interfaces/IUniswapV3Pool.sol";

contract UniswapV3Plugin is ICometMultiplierPlugin {
    /// @notice Callback selector: keccak256("uniswapV3FlashCallback(uint256,uint256,bytes)") = 0xe9cbafb0
    bytes4 public constant CALLBACK_SELECTOR = 0xe9cbafb0;

    // bytes32(uint256(keccak256("UniswapV3Plugin.plugin")) - 1)
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("UniswapV3Plugin.plugin")) - 1);

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

        IUniswapV3Pool pool = IUniswapV3Pool(flp);
        address token0 = pool.token0();
        address token1 = pool.token1();

        require(token0 == baseAsset || token1 == baseAsset, UnauthorizedCallback());

        uint256 amount0 = token0 == baseAsset ? amount : 0;
        uint256 amount1 = token1 == baseAsset ? amount : 0;

        pool.flash(address(this), amount0, amount1, data);
    }

    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).transfer(flp, amount);
    }

    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
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

        (address user, address flp, address baseAsset, uint256 amount, uint256 snapshot, bytes memory swapData) = abi
            .decode(data, (address, address, address, uint256, uint256, bytes));

        require(flp == msg.sender, UnauthorizedCallback());

        IUniswapV3Pool pool = IUniswapV3Pool(flp);
        address token0 = pool.token0();
        address token1 = pool.token1();

        uint256 fee = token0 == baseAsset ? fee0 : (token1 == baseAsset ? fee1 : type(uint256).max);
        require(fee != type(uint256).max, UnauthorizedCallback());
        require(IERC20(baseAsset).balanceOf(address(this)) == snapshot + amount, InvalidAmountOut());

        uint256 debt = amount + fee;
        return (user, flp, debt, swapData);
    }
}
