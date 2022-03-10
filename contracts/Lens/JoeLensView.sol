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
        address jToken;
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
        uint256 jTokenDecimals;
        uint256 underlyingDecimals;
        GtrollerV1Storage.Version version;
        uint256 collateralCap;
        uint256 underlyingPrice;
        bool supplyPaused;
        bool borrowPaused;
        uint256 supplyCap;
        uint256 borrowCap;
    }

    function jTokenMetadataAll(GToken[] calldata jTokens) external view returns (GTokenMetadata[] memory) {
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

    function jTokenMetadata(GToken jToken) public view returns (GTokenMetadata memory) {
        Gtroller gTroller = Gtroller(address(jToken.gTroller()));
        PriceOracle priceOracle = gTroller.oracle();
        return jTokenMetadataInternal(jToken, gTroller, priceOracle);
    }

    function jTokenMetadataInternal(
        GToken jToken,
        Gtroller gTroller,
        PriceOracle priceOracle
    ) internal view returns (GTokenMetadata memory) {
        uint256 exchangeRateStored = jToken.exchangeRateStored();
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

        return
            GTokenMetadata({
                jToken: address(jToken),
                exchangeRateStored: exchangeRateStored,
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
                borrowCap: gTroller.borrowCaps(address(jToken))
            });
    }

    /*** Account GToken info functions ***/

    struct GTokenBalances {
        address jToken;
        uint256 jTokenBalance; // Same as collateral balance - the number of jTokens held
        uint256 balanceOfUnderlyingStored; // Balance of underlying asset supplied by. Accrue interest is not called.
        uint256 supplyValueUSD;
        uint256 collateralValueUSD; // This is supplyValueUSD multiplied by collateral factor
        uint256 borrowBalanceStored; // Borrow balance without accruing interest
        uint256 borrowValueUSD;
        uint256 underlyingTokenBalance; // Underlying balance current held in user's wallet
        uint256 underlyingTokenAllowance;
        bool collateralEnabled;
    }

    function jTokenBalancesAll(GToken[] memory jTokens, address account) public view returns (GTokenBalances[] memory) {
        uint256 jTokenCount = jTokens.length;
        GTokenBalances[] memory res = new GTokenBalances[](jTokenCount);
        for (uint256 i = 0; i < jTokenCount; i++) {
            res[i] = jTokenBalances(jTokens[i], account);
        }
        return res;
    }

    function jTokenBalances(GToken jToken, address account) public view returns (GTokenBalances memory) {
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

        uint256 exchangeRateStored;
        (, vars.jTokenBalance, vars.borrowBalanceStored, exchangeRateStored) = jToken.getAccountSnapshot(account);

        Exp memory exchangeRate = Exp({mantissa: exchangeRateStored});
        vars.balanceOfUnderlyingStored = mul_ScalarTruncate(exchangeRate, vars.jTokenBalance);
        PriceOracle priceOracle = gTroller.oracle();
        uint256 underlyingPrice = priceOracle.getUnderlyingPrice(jToken);

        (, uint256 collateralFactorMantissa, ) = gTroller.markets(address(jToken));

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

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
