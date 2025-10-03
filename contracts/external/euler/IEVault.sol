// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity >=0.8.0;

// Full interface of EVault and all it's modules

/// @title IInitialize
/// @notice Interface of the initialization module of EVault
interface IInitialize {
    /// @notice Initialization of the newly deployed proxy contract
    /// @param proxyCreator Account which created the proxy or should be the initial governor
    function initialize(address proxyCreator) external;
}

/// @title IERC4626
/// @notice Interface of an ERC4626 vault
interface IERC4626 {
    /// @notice Vault's underlying asset
    /// @return The vault's underlying asset
    function asset() external view returns (address);

    /// @notice Total amount of managed assets, cash and borrows
    /// @return The total amount of assets
    function totalAssets() external view returns (uint256);

    /// @notice Calculate amount of assets corresponding to the requested shares amount
    /// @param shares Amount of shares to convert
    /// @return The amount of assets
    function convertToAssets(uint256 shares) external view returns (uint256);

    /// @notice Calculate amount of shares corresponding to the requested assets amount
    /// @param assets Amount of assets to convert
    /// @return The amount of shares
    function convertToShares(uint256 assets) external view returns (uint256);

    /// @notice Fetch the maximum amount of assets a user can deposit
    /// @param account Address to query
    /// @return The max amount of assets the account can deposit
    function maxDeposit(address account) external view returns (uint256);

    /// @notice Calculate an amount of shares that would be created by depositing assets
    /// @param assets Amount of assets deposited
    /// @return Amount of shares received
    function previewDeposit(uint256 assets) external view returns (uint256);

    /// @notice Fetch the maximum amount of shares a user can mint
    /// @param account Address to query
    /// @return The max amount of shares the account can mint
    function maxMint(address account) external view returns (uint256);

    /// @notice Calculate an amount of assets that would be required to mint requested amount of shares
    /// @param shares Amount of shares to be minted
    /// @return Required amount of assets
    function previewMint(uint256 shares) external view returns (uint256);

    /// @notice Fetch the maximum amount of assets a user is allowed to withdraw
    /// @param owner Account holding the shares
    /// @return The maximum amount of assets the owner is allowed to withdraw
    function maxWithdraw(address owner) external view returns (uint256);

    /// @notice Calculate the amount of shares that will be burned when withdrawing requested amount of assets
    /// @param assets Amount of assets withdrawn
    /// @return Amount of shares burned
    function previewWithdraw(uint256 assets) external view returns (uint256);

    /// @notice Fetch the maximum amount of shares a user is allowed to redeem for assets
    /// @param owner Account holding the shares
    /// @return The maximum amount of shares the owner is allowed to redeem
    function maxRedeem(address owner) external view returns (uint256);

    /// @notice Calculate the amount of assets that will be transferred when redeeming requested amount of shares
    /// @param shares Amount of shares redeemed
    /// @return Amount of assets transferred
    function previewRedeem(uint256 shares) external view returns (uint256);

    /// @notice Transfer requested amount of underlying tokens from sender to the vault pool in return for shares
    /// @param amount Amount of assets to deposit (use max uint256 for full underlying token balance)
    /// @param receiver An account to receive the shares
    /// @return Amount of shares minted
    /// @dev Deposit will round down the amount of assets that are converted to shares. To prevent losses consider using
    /// mint instead.
    function deposit(uint256 amount, address receiver) external returns (uint256);

    /// @notice Transfer underlying tokens from sender to the vault pool in return for requested amount of shares
    /// @param amount Amount of shares to be minted
    /// @param receiver An account to receive the shares
    /// @return Amount of assets deposited
    function mint(uint256 amount, address receiver) external returns (uint256);

    /// @notice Transfer requested amount of underlying tokens from the vault and decrease account's shares balance
    /// @param amount Amount of assets to withdraw
    /// @param receiver Account to receive the withdrawn assets
    /// @param owner Account holding the shares to burn
    /// @return Amount of shares burned
    function withdraw(uint256 amount, address receiver, address owner) external returns (uint256);

    /// @notice Burn requested shares and transfer corresponding underlying tokens from the vault to the receiver
    /// @param amount Amount of shares to burn (use max uint256 to burn full owner balance)
    /// @param receiver Account to receive the withdrawn assets
    /// @param owner Account holding the shares to burn.
    /// @return Amount of assets transferred
    function redeem(uint256 amount, address receiver, address owner) external returns (uint256);
}

/// @title IVault
/// @notice Interface of the EVault's Vault module
interface IVault is IERC4626 {
    /// @notice Balance of the fees accumulator, in shares
    /// @return The accumulated fees in shares
    function accumulatedFees() external view returns (uint256);

    /// @notice Balance of the fees accumulator, in underlying units
    /// @return The accumulated fees in asset units
    function accumulatedFeesAssets() external view returns (uint256);

    /// @notice Address of the original vault creator
    /// @return The address of the creator
    function creator() external view returns (address);

    /// @notice Creates shares for the receiver, from excess asset balances of the vault (not accounted for in `cash`)
    /// @param amount Amount of assets to claim (use max uint256 to claim all available assets)
    /// @param receiver An account to receive the shares
    /// @return Amount of shares minted
    /// @dev Could be used as an alternative deposit flow in certain scenarios. E.g. swap directly to the vault, call
    /// `skim` to claim deposit.
    function skim(uint256 amount, address receiver) external returns (uint256);
}

/// @title IBorrowing
/// @notice Interface of the EVault's Borrowing module
interface IBorrowing {
    /// @notice Sum of all outstanding debts, in underlying units (increases as interest is accrued)
    /// @return The total borrows in asset units
    function totalBorrows() external view returns (uint256);

    /// @notice Sum of all outstanding debts, in underlying units scaled up by shifting
    /// INTERNAL_DEBT_PRECISION_SHIFT bits
    /// @return The total borrows in internal debt precision
    function totalBorrowsExact() external view returns (uint256);

    /// @notice Balance of vault assets as tracked by deposits/withdrawals and borrows/repays
    /// @return The amount of assets the vault tracks as current direct holdings
    function cash() external view returns (uint256);

    /// @notice Debt owed by a particular account, in underlying units
    /// @param account Address to query
    /// @return The debt of the account in asset units
    function debtOf(address account) external view returns (uint256);

    /// @notice Debt owed by a particular account, in underlying units scaled up by shifting
    /// INTERNAL_DEBT_PRECISION_SHIFT bits
    /// @param account Address to query
    /// @return The debt of the account in internal precision
    function debtOfExact(address account) external view returns (uint256);

    /// @notice Retrieves the current interest rate for an asset
    /// @return The interest rate in yield-per-second, scaled by 10**27
    function interestRate() external view returns (uint256);

    /// @notice Retrieves the current interest rate accumulator for an asset
    /// @return An opaque accumulator that increases as interest is accrued
    function interestAccumulator() external view returns (uint256);

    /// @notice Returns an address of the sidecar DToken
    /// @return The address of the DToken
    function dToken() external view returns (address);

    /// @notice Transfer underlying tokens from the vault to the sender, and increase sender's debt
    /// @param amount Amount of assets to borrow (use max uint256 for all available tokens)
    /// @param receiver Account receiving the borrowed tokens
    /// @return Amount of assets borrowed
    function borrow(uint256 amount, address receiver) external returns (uint256);

    /// @notice Transfer underlying tokens from the sender to the vault, and decrease receiver's debt
    /// @param amount Amount of debt to repay in assets (use max uint256 for full debt)
    /// @param receiver Account holding the debt to be repaid
    /// @return Amount of assets repaid
    function repay(uint256 amount, address receiver) external returns (uint256);

    /// @notice Pay off liability with shares ("self-repay")
    /// @param amount In asset units (use max uint256 to repay the debt in full or up to the available deposit)
    /// @param receiver Account to remove debt from by burning sender's shares
    /// @return shares Amount of shares burned
    /// @return debt Amount of debt removed in assets
    /// @dev Equivalent to withdrawing and repaying, but no assets are needed to be present in the vault
    function repayWithShares(uint256 amount, address receiver) external returns (uint256 shares, uint256 debt);

    /// @notice Take over debt from another account
    /// @param amount Amount of debt in asset units (use max uint256 for all the account's debt)
    /// @param from Account to pull the debt from
    /// @return Amount of debt pulled in asset units.
    function pullDebt(uint256 amount, address from) external returns (uint256);

    /// @notice Request a flash-loan. A onFlashLoan() callback in msg.sender will be invoked, which must repay the loan
    /// to the main Euler address prior to returning.
    /// @param amount In asset units
    /// @param data Passed through to the onFlashLoan() callback, so contracts don't need to store transient data in
    /// storage
    function flashLoan(uint256 amount, bytes calldata data) external;

    /// @notice Updates interest accumulator and totalBorrows, credits reserves, re-targets interest rate, and logs
    /// vault status
    function touch() external;
}

/// @title ILiquidation
/// @notice Interface of the EVault's Liquidation module
interface ILiquidation {
    /// @notice Checks to see if a liquidation would be profitable, without actually doing anything
    /// @param liquidator Address that will initiate the liquidation
    /// @param violator Address that may be in collateral violation
    /// @param collateral Collateral which is to be seized
    /// @return maxRepay Max amount of debt that can be repaid, in asset units
    /// @return maxYield Yield in collateral corresponding to max allowed amount of debt to be repaid, in collateral
    /// balance (shares for vaults)
    function checkLiquidation(
        address liquidator,
        address violator,
        address collateral
    ) external view returns (uint256 maxRepay, uint256 maxYield);

    /// @notice Attempts to perform a liquidation
    /// @param violator Address that may be in collateral violation
    /// @param collateral Collateral which is to be seized
    /// @param repayAssets The amount of underlying debt to be transferred from violator to sender, in asset units (use
    /// max uint256 to repay the maximum possible amount).
    /// @param minYieldBalance The minimum acceptable amount of collateral to be transferred from violator to sender, in
    /// collateral balance units (shares for vaults)
    function liquidate(address violator, address collateral, uint256 repayAssets, uint256 minYieldBalance) external;
}

/// @title IBalanceForwarder
/// @notice Interface of the EVault's BalanceForwarder module
interface IBalanceForwarder {
    /// @notice Retrieve the address of rewards contract, tracking changes in account's balances
    /// @return The balance tracker address
    function balanceTrackerAddress() external view returns (address);

    /// @notice Retrieves boolean indicating if the account opted in to forward balance changes to the rewards contract
    /// @param account Address to query
    /// @return True if balance forwarder is enabled
    function balanceForwarderEnabled(address account) external view returns (bool);

    /// @notice Enables balance forwarding for the authenticated account
    /// @dev Only the authenticated account can enable balance forwarding for itself
    /// @dev Should call the IBalanceTracker hook with the current account's balance
    function enableBalanceForwarder() external;

    /// @notice Disables balance forwarding for the authenticated account
    /// @dev Only the authenticated account can disable balance forwarding for itself
    /// @dev Should call the IBalanceTracker hook with the account's balance of 0
    function disableBalanceForwarder() external;
}

/// @title IGovernance
/// @notice Interface of the EVault's Governance module
interface IGovernance {
    /// @notice Retrieves the address of the governor
    /// @return The governor address
    function governorAdmin() external view returns (address);

    /// @notice Retrieves address of the governance fee receiver
    /// @return The fee receiver address
    function feeReceiver() external view returns (address);

    /// @notice Retrieves the interest fee in effect for the vault
    /// @return Amount of interest that is redirected as a fee, as a fraction scaled by 1e4
    function interestFee() external view returns (uint16);

    /// @notice Looks up an asset's currently configured interest rate model
    /// @return Address of the interest rate contract or address zero to indicate 0% interest
    function interestRateModel() external view returns (address);

    /// @notice Retrieves the ProtocolConfig address
    /// @return The protocol config address
    function protocolConfigAddress() external view returns (address);

    /// @notice Retrieves the protocol fee share
    /// @return A percentage share of fees accrued belonging to the protocol. In wad scale (1e18)
    function protocolFeeShare() external view returns (uint256);

    /// @notice Retrieves the address which will receive protocol's fees
    /// @notice The protocol fee receiver address
    function protocolFeeReceiver() external view returns (address);

    /// @notice Retrieves supply and borrow caps in AmountCap format
    /// @return supplyCap The supply cap in AmountCap format
    /// @return borrowCap The borrow cap in AmountCap format
    function caps() external view returns (uint16 supplyCap, uint16 borrowCap);

    /// @notice Retrieves the borrow LTV of the collateral, which is used to determine if the account is healthy during
    /// account status checks.
    /// @param collateral The address of the collateral to query
    /// @return Borrowing LTV in 1e4 scale
    function LTVBorrow(address collateral) external view returns (uint16);

    /// @notice Retrieves the current liquidation LTV, which is used to determine if the account is eligible for
    /// liquidation
    /// @param collateral The address of the collateral to query
    /// @return Liquidation LTV in 1e4 scale
    function LTVLiquidation(address collateral) external view returns (uint16);

    /// @notice Retrieves LTV configuration for the collateral
    /// @param collateral Collateral asset
    /// @return borrowLTV The current value of borrow LTV for originating positions
    /// @return liquidationLTV The value of fully converged liquidation LTV
    /// @return initialLiquidationLTV The initial value of the liquidation LTV, when the ramp began
    /// @return targetTimestamp The timestamp when the liquidation LTV is considered fully converged
    /// @return rampDuration The time it takes for the liquidation LTV to converge from the initial value to the fully
    /// converged value
    function LTVFull(
        address collateral
    )
        external
        view
        returns (
            uint16 borrowLTV,
            uint16 liquidationLTV,
            uint16 initialLiquidationLTV,
            uint48 targetTimestamp,
            uint32 rampDuration
        );

    /// @notice Retrieves a list of collaterals with configured LTVs
    /// @return List of asset collaterals
    /// @dev Returned assets could have the ltv disabled (set to zero)
    function LTVList() external view returns (address[] memory);

    /// @notice Retrieves the maximum liquidation discount
    /// @return The maximum liquidation discount in 1e4 scale
    function maxLiquidationDiscount() external view returns (uint16);

    /// @notice Retrieves liquidation cool-off time, which must elapse after successful account status check before
    /// account can be liquidated
    /// @return The liquidation cool off time in seconds
    function liquidationCoolOffTime() external view returns (uint16);

    /// @notice Retrieves a hook target and a bitmask indicating which operations call the hook target
    /// @return hookTarget Address of the hook target contract
    /// @return hookedOps Bitmask with operations that should call the hooks. See Constants.sol for a list of operations
    function hookConfig() external view returns (address hookTarget, uint32 hookedOps);

    /// @notice Retrieves a bitmask indicating enabled config flags
    /// @return Bitmask with config flags enabled
    function configFlags() external view returns (uint32);

    /// @notice Address of EthereumVaultConnector contract
    /// @return The EVC address
    function EVC() external view returns (address);

    /// @notice Retrieves a reference asset used for liquidity calculations
    /// @return The address of the reference asset
    function unitOfAccount() external view returns (address);

    /// @notice Retrieves the address of the oracle contract
    /// @return The address of the oracle
    function oracle() external view returns (address);

    /// @notice Retrieves the Permit2 contract address
    /// @return The address of the Permit2 contract
    function permit2Address() external view returns (address);

    /// @notice Splits accrued fees balance according to protocol fee share and transfers shares to the governor fee
    /// receiver and protocol fee receiver
    function convertFees() external;

    /// @notice Set a new governor address
    /// @param newGovernorAdmin The new governor address
    /// @dev Set to zero address to renounce privileges and make the vault non-governed
    function setGovernorAdmin(address newGovernorAdmin) external;

    /// @notice Set a new governor fee receiver address
    /// @param newFeeReceiver The new fee receiver address
    function setFeeReceiver(address newFeeReceiver) external;

    /// @notice Set a new LTV config
    /// @param collateral Address of collateral to set LTV for
    /// @param borrowLTV New borrow LTV, for assessing account's health during account status checks, in 1e4 scale
    /// @param liquidationLTV New liquidation LTV after ramp ends in 1e4 scale
    /// @param rampDuration Ramp duration in seconds
    function setLTV(address collateral, uint16 borrowLTV, uint16 liquidationLTV, uint32 rampDuration) external;

    /// @notice Completely clears LTV configuratrion, signalling the collateral is not considered safe to liquidate
    /// anymore
    /// @param collateral Address of the collateral
    function clearLTV(address collateral) external;

    /// @notice Set a new maximum liquidation discount
    /// @param newDiscount New maximum liquidation discount in 1e4 scale
    /// @dev If the discount is zero (the default), the liquidators will not be incentivized to liquidate unhealthy
    /// accounts
    function setMaxLiquidationDiscount(uint16 newDiscount) external;

    /// @notice Set a new liquidation cool off time, which must elapse after successful account status check before
    /// account can be liquidated
    /// @param newCoolOffTime The new liquidation cool off time in seconds
    /// @dev Setting cool off time to zero allows liquidating the account in the same block as the last successful
    /// account status check
    function setLiquidationCoolOffTime(uint16 newCoolOffTime) external;

    /// @notice Set a new interest rate model contract
    /// @param newModel The new IRM address
    function setInterestRateModel(address newModel) external;

    /// @notice Set a new hook target and a new bitmap indicating which operations should call the hook target.
    /// Operations are defined in Constants.sol
    /// @param newHookTarget The new hook target address
    /// @param newHookedOps Bitmask with the new hooked operations
    function setHookConfig(address newHookTarget, uint32 newHookedOps) external;

    /// @notice Set new bitmap indicating which config flags should be enabled. Flags are defined in Constants.sol
    /// @param newConfigFlags Bitmask with the new config flags
    function setConfigFlags(uint32 newConfigFlags) external;

    /// @notice Set new supply and borrow caps in AmountCap format
    /// @param supplyCap The new supply cap in AmountCap fromat
    /// @param borrowCap The new borrow cap in AmountCap fromat
    function setCaps(uint16 supplyCap, uint16 borrowCap) external;

    /// @notice Set a new interest fee
    /// @param newFee The new interest fee
    function setInterestFee(uint16 newFee) external;
}

/// @title IEVault
/// @custom:security-contact security@euler.xyz
/// @author Euler Labs (https://www.eulerlabs.com/)
/// @notice Interface of the EVault, an EVC enabled lending vault
interface IEVault is IInitialize, IVault, IBorrowing, ILiquidation, IBalanceForwarder, IGovernance {
    /// @notice Fetch address of the `Initialize` module
    function MODULE_INITIALIZE() external view returns (address);

    /// @notice Fetch address of the `Token` module
    function MODULE_TOKEN() external view returns (address);

    /// @notice Fetch address of the `Vault` module
    function MODULE_VAULT() external view returns (address);

    /// @notice Fetch address of the `Borrowing` module
    function MODULE_BORROWING() external view returns (address);

    /// @notice Fetch address of the `Liquidation` module
    function MODULE_LIQUIDATION() external view returns (address);

    /// @notice Fetch address of the `RiskManager` module
    function MODULE_RISKMANAGER() external view returns (address);

    /// @notice Fetch address of the `BalanceForwarder` module
    function MODULE_BALANCE_FORWARDER() external view returns (address);

    /// @notice Fetch address of the `Governance` module
    function MODULE_GOVERNANCE() external view returns (address);
}
