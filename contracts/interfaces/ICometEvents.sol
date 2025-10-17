// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

/**
 * @title ICometEvents
 * @dev This interface defines events emitted by the Comet protocol for various actions such as supply, withdraw, transfer, and more.
 */
interface ICometEvents {
    // FOUNDATION

    /**
     * @notice Emitted when a new plugin is added to the registry
     * @param endpoint The address of the plugin contract
     * @param selector The unique bytes4 selector for the plugin's callback function
     * @param key The unique key derived from the endpoint and selector
     */
    event PluginAdded(address indexed endpoint, bytes4 indexed selector, bytes32 key);

    // MULTIPLIER

    /**
     * @notice Emitted when a leveraged position is executed or withdrawn
     * @param user The address of the user performing the operation
     * @param comet The address of the Compound V3 Comet market
     * @param collateral The address of the collateral asset involved
     * @param multipliedAmount The total amount of collateral supplied or withdrawn
     * @param debt The amount of debt borrowed or repaid
     */
    event Multiplied(
        address indexed user,
        address indexed comet,
        address indexed collateral,
        uint256 multipliedAmount,
        uint256 debt
    );

    /**
     * @notice Emitted when collateral is withdrawn from a leveraged position
     * @param user The address of the user performing the withdrawal
     * @param comet The address of the Compound V3 Comet market
     * @param collateral The address of the collateral asset withdrawn
     * @param withdrawnAmount The amount of collateral tokens withdrawn
     * @param amountOut The amount of base asset returned to the user after repaying debt
     */
    event Covered(
        address indexed user,
        address indexed comet,
        address indexed collateral,
        uint256 withdrawnAmount,
        uint256 amountOut
    );

    //COLLATERAL SWAP

    /**
     * @notice Emitted when a collateral swap is executed
     * @param comet The address of the Compound V3 Comet market
     * @param fromAsset The address of the collateral asset swapped from
     * @param toAsset The address of the collateral asset swapped to
     * @param fromAmount The amount of fromAsset used in the swap
     * @param amountOut The amount of toAsset received from the swap
     */
    event Swapped(
        address indexed comet,
        address indexed fromAsset,
        address indexed toAsset,
        uint256 fromAmount,
        uint256 amountOut
    );

    // SWAP PLUGIN

    /**
     * @notice Emitted when a token swap is successfully executed
     * @param router The address of the router or contract used to perform the swap
     * @param srcToken Address of the source token swapped from
     * @param dstToken Address of the destination token swapped to
     * @param amountOut The actual amount of destination tokens received from the swap
     */
    event Swap(address indexed router, address indexed srcToken, address indexed dstToken, uint256 amountOut);

    // FLASH LOAN PLUGIN

    /**
     * @notice Emitted when a flash loan is taken
     * @param flp The address of the flash loan provider
     * @param asset The address of the asset borrowed
     * @param amount The amount of the asset borrowed
     * @param fee The fee paid for the flash loan
     */
    event FlashLoan(address indexed flp, address indexed asset, uint256 amount, uint256 fee);
}
