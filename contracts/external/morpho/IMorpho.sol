// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IMorpho
/// @author Morpho Labs
/// @custom:contact security@morpho.org
/// @dev Use this interface for Morpho to have access to all the functions with the appropriate function signatures.
interface IMorpho {
    function flashLoan(IERC20 token, uint256 assets, bytes calldata data) external;
}
