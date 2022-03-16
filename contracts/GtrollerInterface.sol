// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.16;

import "./GToken.sol";
import "./GtrollerStorage.sol";

contract GtrollerInterface {
    /// @notice Indicator that this is a Gtroller contract (for inspection)
    bool public constant isGtroller = true;

    /*** Assets You Are In ***/

    function enterMarkets(address[] calldata gTokens) external returns (uint256[] memory);

    function exitMarket(address gToken) external returns (uint256);

    /*** Policy Hooks ***/

    function mintAllowed(
        address gToken,
        address minter,
        uint256 mintAmount
    ) external returns (uint256);

    function mintVerify(
        address gToken,
        address minter,
        uint256 mintAmount,
        uint256 mintTokens
    ) external;

    function redeemAllowed(
        address gToken,
        address redeemer,
        uint256 redeemTokens
    ) external returns (uint256);

    function redeemVerify(
        address gToken,
        address redeemer,
        uint256 redeemAmount,
        uint256 redeemTokens
    ) external;

    function borrowAllowed(
        address gToken,
        address borrower,
        uint256 borrowAmount
    ) external returns (uint256);

    function borrowVerify(
        address gToken,
        address borrower,
        uint256 borrowAmount
    ) external;

    function repayBorrowAllowed(
        address gToken,
        address payer,
        address borrower,
        uint256 repayAmount
    ) external returns (uint256);

    function repayBorrowVerify(
        address gToken,
        address payer,
        address borrower,
        uint256 repayAmount,
        uint256 borrowerIndex
    ) external;

    function liquidateBorrowAllowed(
        address gTokenBorrowed,
        address gTokenCollateral,
        address liquidator,
        address borrower,
        uint256 repayAmount
    ) external returns (uint256);

    function liquidateBorrowVerify(
        address gTokenBorrowed,
        address gTokenCollateral,
        address liquidator,
        address borrower,
        uint256 repayAmount,
        uint256 seizeTokens
    ) external;

    function seizeAllowed(
        address gTokenCollateral,
        address gTokenBorrowed,
        address liquidator,
        address borrower,
        uint256 seizeTokens
    ) external returns (uint256);

    function seizeVerify(
        address gTokenCollateral,
        address gTokenBorrowed,
        address liquidator,
        address borrower,
        uint256 seizeTokens
    ) external;

    function transferAllowed(
        address gToken,
        address src,
        address dst,
        uint256 transferTokens
    ) external returns (uint256);

    function transferVerify(
        address gToken,
        address src,
        address dst,
        uint256 transferTokens
    ) external;

    /*** Liquidity/Liquidation Calculations ***/

    function liquidateCalculateSeizeTokens(
        address gTokenBorrowed,
        address gTokenCollateral,
        uint256 repayAmount
    ) external view returns (uint256, uint256);
}

interface GtrollerInterfaceExtension {
    function checkMembership(address account, GToken gToken) external view returns (bool);

    function updateGTokenVersion(address gToken, GtrollerV1Storage.Version version) external;

    function flashloanAllowed(
        address gToken,
        address receiver,
        uint256 amount,
        bytes calldata params
    ) external view returns (bool);
}
