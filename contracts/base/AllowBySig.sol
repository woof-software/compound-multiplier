// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IComet } from "../interfaces/IComet.sol";

/**
 * @title AllowBySig
 * @author Woof Software
 * @notice This contract provides a mechanism for allowing actions by signature.
 *  It enables a user to authorize a manager to perform actions on their behalf.
 *  This contract allows to avoid multiple transactions.
 */
abstract contract AllowBySig {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Structure defines the parameters required for make approval via signature on comet
     * @param owner The address that signed the signature
     * @param manager The address to authorize (or rescind authorization from)
     * @param isAllowed_ Whether to authorize or rescind authorization from manager
     * @param nonce The next expected nonce value for the signatory
     * @param expiry Expiration time for the signature
     * @param v The recovery byte of the signature
     * @param r Half of the ECDSA signature pair
     * @param s Half of the ECDSA signature pair
     */
    struct AllowParams {
        uint256 nonce;
        uint256 expiry;
        bytes32 r;
        bytes32 s;
        address owner;
        bool isAllowed;
        address manager;
        uint8 v;
    }

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @dev Thrown when the manager is invalid
    error InvalidManager();
    /// @dev Thrown when the owner is invalid
    error InvalidOwner();
    /// @dev Thrown when the allowed type is invalid
    error InvalidAllowedType();

    /*//////////////////////////////////////////////////////////////
                                FUNCTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Allows a manager to perform actions on behalf of an owner via signature
     * @param params The parameters required for the allowance
     * @param comet The address of the Comet contract
     */
    function _allowBySig(AllowParams calldata params, address comet) internal {
        address manager = params.manager;
        address owner = params.owner;
        bool isAllowed = params.isAllowed;

        require(manager == address(this), InvalidManager());
        require(owner == msg.sender, InvalidOwner());
        require(isAllowed == true, InvalidAllowedType());

        IComet(comet).allowBySig(owner, manager, isAllowed, params.nonce, params.expiry, params.v, params.r, params.s);
    }
}
