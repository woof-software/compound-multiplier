// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ICometSwapPlugin } from "../../interfaces/ICometSwapPlugin.sol";
import { ICometMultiplier } from "../../interfaces/ICometMultiplier.sol";

import { IWstEth } from "../../external/lido/IWstEth.sol";
import { IStEth } from "../../external/lido/IStEth.sol";
import { IWEth } from "../../external/weth/IWEth.sol";

import { ICometAlerts as ICA } from "../../interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "../../interfaces/ICometEvents.sol";

/**
 * @title WstEthPlugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Swap plugin for converting between WETH and wstETH via Lido staking
 * @dev Implements ICometSwapPlugin interface to provide specialized WETH / wstETH conversion
 */
contract WstEthPlugin is ICometSwapPlugin {
    using SafeERC20 for IERC20;

    bytes4 public constant SWAP_SELECTOR = bytes4(0);

    /// @notice Address of the wstETH token contract
    address public constant WSTETH_ADDRESS = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;

    /// @notice Address of the stETH token contract
    address public constant STETH_ADDRESS = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;

    /**
     * @inheritdoc ICometSwapPlugin
     */
    function executeSwap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        bytes calldata config,
        bytes calldata
    ) external returns (uint256 amountOut) {
        uint256 minAmountOut = abi.decode(config, (uint256));
        address wEth = ICometMultiplier(address(this)).wEth();
        require(
            srcToken != dstToken && amountIn > 0 && srcToken == wEth && minAmountOut > 0 && dstToken == WSTETH_ADDRESS,
            ICA.InvalidAmountIn()
        );

        return _lidoSwap(wEth, WSTETH_ADDRESS, STETH_ADDRESS, amountIn, minAmountOut);
    }

    function _lidoSwap(
        address wEth,
        address wstEth,
        address stEth,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        uint256 initial = IERC20(wstEth).balanceOf(address(this));
        IWEth(wEth).withdraw(amountIn);
        uint256 stAmount = IStEth(stEth).submit{ value: amountIn }(address(this));
        IERC20(stEth).safeIncreaseAllowance(wstEth, stAmount);
        require(IWstEth(wstEth).wrap(stAmount) > 0, ICA.InvalidAmountOut());
        amountOut = IERC20(wstEth).balanceOf(address(this)) - initial;
        require(amountOut >= minAmountOut, ICA.InvalidAmountOut());
        emit ICE.Swap(wstEth, wEth, wstEth, amountOut);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometSwapPlugin).interfaceId;
    }
}
