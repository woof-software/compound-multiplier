// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.30;

/**
 * @title Compound's Comet Ext Interface
 * @notice An efficient monolithic money market protocol
 * @author Compound
 */
interface ICometExt {
    function allow(address manager, bool isAllowed) external;

    function allowBySig(
        address owner,
        address manager,
        bool isAllowed,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function isAllowed(address owner, address manager) external view returns (bool);

    function version() external view returns (string memory);

    function name() external view returns (string memory);

    function userNonce(address user) external view returns (uint256);
}
