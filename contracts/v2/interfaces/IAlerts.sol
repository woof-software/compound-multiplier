// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

interface IAlerts {
    //FOUNDATION

    /**
     * @notice Emitted if comet address is invalid
     */
    error InvalidComet();

    /**
     * @notice Emitted when a plugin is not recognized
     */
    error UnknownPlugin();

    /**
     * @notice Emitted if input options are invalid
     */
    error InvalidOpts();

    /**
     * @notice Emitted if wEth address is invalid
     */
    error InvalidWeth();

    /**
     * @notice Emitted if treasury address is invalid
     */
    error InvalidTreasury();

    /**
     * @notice Emitted if max health factor drop is invalid
     */
    error InvalidMultiplyParameters();

    /**

    //MULTIPLIER

    /**
     *  @notice Emitted if leverage value is invalid
     */
    error InvalidLeverage();

    /**
     * @notice Emitted if mode on fallback is invalid
     */
    error InvalidMode();

    /**
     * @notice Emitted if there is nothing to deleverage
     */
    error NothingToDeleverage();

    //COLLATERAL SWAP

    /**
     * @notice Emitted if insufficient liquidity for the swap
     */
    error InsufficientLiquidity();

    //SWAP PLUGINS

    /**
     * @notice Emitted if swap parameters are invalid
     */
    error InvalidSwapParameters();

    /**
     * @notice Emitted if receiver address is invalid
     */
    error InvalidReceiver();

    /**
     * @notice Emitted if tokens address validation fails
     */
    error InvalidTokens();

    /**
     * @notice Emitted if swap data includes invalid selector
     */
    error InvalidSelector();

    //FLASH LOAN PLUGINS

    /**
     * @notice Emitted if flash loan callback is unauthorized
     */
    error UnauthorizedCallback();

    /**
     * @notice Emitted if flash loan provider address is invalid
     */
    error InvalidFlashLoanProvider();

    /**
     * @notice Emitted if flash loan data is invalid
     */
    error InvalidFlashLoanData();

    //CORE PLUGINS

    /**
     * @notice Emitted when a core plugin is not recognized or invalid
     */
    error InvalidCorePlugin();

    /**
     * @notice Emitted when the collateral asset is invalid for the market
     */
    error InvalidCollateral();

    /**
     * @notice Emitted when the market address is invalid
     */
    error InvalidMarket();

    //COMMON
    /**
     * @notice Emitted if amount out is less than expected
     */
    error InvalidAmountOut();

    /**
     * @notice Emitted if amount in is zero
     */
    error InvalidAmountIn();
}
