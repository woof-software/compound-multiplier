// SPDX-License-Identifier: MIT
pragma solidity =0.8.30;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface ICometSwapPlugin is IERC165 {
    function SWAP_SELECTOR() external view returns (bytes4);

    /**
     * @notice Executes a token swap between two assets
     * @param srcToken Address of the source token to swap from
     * @param dstToken Address of the destination token to swap to
     * @param amountIn Amount of source tokens to swap
     * @param config Encoded configuration specific to the swap plugin
     * @param swapData Encoded data required by the underlying swap mechanism
     * @return amountOut The actual amount of destination tokens received from the swap
     */
    function swap(
        address srcToken,
        address dstToken,
        uint256 amountIn,
        bytes calldata config,
        bytes calldata swapData
    ) external returns (uint256 amountOut);
}
