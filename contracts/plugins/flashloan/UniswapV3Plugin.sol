// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IUniswapV3Pool } from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ICometFlashLoanPlugin } from "../../interfaces/ICometFlashLoanPlugin.sol";
import { ICometStructs as ICS } from "../../interfaces/ICometStructs.sol";
import { ICometAlerts as ICA } from "../../interfaces/ICometAlerts.sol";
import { ICometEvents as ICE } from "../../interfaces/ICometEvents.sol";

/**
 * @title UniswapV3Plugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Flash loan plugin for integrating Uniswap V3 pools with CometMultiplier
 * @dev Implements ICometFlashLoanPlugin interface to provide standardized flash loan functionality
 */
// aderyn-fp-next-line(contract-locks-ether)
contract UniswapV3Plugin is ICometFlashLoanPlugin {
    using SafeERC20 for IERC20;

    /// @notice Callback function selector for Uniswap V3 flash loans
    bytes4 public constant CALLBACK_SELECTOR = UniswapV3Plugin.uniswapV3FlashCallback.selector;

    /// @notice Storage slot for transient flash loan ID validation
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("UniswapV3Plugin.plugin")) - 1);

    /**
     * @inheritdoc ICometFlashLoanPlugin
     * @dev config encodes UniswapV3Config with token->pool pools
     */
    function takeFlashLoan(ICS.CallbackData memory data, bytes memory config) external payable {
        ICS.Pool[] memory pools = abi.decode(config, (ICS.Pool[]));

        address asset = address(data.asset);
        address flp = _findPool(pools, asset);

        require(flp != address(0), ICA.InvalidFlashLoanProvider());

        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flp)
        }

        IUniswapV3Pool pool = IUniswapV3Pool(flp);
        address token0 = pool.token0();
        address token1 = pool.token1();

        require(token0 == asset || token1 == asset, ICA.UnauthorizedCallback());

        uint256 amount0 = (token0 == asset) ? data.debt : 0;
        uint256 amount1 = (token1 == asset) ? data.debt : 0;

        pool.flash(address(this), amount0, amount1, abi.encode(data));
    }

    /**
     * @notice Finds pool address for given asset
     * @param pools Array of token-to-pool pools
     * @param asset Asset address to find pool for
     * @return pool Pool address, or address(0) if not found
     */
    function _findPool(ICS.Pool[] memory pools, address asset) internal pure returns (address pool) {
        uint256 length = pools.length;
        for (uint256 i = 0; i < length; ++i) {
            if (pools[i].token == asset) {
                return pools[i].pool;
            }
        }
        return address(0);
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
    ) external returns (ICS.CallbackData memory _data) {
        address flp;

        bytes32 slot = SLOT_PLUGIN;

        assembly {
            flp := tload(slot)
            tstore(slot, 0)
        }

        _data = abi.decode(data, (ICS.CallbackData));

        require(flp == msg.sender, ICA.UnauthorizedCallback());

        IUniswapV3Pool pool = IUniswapV3Pool(flp);
        address token0 = pool.token0();
        address token1 = pool.token1();
        address asset = address(_data.asset);

        uint256 fee = (token0 == asset) ? fee0 : ((token1 == asset) ? fee1 : type(uint256).max);
        require(fee != type(uint256).max && fee != 0, ICA.InvalidFlashLoanData());

        _data.fee = fee;
        _data.flp = flp;
        emit ICE.FlashLoan(flp, asset, _data.debt, fee);
    }

    /**
     * @notice Checks interface support
     * @param interfaceId The interface identifier
     * @return True if the interface is supported, false otherwise
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ICometFlashLoanPlugin).interfaceId;
    }

    /**
     * @inheritdoc ICometFlashLoanPlugin
     */
    function hook() external pure returns (bytes memory) {}
}
