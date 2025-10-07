// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IUniswapV3Pool } from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import { ICometFlashLoanPlugin } from "../../interfaces/ICometFlashLoanPlugin.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title UniswapV3Plugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Flash loan plugin for integrating Uniswap V3 pools with CometMultiplierAdapter
 * @dev Implements ICometFlashLoanPlugin interface to provide standardized flash loan functionality
 */
contract UniswapV3Plugin is ICometFlashLoanPlugin {
    using SafeERC20 for IERC20;
    /// @notice Callback function selector for Uniswap V3 flash loans
    bytes4 public constant CALLBACK_SELECTOR = 0xe9cbafb0;

    /// @notice Storage slot for transient flash loan ID validation
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("UniswapV3Plugin.plugin")) - 1);

    /**
     * @inheritdoc ICometFlashLoanPlugin
     */
    function takeFlashLoan(CallbackData memory data, bytes memory) external payable {
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

    /**
     * @inheritdoc ICometFlashLoanPlugin
     */
    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        IERC20(baseAsset).safeTransfer(flp, amount);
    }

    /**
     * @notice Handles flash loan callback from Uniswap V3 pool
     * @param fee0 Fee amount for token0
     * @param fee1 Fee amount for token1
     * @param data Encoded callback data from flash loan initiation
     * @return _data Decoded callback data for adapter processing
     * @dev Validates flash loan ID and sender authorization before processing
     */
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

        _data.fee = fee;
    }
}
