// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.16;

import "./GCapableXrc20Delegate.sol";
import "./EIP20Interface.sol";

/**
 * @notice Compound's Gtroller interface to get G address
 */
interface IGtroller {
    function getGAddress() external view returns (address);

    function claimG(
        address[] calldata holders,
        GToken[] calldata gTokens,
        bool borrowers,
        bool suppliers
    ) external;
}

/**
 * @title Cream's GGToken's Contract
 * @notice GToken which wraps Compound's Ctoken
 * @author Cream
 */
contract GGTokenDelegate is GCapableXrc20Delegate {
    /**
     * @notice The gTroller of Compound's GToken
     */
    address public underlyingGtroller;

    /**
     * @notice Joe token address
     */
    address public joe;

    /**
     * @notice Container for joe rewards state
     * @member balance The balance of joe
     * @member index The last updated index
     */
    struct RewardState {
        uint256 balance;
        uint256 index;
    }

    /**
     * @notice The state of Compound's GToken supply
     */
    RewardState public supplyState;

    /**
     * @notice The index of every Compound's GToken supplier
     */
    mapping(address => uint256) public supplierState;

    /**
     * @notice The joe amount of every user
     */
    mapping(address => uint256) public joeUserAccrued;

    /**
     * @notice Delegate interface to become the implementation
     * @param data The encoded arguments for becoming
     */
    function _becomeImplementation(bytes memory data) public {
        super._becomeImplementation(data);

        underlyingGtroller = address(GToken(underlying).gTroller());
        joe = IGtroller(underlyingGtroller).getGAddress();
    }

    /**
     * @notice Manually claim joe rewards by user
     * @return The amount of joe rewards user claims
     */
    function claimG(address account) public returns (uint256) {
        harvestJoe();

        updateSupplyIndex();
        updateSupplierIndex(account);

        uint256 joeBalance = joeUserAccrued[account];
        if (joeBalance > 0) {
            // Transfer user joe and subtract the balance in supplyState
            EIP20Interface(joe).transfer(account, joeBalance);
            supplyState.balance = sub_(supplyState.balance, joeBalance);

            // Clear user's joe accrued.
            joeUserAccrued[account] = 0;

            return joeBalance;
        }
        return 0;
    }

    /*** GToken Overrides ***/

    /**
     * @notice Transfer `tokens` tokens from `src` to `dst` by `spender`
     * @param spender The address of the account performing the transfer
     * @param src The address of the source account
     * @param dst The address of the destination account
     * @param tokens The number of tokens to transfer
     * @return Whether or not the transfer succeeded
     */
    function transferTokens(
        address spender,
        address src,
        address dst,
        uint256 tokens
    ) internal returns (uint256) {
        harvestJoe();

        updateSupplyIndex();
        updateSupplierIndex(src);
        updateSupplierIndex(dst);

        return super.transferTokens(spender, src, dst, tokens);
    }

    /*** Safe Token ***/

    /**
     * @notice Transfer the underlying to this contract
     * @param from Address to transfer funds from
     * @param amount Amount of underlying to transfer
     * @param isNative The amount is in native or not
     * @return The actual amount that is transferred
     */
    function doTransferIn(
        address from,
        uint256 amount,
        bool isNative
    ) internal returns (uint256) {
        uint256 transferredIn = super.doTransferIn(from, amount, isNative);

        harvestJoe();
        updateSupplyIndex();
        updateSupplierIndex(from);

        return transferredIn;
    }

    /**
     * @notice Transfer the underlying from this contract
     * @param to Address to transfer funds to
     * @param amount Amount of underlying to transfer
     * @param isNative The amount is in native or not
     */
    function doTransferOut(
        address payable to,
        uint256 amount,
        bool isNative
    ) internal {
        harvestJoe();
        updateSupplyIndex();
        updateSupplierIndex(to);

        super.doTransferOut(to, amount, isNative);
    }

    /*** Internal functions ***/

    function harvestJoe() internal {
        address[] memory holders = new address[](1);
        holders[0] = address(this);
        GToken[] memory gTokens = new GToken[](1);
        gTokens[0] = GToken(underlying);

        // JGToken contract will never borrow assets from Compound.
        IGtroller(underlyingGtroller).claimG(holders, gTokens, false, true);
    }

    function updateSupplyIndex() internal {
        uint256 joeAccrued = sub_(joeBalance(), supplyState.balance);
        uint256 supplyTokens = GToken(address(this)).totalSupply();
        Double memory ratio = supplyTokens > 0 ? fraction(joeAccrued, supplyTokens) : Double({mantissa: 0});
        Double memory index = add_(Double({mantissa: supplyState.index}), ratio);

        // Update supplyState.
        supplyState.index = index.mantissa;
        supplyState.balance = joeBalance();
    }

    function updateSupplierIndex(address supplier) internal {
        Double memory supplyIndex = Double({mantissa: supplyState.index});
        Double memory supplierIndex = Double({mantissa: supplierState[supplier]});
        Double memory deltaIndex = sub_(supplyIndex, supplierIndex);
        if (deltaIndex.mantissa > 0) {
            uint256 supplierTokens = GToken(address(this)).balanceOf(supplier);
            uint256 supplierDelta = mul_(supplierTokens, deltaIndex);
            joeUserAccrued[supplier] = add_(joeUserAccrued[supplier], supplierDelta);
            supplierState[supplier] = supplyIndex.mantissa;
        }
    }

    function joeBalance() internal view returns (uint256) {
        return EIP20Interface(joe).balanceOf(address(this));
    }
}
