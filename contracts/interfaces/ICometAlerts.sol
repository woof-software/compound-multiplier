// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

interface ICometAlerts {
    //FOUNDATION

    /**
     * @notice Thrown when comet address is invalid
     */
    error InvalidComet();

    /**
     * @notice Emitted when a plugin is not recognized
     */
    error UnknownPlugin();

    /**
     * @notice Thrown when input options are invalid
     */
    error InvalidOpts();

    /**
     * @notice Thrown when wEth address is invalid
     */
    error InvalidWeth();

    /**
     * @notice Thrown when treasury address is invalid
     */
    error InvalidTreasury();

    /**
     * @notice Thrown when max health factor drop is invalid
     */
    error InvalidMultiplyParameters();

    /**

    //MULTIPLIER

    /**
     *  @notice Thrown when leverage value is invalid
     */
    error InvalidLeverage();

    /**
     * @notice Thrown when mode on fallback is invalid
     */
    error InvalidMode();

    /**
     * @notice Thrown when there is nothing to deleverage
     */
    error NothingToDeleverage();

    //COLLATERAL SWAP

    /**
     * @notice Thrown when insufficient liquidity for the swap
     */
    error InsufficientLiquidity();

    //SWAP PLUGINS

    /**
     * @notice Thrown when swap parameters are invalid
     */
    error InvalidSwapParameters();

    /**
     * @notice Thrown when receiver address is invalid
     */
    error InvalidReceiver();

    /**
     * @notice Thrown when tokens address validation fails
     */
    error InvalidTokens();

    /**
     * @notice Thrown when swap data includes invalid selector
     */
    error InvalidSelector();

    //FLASH LOAN PLUGINS

    /**
     * @notice Thrown when flash loan callback is unauthorized
     */
    error UnauthorizedCallback();

    /**
     * @notice Thrown when flash loan provider address is invalid
     */
    error InvalidFlashLoanProvider();

    /**
     * @notice Thrown when flash loan data is invalid
     */
    error InvalidFlashLoanData();

    //COMMON
    /**
     * @notice Thrown when amount out is less than expected
     */
    error InvalidAmountOut();

    /**
     * @notice Thrown when amount in is zero
     */
    error InvalidAmountIn();

    //ADJUST
    /**
     * @notice Emitted if target debt equals current debt (no adjustment needed)
     */
    error NoAdjustmentNeeded();

    /**
     * @notice Emitted if adjustment would result in invalid health factor
     */
    error InvalidAdjustment();
}
