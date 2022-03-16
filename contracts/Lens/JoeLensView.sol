// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../GXrc20.sol";
import "../Gtroller.sol";
import "../GToken.sol";
import "../PriceOracle/PriceOracle.sol";
import "../EIP20Interface.sol";
import "../Exponential.sol";

interface JJLPInterface {
    function claimG(address) external returns (uint256);
}

interface JGTokenInterface {
    function claimG(address) external returns (uint256);
}

/**
 * @notice This is a version of JoeLens that only contains view functions.
 */
contract JoeLensView is Exponential {
    string public nativeSymbol;

    constructor(string memory _nativeSymbol) public {
        nativeSymbol = _nativeSymbol;
    }

    /*** Market info functions ***/
    struct GTokenMetadata {
        address gToken;
        uint256 exchangeRateStored;
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
    }

    function gTokenMetadataAll(GToken[] calldata gTokens) external view returns (GTokenMetadata[] memory) {
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

    function gTokenMetadata(GToken gToken) public view returns (GTokenMetadata memory) {
        Gtroller gTroller = Gtroller(address(gToken.gTroller()));
        PriceOracle priceOracle = gTroller.oracle();
        return gTokenMetadataInternal(gToken, gTroller, priceOracle);
    }

    function gTokenMetadataInternal(
        GToken gToken,
        Gtroller gTroller,
        PriceOracle priceOracle
    ) internal view returns (GTokenMetadata memory) {
        uint256 exchangeRateStored = gToken.exchangeRateStored();
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

        return
            GTokenMetadata({
                gToken: address(gToken),
                exchangeRateStored: exchangeRateStored,
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
                borrowCap: gTroller.borrowCaps(address(gToken))
            });
    }

    /*** Account GToken info functions ***/

    struct GTokenBalances {
        address gToken;
        uint256 gTokenBalance; // Same as collateral balance - the number of gTokens held
        uint256 balanceOfUnderlyingStored; // Balance of underlying asset supplied by. Accrue interest is not called.
        uint256 supplyValueUSD;
        uint256 collateralValueUSD; // This is supplyValueUSD multiplied by collateral factor
        uint256 borrowBalanceStored; // Borrow balance without accruing interest
        uint256 borrowValueUSD;
        uint256 underlyingTokenBalance; // Underlying balance current held in user's wallet
        uint256 underlyingTokenAllowance;
        bool collateralEnabled;
    }

    function gTokenBalancesAll(GToken[] memory gTokens, address account) public view returns (GTokenBalances[] memory) {
        uint256 gTokenCount = gTokens.length;
        GTokenBalances[] memory res = new GTokenBalances[](gTokenCount);
        for (uint256 i = 0; i < gTokenCount; i++) {
            res[i] = gTokenBalances(gTokens[i], account);
        }
        return res;
    }

    function gTokenBalances(GToken gToken, address account) public view returns (GTokenBalances memory) {
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

        uint256 exchangeRateStored;
        (, vars.gTokenBalance, vars.borrowBalanceStored, exchangeRateStored) = gToken.getAccountSnapshot(account);

        Exp memory exchangeRate = Exp({mantissa: exchangeRateStored});
        vars.balanceOfUnderlyingStored = mul_ScalarTruncate(exchangeRate, vars.gTokenBalance);
        PriceOracle priceOracle = gTroller.oracle();
        uint256 underlyingPrice = priceOracle.getUnderlyingPrice(gToken);

        (, uint256 collateralFactorMantissa, ) = gTroller.markets(address(gToken));

        Exp memory supplyValueInUnderlying = Exp({mantissa: vars.balanceOfUnderlyingStored});
        vars.supplyValueUSD = mul_ScalarTruncate(supplyValueInUnderlying, underlyingPrice);

        Exp memory collateralFactor = Exp({mantissa: collateralFactorMantissa});
        vars.collateralValueUSD = mul_ScalarTruncate(collateralFactor, vars.supplyValueUSD);

        Exp memory borrowBalance = Exp({mantissa: vars.borrowBalanceStored});
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

    function getAccountLimits(Gtroller gTroller, address account) public view returns (AccountLimits memory) {
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

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
