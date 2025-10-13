// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IAllowBySig } from "./IAllowBySig.sol";

interface ICometFoundation is IAllowBySig {
    error UnknownPlugin();
    error InvalidOpts();
    error InvalidAsset();
    error InvalidAmountOut();

    /**
     * @notice Emitted when a new plugin is added to the registry
     * @param endpoint The address of the plugin contract
     * @param selector The unique bytes4 selector for the plugin's callback function
     * @param key The unique key derived from the endpoint and selector
     */
    event PluginAdded(address indexed endpoint, bytes4 indexed selector, bytes32 key);

    /**
     * @notice Data structure for registered plugins
     * @param endpoint The address of the plugin contract
     * @param config Encoded configuration specific to the plugin
     * @dev Each plugin is identified by a unique key derived from its endpoint and callback selector
     *      and stored in the plugins mapping in the CometFoundation contract.
     */
    struct Plugin {
        address endpoint;
        bytes config;
    }

    /**
     * @notice Options for flash loan and swap operations
     * @param comet The address of the Compound V3 Comet contract for this market
     * @param flp The address of the flash loan provider contract to use for borrowing assets
     * @param loanPlugin The address of the flash loan plugin contract
     * @param swapPlugin The address of the swap plugin contract
     */
    struct Options {
        address comet;
        address flp;
        address loanPlugin;
        address swapPlugin;
    }
}
