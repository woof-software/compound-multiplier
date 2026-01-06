// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { CurrencyLibrary, Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IFlashLoanPlugin } from "../../interfaces/IFlashLoanPlugin.sol";
import { IStructs as IS } from "../../interfaces/IStructs.sol";
import { IAlerts as IA } from "../../interfaces/IAlerts.sol";
import { IEvents as IE } from "../../interfaces/IEvents.sol";

/**
 * @title UniswapV4Plugin
 * @author WOOF! Software
 * @custom:security-contact dmitriy@woof.software
 * @notice Flash loan plugin for integrating Uniswap V4 PoolManager with CometMultiplier
 * @dev Implements IFlashLoanPlugin interface to provide standardized flash loan functionality
 */
contract UniswapV4Plugin is IFlashLoanPlugin {
    using CurrencyLibrary for Currency;

    using SafeERC20 for IERC20;

    /// @notice Callback function selector for Uniswap V4 unlock
    bytes4 public constant CALLBACK_SELECTOR = UniswapV4Plugin.unlockCallback.selector;

    /// @notice Storage slot for transient flash loan validation
    bytes32 public constant SLOT_PLUGIN = bytes32(uint256(keccak256("UniswapV4Plugin.plugin")) - 1);

    /**
     * @inheritdoc IFlashLoanPlugin
     * @dev config encodes PoolManager address
     */
    function takeFlashLoan(IS.CallbackData memory data, bytes memory config) external payable {
        address flp = abi.decode(config, (address));

        require(flp != address(0), IA.InvalidFlashLoanProvider());

        bytes32 slot = SLOT_PLUGIN;

        assembly {
            tstore(slot, flp)
        }

        IPoolManager(flp).unlock(abi.encode(data));
    }

    /**
     * @notice Handles unlock callback from Uniswap V4 PoolManager
     * @param data Encoded callback data from flash loan initiation
     * @return _data Decoded callback data for adapter processing
     * @dev Takes tokens from PoolManager and validates authorization
     */
    function unlockCallback(bytes calldata data) external returns (IS.CallbackData memory _data) {
        address flp;

        bytes32 slot = SLOT_PLUGIN;

        assembly {
            flp := tload(slot)
            tstore(slot, 0)
        }

        require(flp == msg.sender, IA.UnauthorizedCallback());

        _data = abi.decode(data, (IS.CallbackData));

        address asset = address(_data.asset);
        Currency currency = Currency.wrap(asset);

        IPoolManager(flp).take(currency, address(this), _data.debt);

        _data.flp = flp;
        _data.fee = 0;

        emit IE.FlashLoan(flp, asset, _data.debt, 0);
    }

    /**
     * @inheritdoc IFlashLoanPlugin
     * @dev Settles the flash loan with PoolManager
     */
    function repayFlashLoan(address flp, address baseAsset, uint256 amount) external {
        Currency currency = Currency.wrap(baseAsset);
        IPoolManager(flp).sync(currency);
        currency.transfer(flp, amount);
        IPoolManager(flp).settle();
    }

    /**
     * @notice Checks interface support
     * @param interfaceId The interface identifier
     * @return True if the interface is supported, false otherwise
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IFlashLoanPlugin).interfaceId;
    }

    /**
     * @inheritdoc IFlashLoanPlugin
     */
    function hook() external pure returns (bytes memory) {
        bytes memory data = new bytes(64);
        assembly {
            let ptr := add(data, 32)
            mstore(ptr, 0x20) // Offset: data starts at byte 32
            mstore(add(ptr, 32), 0x00) // Length: 0 bytes (empty bytes)
        }
        return data;
    }
}
