// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../GXrc20.sol";
import "../Gtroller.sol";
import "../GToken.sol";
import "../PriceOracle/PriceOracle.sol";
import "../EIP20Interface.sol";
import "../Exponential.sol";
import "./IRewardLens.sol";

interface JJLPInterface {
    function claimG(address) external returns (uint256);
}

interface JGTokenInterface {
    function claimG(address) external returns (uint256);
}

/**
 * @notice This is a version of JoeLens that contains write transactions.
 * @dev Call these functions as dry-run transactions for the frontend.
 */
contract JoeLens is Exponential {
    string public nativeSymbol;
    address private rewardLensAddress;

    constructor(string memory _nativeSymbol, address _rewardLensAddress) public {
        nativeSymbol = _nativeSymbol;
        rewardLensAddress = _rewardLensAddress;
    }

    /*** Market info functions ***/
    struct GTokenMetadata {
        address jToken;
        uint256 exchangeRateCurrent;
        uint256 supplyRatePerSecond;
        uint256 borrowRatePerSecond;
        uint256 reserveFactorMantissa;
        uint256 totalBorrows;
        uint256 totalReserves;
        uint256 totalSupply;
        uint256 totalCash;
        uint256 totalCollateralTokens;
        bool isListed;
        uint256 collateralFactorMantissa;
        address underlyingAssetAddress;
        uint256 jTokenDecimals;
        uint256 underlyingDecimals;
        GtrollerV1Storage.Version version;
        uint256 collateralCap;
        uint256 underlyingPrice;
        bool supplyPaused;
        bool borrowPaused;
        uint256 supplyCap;
        uint256 borrowCap;
        uint256 supplyJoeRewardsPerSecond;
        uint256 borrowJoeRewardsPerSecond;
        uint256 supplyAvaxRewardsPerSecond;
        uint256 borrowAvaxRewardsPerSecond;
    }

    function jTokenMetadataAll(GToken[] calldata jTokens) external returns (GTokenMetadata[] memory) {
        uint256 jTokenCount = jTokens.length;
        require(jTokenCount > 0, "invalid input");
        GTokenMetadata[] memory res = new GTokenMetadata[](jTokenCount);
        Gtroller gTroller = Gtroller(address(jTokens[0].gTroller()));
        PriceOracle priceOracle = gTroller.oracle();
        for (uint256 i = 0; i < jTokenCount; i++) {
            require(address(gTroller) == address(jTokens[i].gTroller()), "mismatch gTroller");
            res[i] = jTokenMetadataInternal(jTokens[i], gTroller, priceOracle);
        }
        return res;
    }

    function jTokenMetadata(GToken jToken) public returns (GTokenMetadata memory) {
        Gtroller gTroller = Gtroller(address(jToken.gTroller()));
        PriceOracle priceOracle = gTroller.oracle();
        return jTokenMetadataInternal(jToken, gTroller, priceOracle);
    }

    function jTokenMetadataInternal(
        GToken jToken,
        Gtroller gTroller,
        PriceOracle priceOracle
    ) internal returns (GTokenMetadata memory) {
        (bool isListed, uint256 collateralFactorMantissa, GtrollerV1Storage.Version version) = gTroller.markets(
            address(jToken)
        );
        address underlyingAssetAddress;
        uint256 underlyingDecimals;
        uint256 collateralCap;
        uint256 totalCollateralTokens;

        if (compareStrings(jToken.symbol(), nativeSymbol)) {
            underlyingAssetAddress = address(0);
            underlyingDecimals = 18;
        } else {
            GXrc20 jErc20 = GXrc20(address(jToken));
            underlyingAssetAddress = jErc20.underlying();
            underlyingDecimals = EIP20Interface(jErc20.underlying()).decimals();
        }

        if (version == GtrollerV1Storage.Version.COLLATERALCAP) {
            collateralCap = GCollateralCapXrc20Interface(address(jToken)).collateralCap();
            totalCollateralTokens = GCollateralCapXrc20Interface(address(jToken)).totalCollateralTokens();
        }

        IRewardLens.MarketRewards memory jTokenRewards = IRewardLens(rewardLensAddress).allMarketRewards(
            address(jToken)
        );

        return
            GTokenMetadata({
                jToken: address(jToken),
                exchangeRateCurrent: jToken.exchangeRateCurrent(),
                supplyRatePerSecond: jToken.supplyRatePerSecond(),
                borrowRatePerSecond: jToken.borrowRatePerSecond(),
                reserveFactorMantissa: jToken.reserveFactorMantissa(),
                totalBorrows: jToken.totalBorrows(),
                totalReserves: jToken.totalReserves(),
                totalSupply: jToken.totalSupply(),
                totalCash: jToken.getCash(),
                totalCollateralTokens: totalCollateralTokens,
                isListed: isListed,
                collateralFactorMantissa: collateralFactorMantissa,
                underlyingAssetAddress: underlyingAssetAddress,
                jTokenDecimals: jToken.decimals(),
                underlyingDecimals: underlyingDecimals,
                version: version,
                collateralCap: collateralCap,
                underlyingPrice: priceOracle.getUnderlyingPrice(jToken),
                supplyPaused: gTroller.mintGuardianPaused(address(jToken)),
                borrowPaused: gTroller.borrowGuardianPaused(address(jToken)),
                supplyCap: gTroller.supplyCaps(address(jToken)),
                borrowCap: gTroller.borrowCaps(address(jToken)),
                supplyJoeRewardsPerSecond: jTokenRewards.supplyRewardsJoePerSec,
                borrowJoeRewardsPerSecond: jTokenRewards.borrowRewardsJoePerSec,
                supplyAvaxRewardsPerSecond: jTokenRewards.supplyRewardsAvaxPerSec,
                borrowAvaxRewardsPerSecond: jTokenRewards.borrowRewardsAvaxPerSec
            });
    }

    /*** Account GToken info functions ***/

    struct GTokenBalances {
        address jToken;
        uint256 jTokenBalance; // Same as collateral balance - the number of jTokens held
        uint256 balanceOfUnderlyingCurrent; // Balance of underlying asset supplied by. Accrue interest is not called.
        uint256 supplyValueUSD;
        uint256 collateralValueUSD; // This is supplyValueUSD multiplied by collateral factor
        uint256 borrowBalanceCurrent; // Borrow balance without accruing interest
        uint256 borrowValueUSD;
        uint256 underlyingTokenBalance; // Underlying balance current held in user's wallet
        uint256 underlyingTokenAllowance;
        bool collateralEnabled;
    }

    function jTokenBalancesAll(GToken[] memory jTokens, address account) public returns (GTokenBalances[] memory) {
        uint256 jTokenCount = jTokens.length;
        GTokenBalances[] memory res = new GTokenBalances[](jTokenCount);
        for (uint256 i = 0; i < jTokenCount; i++) {
            res[i] = jTokenBalances(jTokens[i], account);
        }
        return res;
    }

    function jTokenBalances(GToken jToken, address account) public returns (GTokenBalances memory) {
        GTokenBalances memory vars;
        Gtroller gTroller = Gtroller(address(jToken.gTroller()));

        vars.jToken = address(jToken);
        vars.collateralEnabled = gTroller.checkMembership(account, jToken);

        if (compareStrings(jToken.symbol(), nativeSymbol)) {
            vars.underlyingTokenBalance = account.balance;
            vars.underlyingTokenAllowance = account.balance;
        } else {
            GXrc20 jErc20 = GXrc20(address(jToken));
            EIP20Interface underlying = EIP20Interface(jErc20.underlying());
            vars.underlyingTokenBalance = underlying.balanceOf(account);
            vars.underlyingTokenAllowance = underlying.allowance(account, address(jToken));
        }

        vars.jTokenBalance = jToken.balanceOf(account);
        vars.borrowBalanceCurrent = jToken.borrowBalanceCurrent(account);

        vars.balanceOfUnderlyingCurrent = jToken.balanceOfUnderlying(account);
        PriceOracle priceOracle = gTroller.oracle();
        uint256 underlyingPrice = priceOracle.getUnderlyingPrice(jToken);

        (, uint256 collateralFactorMantissa, ) = gTroller.markets(address(jToken));

        Exp memory supplyValueInUnderlying = Exp({mantissa: vars.balanceOfUnderlyingCurrent});
        vars.supplyValueUSD = mul_ScalarTruncate(supplyValueInUnderlying, underlyingPrice);

        Exp memory collateralFactor = Exp({mantissa: collateralFactorMantissa});
        vars.collateralValueUSD = mul_ScalarTruncate(collateralFactor, vars.supplyValueUSD);

        Exp memory borrowBalance = Exp({mantissa: vars.borrowBalanceCurrent});
        vars.borrowValueUSD = mul_ScalarTruncate(borrowBalance, underlyingPrice);

        return vars;
    }

    struct AccountLimits {
        GToken[] markets;
        uint256 liquidity;
        uint256 shortfall;
        uint256 totalCollateralValueUSD;
        uint256 totalBorrowValueUSD;
        uint256 healthFactor;
    }

    function getAccountLimits(Gtroller gTroller, address account) public returns (AccountLimits memory) {
        AccountLimits memory vars;
        uint256 errorCode;

        (errorCode, vars.liquidity, vars.shortfall) = gTroller.getAccountLiquidity(account);
        require(errorCode == 0, "Can't get account liquidity");

        vars.markets = gTroller.getAssetsIn(account);
        GTokenBalances[] memory jTokenBalancesList = jTokenBalancesAll(vars.markets, account);
        for (uint256 i = 0; i < jTokenBalancesList.length; i++) {
            vars.totalCollateralValueUSD = add_(vars.totalCollateralValueUSD, jTokenBalancesList[i].collateralValueUSD);
            vars.totalBorrowValueUSD = add_(vars.totalBorrowValueUSD, jTokenBalancesList[i].borrowValueUSD);
        }

        Exp memory totalBorrows = Exp({mantissa: vars.totalBorrowValueUSD});

        vars.healthFactor = vars.totalCollateralValueUSD == 0 ? 0 : vars.totalBorrowValueUSD > 0
            ? div_(vars.totalCollateralValueUSD, totalBorrows)
            : 100;

        return vars;
    }

    function getClaimableRewards(
        uint8 rewardType,
        address gTroller,
        address joe,
        address payable account
    ) external returns (uint256) {
        require(rewardType <= 1, "rewardType is invalid");
        if (rewardType == 0) {
            uint256 balanceBefore = EIP20Interface(joe).balanceOf(account);
            Gtroller(gTroller).claimReward(0, account);
            uint256 balanceAfter = EIP20Interface(joe).balanceOf(account);
            return sub_(balanceAfter, balanceBefore);
        } else if (rewardType == 1) {
            uint256 balanceBefore = account.balance;
            Gtroller(gTroller).claimReward(1, account);
            uint256 balanceAfter = account.balance;
            return sub_(balanceAfter, balanceBefore);
        }
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
