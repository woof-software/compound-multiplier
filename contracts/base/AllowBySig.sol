// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { ICometExt } from "../external/compound/ICometExt.sol";
import { IAllowBySig } from "../interfaces/IAllowBySig.sol";

/**
 * @title AllowBySig
 * @author Woof Software
 * @notice This contract provides a mechanism for allowing actions by signature.
 *  It enables a user to authorize a manager to perform actions on their behalf.
 *  This contract allows to avoid multiple transactions.
 */
abstract contract AllowBySig is IAllowBySig {
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

        ICometExt(comet).allowBySig(
            owner,
            manager,
            isAllowed,
            params.nonce,
            params.expiry,
            params.v,
            params.r,
            params.s
        );
    }
}
