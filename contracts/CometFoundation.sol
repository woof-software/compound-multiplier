// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import { ICometFoundation } from "./interfaces/ICometFoundation.sol";
import { ICometSwapPlugin } from "./interfaces/ICometSwapPlugin.sol";
import { ICometFlashLoanPlugin } from "./interfaces/ICometFlashLoanPlugin.sol";
import { IComet } from "./external/compound/IComet.sol";

/**
 * @title Comet Foundation
 * @author WOOF! Software
 * @custom:security-contact
 * @notice This contract serves as a foundational component for managing plugins that facilitate flash loans and token swaps.
 * It maintains a registry of supported plugins, each identified by a unique key derived from the plugin's address and callback selector.
 * The contract provides internal functions to validate and interact with these plugins, ensuring secure and modular integration with various DeFi protocols.
 */
contract CometFoundation is ICometFoundation {
    /// @dev The scale for factors
    uint64 public constant FACTOR_SCALE = 1e18;
    uint16 public constant PRECEISION = 10_000;

    /// @notice Magic byte to identify valid plugin calls
    bytes1 constant PLUGIN_MAGIC = 0x01;

    /// @notice Offset constants for transient storage slots
    uint8 internal constant LOAN_PLUGIN_OFFSET = 0x20;
    uint8 internal constant SWAP_PLUGIN_OFFSET = 0x40;
    uint8 internal constant MARKET_OFFSET = 0x60;
    uint8 internal constant ASSET_OFFSET = 0x80;
    uint8 internal constant AMOUNT_OFFSET = 0xA0;

    /// @notice Storage slot for transient data, derived from contract name hash
    bytes32 internal constant SLOT_FOUNDATION = bytes32(uint256(keccak256("CometFoundation.storage")) - 1);

    /// @notice Mapping of function selectors to their corresponding plugin configurations
    /// @dev Key is the callback selector, value contains plugin endpoint and configuration
    mapping(bytes32 => bytes) public plugins;

    /**
     * @notice Allows the contract to receive ETH
     * @dev Required for receiving ETH from WETH unwrapping or native ETH operations
     */
    receive() external payable {}

    /// @notice Modifier to handle Comet's allowBySig for gasless approvals
    modifier allow(address comet, AllowParams calldata allowParams) {
        IComet(comet).allowBySig(
            msg.sender,
            address(this),
            true,
            allowParams.nonce,
            allowParams.expiry,
            allowParams.v,
            allowParams.r,
            allowParams.s
        );
        _;
    }

    /**
     * @notice Initializes the adapter with flash loan and swap plugins
     * @param _plugins Array of plugin configurations containing endpoints and their callback selectors
     * @dev Each plugin must have a valid non-zero callback selector
     */
    constructor(Plugin[] memory _plugins) {
        for (uint256 i = 0; i < _plugins.length; i++) {
            Plugin memory plugin = _plugins[i];
            bytes4 pluginSelector;

            if (IERC165(plugin.endpoint).supportsInterface(type(ICometFlashLoanPlugin).interfaceId)) {
                pluginSelector = ICometFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR();
            } else if (IERC165(plugin.endpoint).supportsInterface(type(ICometSwapPlugin).interfaceId)) {
                pluginSelector = bytes4(0);
            } else {
                revert UnknownPlugin();
            }

            bytes32 key = keccak256(abi.encodePacked(plugin.endpoint, pluginSelector));
            plugins[key] = abi.encodePacked(PLUGIN_MAGIC, plugin.config);

            emit PluginAdded(plugin.endpoint, pluginSelector, key);
        }
    }

    /**
     * @notice Executes a token swap using the configured swap plugin
     * @param srcToken Address of the source token to swap from
     * @param dstToken Address of the destination token to swap to
     * @param amount Amount of source tokens to swap
     * @param minAmountOut Minimum amount of destination tokens expected
     * @param swapData Encoded parameters for the swap execution
     * @return amountOut Actual amount of destination tokens received
     * @dev Uses delegatecall to execute swap in the context of this contract
     */
    function _swap(
        address swapPlugin,
        address srcToken,
        address dstToken,
        uint256 amount,
        uint256 minAmountOut,
        bytes memory swapData
    ) internal returns (uint256 amountOut) {
        bytes memory config = _validateSwap(swapPlugin);

        bytes memory callData = abi.encodeWithSelector(
            ICometSwapPlugin.executeSwap.selector,
            srcToken,
            dstToken,
            amount,
            minAmountOut,
            config,
            swapData
        );
        (bool ok, bytes memory data) = address(swapPlugin).delegatecall(callData);
        _catch(ok);

        amountOut = abi.decode(data, (uint256));

        require(amountOut >= minAmountOut, InvalidAmountOut());
    }

    /**
     * @notice Initiates a flash loan using the specified plugin
     * @param endpoint Address of the flash loan plugin
     * @param data Callback data to be passed to the flash loan callback
     * @param config Plugin-specific configuration data
     * @dev Uses delegatecall to execute the flash loan in this contract's context
     */
    function _loan(address endpoint, ICometFlashLoanPlugin.CallbackData memory data, bytes memory config) internal {
        (bool ok, ) = endpoint.delegatecall(
            abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector, data, config)
        );
        _catch(ok);
    }

    /**
     * @notice Repays a flash loan to the specified plugin
     * @param flp Address of the flash loan provider
     * @param baseAsset Address of the borrowed asset
     * @param amount Total amount to repay (principal + fee)
     * @dev Uses delegatecall to invoke the repay function on the flash loan plugin
     */
    function _repay(address endpoint, address flp, address baseAsset, uint256 amount) internal {
        (bool ok, ) = endpoint.delegatecall(
            abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector, flp, baseAsset, amount)
        );
        _catch(ok);
    }

    /**
     * @notice Validates and extracts flashloan plugin config
     * @param opts Plugin options including endpoints and market details
     * @return config Plugin configuration without magic byte
     * @dev Reverts if plugin is not registered or magic byte is invalid
     */
    function _validateLoan(Options memory opts) internal view returns (bytes memory config) {
        require(opts.loanPlugin != address(0) && opts.comet != address(0) && opts.flp != address(0), InvalidOpts());
        config = _config(opts.loanPlugin, ICometFlashLoanPlugin(opts.loanPlugin).CALLBACK_SELECTOR());
    }

    /**
     * @notice Validates and extracts swap plugin config
     * @param swapPlugin Address of the swap plugin
     * @return config Plugin configuration without magic byte
     * @dev Reverts if plugin is not registered or magic byte is invalid
     */
    function _validateSwap(address swapPlugin) internal view returns (bytes memory config) {
        require(swapPlugin != address(0), InvalidOpts());
        config = _config(swapPlugin, bytes4(0));
    }

    /**
     * @notice Retrieves and validates plugin configuration from storage
     * @param plugin Address of the plugin contract
     * @param selector Callback function selector for the plugin
     * @return config Plugin configuration data without magic byte
     * @dev Reverts if the plugin is unknown or the magic byte is invalid
     */
    function _config(address plugin, bytes4 selector) internal view returns (bytes memory config) {
        bytes32 key = keccak256(abi.encodePacked(plugin, selector));
        bytes memory configWithMagic = plugins[key];
        require(configWithMagic.length > 0, UnknownPlugin());
        require(configWithMagic[0] == PLUGIN_MAGIC, UnknownPlugin());
        assembly {
            let len := mload(configWithMagic)
            config := add(configWithMagic, 1)
            mstore(config, sub(len, 1))
        }
    }

    /**
     * @notice Handles failed external calls by reverting with the original error
     * @param success Boolean indicating if the external call succeeded
     * @dev Preserves the original revert reason when delegatecalls or external calls fail
     */
    function _catch(bool success) internal pure {
        if (!success) {
            assembly {
                let size := returndatasize()
                returndatacopy(0, 0, size)
                revert(0, size)
            }
        }
    }
}
