// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.16;

import "./GWrappedNative.sol";

/**
 * @title Cream's GWrappedNativeDelegate Contract
 * @notice GTokens which wrap an EIP-20 underlying and are delegated to
 * @author Cream
 */
contract GWrappedNativeDelegate is GWrappedNative {
    /**
     * @notice Construct an empty delegate
     */
    constructor() public {}

    /**
     * @notice Called by the delegator on a delegate to initialize it for duty
     * @param data The encoded bytes data for any initialization
     */
    function _becomeImplementation(bytes memory data) public {
        // Shh -- currently unused
        data;

        // Shh -- we don't ever want this hook to be marked pure
        if (false) {
            implementation = address(0);
        }

        require(msg.sender == admin, "only the admin may call _becomeImplementation");

        // Set GToken version in gTroller and convert native token to wrapped token.
        GtrollerInterfaceExtension(address(gTroller)).updateGTokenVersion(
            address(this),
            GtrollerV1Storage.Version.WRAPPEDNATIVE
        );
        uint256 balance = address(this).balance;
        if (balance > 0) {
            WrappedNativeInterface(underlying).deposit.value(balance)();
        }
    }

    /**
     * @notice Called by the delegator on a delegate to forfeit its responsibility
     */
    function _resignImplementation() public {
        // Shh -- we don't ever want this hook to be marked pure
        if (false) {
            implementation = address(0);
        }

        require(msg.sender == admin, "only the admin may call _resignImplementation");
    }
}
