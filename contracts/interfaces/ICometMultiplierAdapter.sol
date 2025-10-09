// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.30;

import { IAllowBySig } from "./IAllowBySig.sol";

interface ICometMultiplierAdapter {
    error UnsupportedPriceFeed();
    error UnknownCallbackSelector();
    error UnknownMarket();
    error UnknownPlugin();
    error InvalidLeverage();
    error InvalidAmountOut();
    error InvalidAsset();
    error CallbackFailed();
    error FlashLoanFailed();
    error InvalidMode();
    error AlreadyExists();
    error NothingToDeleverage();
    error InvalidCollateralAmount();

    enum Mode {
        EXECUTE,
        WITHDRAW
    }

    struct Options {
        address market;
        address flp;
        address loanPlugin;
        address swapPlugin;
    }

    event PluginAdded(address indexed endpoint, bytes4 indexed selector, bytes32 key);
    event Executed(
        address indexed user,
        address indexed market,
        address indexed collateral,
        uint256 totalAmount,
        uint256 debtAmount
    );
    event Withdrawn(
        address indexed user,
        address indexed market,
        address indexed collateral,
        uint256 withdrawnAmount,
        uint256 baseReturned
    );

    function wEth() external view returns (address);

    /**
     * @notice Creates a leveraged position by borrowing against supplied collateral
     * @param opts Configuration options including market, selectors, and flash loan provider
     * @param collateral Address of the collateral token to supply
     * @param collateralAmount Amount of collateral tokens to supply
     * @param leverage Leverage multiplier (e.g., 20000 = 2x leverage)
     * @param swapData Encoded swap parameters for the DEX aggregator
     * @param minAmountOut Minimum amount of collateral tokens expected from the swap
     * @dev This function:
     * 1. Validates the flash loan plugin exists
     * 2. Calculates the required loan amount based on leverage
     * 3. Transfers user's collateral to the contract
     * 4. Initiates a flash loan to execute the leveraged position
     * @custom:security Protected by reentrancy guard and requires valid plugin selectors
     */
    function executeMultiplier(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external payable;

    /**
     * @notice Creates a leveraged position with EIP-712 signature authorization
     * @param opts Configuration options including market, selectors, and flash loan provider
     * @param collateral Address of the collateral token to supply
     * @param collateralAmount Amount of collateral tokens to supply
     * @param leverage Leverage multiplier (e.g., 20000 = 2x leverage)
     * @param swapData Encoded swap parameters for the DEX aggregator
     * @param minAmountOut Minimum amount of collateral tokens expected from the swap
     * @param allowParams EIP-712 signature parameters for Comet authorization
     * @dev This function first authorizes the adapter via allowBySig, then executes the position
     * @custom:security Signature must be valid and not expired; protected by reentrancy guard
     */
    function executeMultiplierBySig(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        uint256 leverage,
        bytes calldata swapData,
        uint256 minAmountOut,
        IAllowBySig.AllowParams calldata allowParams
    ) external payable;

    /**
     * @notice Reduces or closes a leveraged position by withdrawing collateral and repaying debt
     * @param opts Configuration options including market, selectors, and flash loan provider
     * @param collateral Address of the collateral token to withdraw
     * @param collateralAmount Amount of collateral tokens to withdraw (or type(uint256).max for maximum)
     * @param swapData Encoded swap parameters for converting collateral to base asset
     * @param minAmountOut Minimum amount of base asset expected from the swap
     * @dev This function:
     * 1. Checks that the user has an outstanding borrow balance
     * 2. Calculates the maximum withdrawable amount based on collateralization
     * 3. Initiates a flash loan to temporarily repay debt and withdraw collateral
     * @custom:security Protected by reentrancy guard and validates borrow balance exists
     */
    function withdrawMultiplier(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external;

    /**
     * @notice Reduces or closes a leveraged position with EIP-712 signature authorization
     * @param opts Configuration options including market, selectors, and flash loan provider
     * @param collateral Address of the collateral token to withdraw
     * @param collateralAmount Amount of collateral tokens to withdraw (or type(uint256).max for maximum)
     * @param swapData Encoded swap parameters for converting collateral to base asset
     * @param minAmountOut Minimum amount of base asset expected from the swap
     * @param allowParams EIP-712 signature parameters for Comet authorization
     * @dev This function first authorizes the adapter via allowBySig, then withdraws the position
     * @custom:security Signature must be valid and not expired; protected by reentrancy guard
     */
    function withdrawMultiplierBySig(
        Options memory opts,
        address collateral,
        uint256 collateralAmount,
        bytes calldata swapData,
        uint256 minAmountOut,
        IAllowBySig.AllowParams calldata allowParams
    ) external;
}
