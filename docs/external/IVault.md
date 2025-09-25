# Solidity API

## IVault

This interface defines the methods for the Vault for the purpose of integration with the Ethereum Vault
Connector.

### disableController

```solidity
function disableController() external
```

Disables a controller (this vault) for the authenticated account.

_A controller is a vault that has been chosen for an account to have special control over account’s
balances in the enabled collaterals vaults. User calls this function in order for the vault to disable itself
for the account if the conditions are met (i.e. user has repaid debt in full). If the conditions are not met,
the function reverts._

### checkAccountStatus

```solidity
function checkAccountStatus(address account, address[] collaterals) external returns (bytes4 magicValue)
```

Checks the status of an account.

_This function must only deliberately revert if the account status is invalid. If this function reverts due
to any other reason, it may render the account unusable with possibly no way to recover funds._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account to be checked. |
| collaterals | address[] | The array of enabled collateral addresses to be considered for the account status check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| magicValue | bytes4 | Must return the bytes4 magic value 0xb168c58f (which is a selector of this function) when account status is valid, or revert otherwise. |

### checkVaultStatus

```solidity
function checkVaultStatus() external returns (bytes4 magicValue)
```

Checks the status of the vault.

_This function must only deliberately revert if the vault status is invalid. If this function reverts due to
any other reason, it may render some accounts unusable with possibly no way to recover funds._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| magicValue | bytes4 | Must return the bytes4 magic value 0x4b3d1223 (which is a selector of this function) when account status is valid, or revert otherwise. |

