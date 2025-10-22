pragma solidity =0.8.30;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICometFoundation {
    /**
     * @notice Sweeps all of a given token from the contract to the treasury
     * @param token The ERC20 token to sweep
     */
    function rescue(IERC20 token) external;

    /**
     * @notice Returns the address of the Wrapped ETH (WETH) token
     * @return Address of the WETH token
     */
    function wEth() external view returns (address);

    /**
     * @notice Returns the address of the treasury
     * @return Address of the treasury
     */
    function treasury() external view returns (address);
}
