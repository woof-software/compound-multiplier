// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.30;

/// @title IMorpho
/// @author Morpho Labs
/// @custom:contact security@morpho.org
/// @dev Use this interface for Morpho to have access to all the functions with the appropriate function signatures.
interface IMorpho {
    function flashLoan(address token, uint256 assets, bytes calldata data) external;
}
