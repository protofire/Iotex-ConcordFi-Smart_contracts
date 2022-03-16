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
        address gToken;
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
        uint256 gTokenDecimals;
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

    function gTokenMetadataAll(GToken[] calldata gTokens) external returns (GTokenMetadata[] memory) {
        uint256 gTokenCount = gTokens.length;
        require(gTokenCount > 0, "invalid input");
        GTokenMetadata[] memory res = new GTokenMetadata[](gTokenCount);
        Gtroller gTroller = Gtroller(address(gTokens[0].gTroller()));
        PriceOracle priceOracle = gTroller.oracle();
        for (uint256 i = 0; i < gTokenCount; i++) {
            require(address(gTroller) == address(gTokens[i].gTroller()), "mismatch gTroller");
            res[i] = gTokenMetadataInternal(gTokens[i], gTroller, priceOracle);
        }
        return res;
    }

    function gTokenMetadata(GToken gToken) public returns (GTokenMetadata memory) {
        Gtroller gTroller = Gtroller(address(gToken.gTroller()));
        PriceOracle priceOracle = gTroller.oracle();
        return gTokenMetadataInternal(gToken, gTroller, priceOracle);
    }

    function gTokenMetadataInternal(
        GToken gToken,
        Gtroller gTroller,
        PriceOracle priceOracle
    ) internal returns (GTokenMetadata memory) {
        (bool isListed, uint256 collateralFactorMantissa, GtrollerV1Storage.Version version) = gTroller.markets(
            address(gToken)
        );
        address underlyingAssetAddress;
        uint256 underlyingDecimals;
        uint256 collateralCap;
        uint256 totalCollateralTokens;

        if (compareStrings(gToken.symbol(), nativeSymbol)) {
            underlyingAssetAddress = address(0);
            underlyingDecimals = 18;
        } else {
            GXrc20 jErc20 = GXrc20(address(gToken));
            underlyingAssetAddress = jErc20.underlying();
            underlyingDecimals = EIP20Interface(jErc20.underlying()).decimals();
        }

        if (version == GtrollerV1Storage.Version.COLLATERALCAP) {
            collateralCap = GCollateralCapXrc20Interface(address(gToken)).collateralCap();
            totalCollateralTokens = GCollateralCapXrc20Interface(address(gToken)).totalCollateralTokens();
        }

        IRewardLens.MarketRewards memory gTokenRewards = IRewardLens(rewardLensAddress).allMarketRewards(
            address(gToken)
        );

        return
            GTokenMetadata({
                gToken: address(gToken),
                exchangeRateCurrent: gToken.exchangeRateCurrent(),
                supplyRatePerSecond: gToken.supplyRatePerSecond(),
                borrowRatePerSecond: gToken.borrowRatePerSecond(),
                reserveFactorMantissa: gToken.reserveFactorMantissa(),
                totalBorrows: gToken.totalBorrows(),
                totalReserves: gToken.totalReserves(),
                totalSupply: gToken.totalSupply(),
                totalCash: gToken.getCash(),
                totalCollateralTokens: totalCollateralTokens,
                isListed: isListed,
                collateralFactorMantissa: collateralFactorMantissa,
                underlyingAssetAddress: underlyingAssetAddress,
                gTokenDecimals: gToken.decimals(),
                underlyingDecimals: underlyingDecimals,
                version: version,
                collateralCap: collateralCap,
                underlyingPrice: priceOracle.getUnderlyingPrice(gToken),
                supplyPaused: gTroller.mintGuardianPaused(address(gToken)),
                borrowPaused: gTroller.borrowGuardianPaused(address(gToken)),
                supplyCap: gTroller.supplyCaps(address(gToken)),
                borrowCap: gTroller.borrowCaps(address(gToken)),
                supplyJoeRewardsPerSecond: gTokenRewards.supplyRewardsJoePerSec,
                borrowJoeRewardsPerSecond: gTokenRewards.borrowRewardsJoePerSec,
                supplyAvaxRewardsPerSecond: gTokenRewards.supplyRewardsAvaxPerSec,
                borrowAvaxRewardsPerSecond: gTokenRewards.borrowRewardsAvaxPerSec
            });
    }

    /*** Account GToken info functions ***/

    struct GTokenBalances {
        address gToken;
        uint256 gTokenBalance; // Same as collateral balance - the number of gTokens held
        uint256 balanceOfUnderlyingCurrent; // Balance of underlying asset supplied by. Accrue interest is not called.
        uint256 supplyValueUSD;
        uint256 collateralValueUSD; // This is supplyValueUSD multiplied by collateral factor
        uint256 borrowBalanceCurrent; // Borrow balance without accruing interest
        uint256 borrowValueUSD;
        uint256 underlyingTokenBalance; // Underlying balance current held in user's wallet
        uint256 underlyingTokenAllowance;
        bool collateralEnabled;
    }

    function gTokenBalancesAll(GToken[] memory gTokens, address account) public returns (GTokenBalances[] memory) {
        uint256 gTokenCount = gTokens.length;
        GTokenBalances[] memory res = new GTokenBalances[](gTokenCount);
        for (uint256 i = 0; i < gTokenCount; i++) {
            res[i] = gTokenBalances(gTokens[i], account);
        }
        return res;
    }

    function gTokenBalances(GToken gToken, address account) public returns (GTokenBalances memory) {
        GTokenBalances memory vars;
        Gtroller gTroller = Gtroller(address(gToken.gTroller()));

        vars.gToken = address(gToken);
        vars.collateralEnabled = gTroller.checkMembership(account, gToken);

        if (compareStrings(gToken.symbol(), nativeSymbol)) {
            vars.underlyingTokenBalance = account.balance;
            vars.underlyingTokenAllowance = account.balance;
        } else {
            GXrc20 jErc20 = GXrc20(address(gToken));
            EIP20Interface underlying = EIP20Interface(jErc20.underlying());
            vars.underlyingTokenBalance = underlying.balanceOf(account);
            vars.underlyingTokenAllowance = underlying.allowance(account, address(gToken));
        }

        vars.gTokenBalance = gToken.balanceOf(account);
        vars.borrowBalanceCurrent = gToken.borrowBalanceCurrent(account);

        vars.balanceOfUnderlyingCurrent = gToken.balanceOfUnderlying(account);
        PriceOracle priceOracle = gTroller.oracle();
        uint256 underlyingPrice = priceOracle.getUnderlyingPrice(gToken);

        (, uint256 collateralFactorMantissa, ) = gTroller.markets(address(gToken));

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
        GTokenBalances[] memory gTokenBalancesList = gTokenBalancesAll(vars.markets, account);
        for (uint256 i = 0; i < gTokenBalancesList.length; i++) {
            vars.totalCollateralValueUSD = add_(vars.totalCollateralValueUSD, gTokenBalancesList[i].collateralValueUSD);
            vars.totalBorrowValueUSD = add_(vars.totalBorrowValueUSD, gTokenBalancesList[i].borrowValueUSD);
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
