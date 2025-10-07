// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

/**
 * @title IAllowBySig
 */
interface IAllowBySig {
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
        uint8 v;
    }
}
