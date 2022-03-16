// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.16;

import "../GToken.sol";

contract PriceOracle {
    /**
     * @notice Get the underlying price of a gToken asset
     * @param gToken The gToken to get the underlying price of
     * @return The underlying asset price mantissa (scaled by 1e18).
     *  Zero means the price is unavailable.
     */
    function getUnderlyingPrice(GToken gToken) external view returns (uint256);
}
