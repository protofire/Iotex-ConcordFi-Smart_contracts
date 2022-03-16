const { avaxUnsigned, avaxMantissa } = require("../Utils/Avalanche");
const {
  makeGtroller,
  makeGToken,
  fastForward,
  quickMint,
  preApprove,
} = require("../Utils/BankerJoe");

const exchangeRate = 50e3;
const mintAmount = avaxUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);

function cullTuple(tuple) {
  return Object.keys(tuple).reduce((acc, key) => {
    if (Number.isNaN(Number(key))) {
      return {
        ...acc,
        [key]: tuple[key],
      };
    } else {
      return acc;
    }
  }, {});
}

async function preMint(gToken, minter, mintAmount, mintTokens, exchangeRate) {
  await preApprove(gToken, minter, mintAmount);
  await send(gToken.gTroller, "setMintAllowed", [true]);
  await send(gToken.gTroller, "setMintVerify", [true]);
  await send(gToken.interestRateModel, "setFailBorrowRate", [false]);
  await send(gToken.underlying, "harnessSetFailTransferFromAddress", [
    minter,
    false,
  ]);
  await send(gToken, "harnessSetBalance", [minter, 0]);
  await send(gToken, "harnessSetExchangeRate", [avaxMantissa(exchangeRate)]);
}

describe("JoeLens", () => {
  let joeLens;
  let acct;

  beforeEach(async () => {
    joeLens = await deploy("JoeLens", ["jAVAX"]);
    acct = accounts[0];
  });

  describe("gTokenMetadata", () => {
    its("returns correct values from reward lens", async () => {
      let rewardLens = await makeRewardLens();
      let jCollateralCapErc20 = await makeGToken({
        kind: "jcollateralcap",
        supportMarket: true,
      });

      await send(rewardLens, "setMarketRewards", [
        jCollateralCapErc20._address,
        1,
        2,
        3,
        4,
      ]);

      expect(
        cullTuple(
          await call(joeLens, "gTokenMetadata", [jCollateralCapErc20._address])
        )
      ).toEqual({
        gToken: jCollateralCapErc20._address,
        exchangeRateCurrent: "1000000000000000000",
        supplyRatePerSecond: "0",
        borrowRatePerSecond: "0",
        reserveFactorMantissa: "0",
        totalBorrows: "0",
        totalReserves: "0",
        totalSupply: "0",
        totalCash: "0",
        totalCollateralTokens: "0",
        isListed: true,
        collateralFactorMantissa: "0",
        underlyingAssetAddress: await call(
          jCollateralCapErc20,
          "underlying",
          []
        ),
        gTokenDecimals: "8",
        underlyingDecimals: "18",
        version: "1",
        collateralCap: "0",
        underlyingPrice: "0",
        supplyPaused: false,
        borrowPaused: false,
        supplyCap: "0",
        borrowCap: "0",
        supplyJoeRewardsPerSecond: "1",
        borrowJoeRewardsPerSecond: "2",
        supplyAvaxRewardsPerSecond: "3",
        borrowAvaxRewardsPerSecond: "4",
      });
    });

    it("is correct for a jErc20", async () => {
      let jErc20 = await makeGToken();
      await send(jErc20.gTroller, "_supportMarket", [jErc20._address, 0]);
      await send(jErc20.gTroller, "_setMarketSupplyCaps", [
        [jErc20._address],
        [100],
      ]);
      await send(jErc20.gTroller, "_setMarketBorrowCaps", [
        [jErc20._address],
        [200],
      ]);
      await send(jErc20.gTroller, "_setMintPaused", [jErc20._address, true]);
      await send(jErc20.gTroller, "_setBorrowPaused", [jErc20._address, true]);
      expect(
        cullTuple(await call(joeLens, "gTokenMetadata", [jErc20._address]))
      ).toEqual({
        gToken: jErc20._address,
        exchangeRateCurrent: "1000000000000000000",
        supplyRatePerSecond: "0",
        borrowRatePerSecond: "0",
        reserveFactorMantissa: "0",
        totalBorrows: "0",
        totalReserves: "0",
        totalSupply: "0",
        totalCash: "0",
        totalCollateralTokens: "0",
        isListed: true,
        collateralFactorMantissa: "0",
        underlyingAssetAddress: await call(jErc20, "underlying", []),
        gTokenDecimals: "8",
        underlyingDecimals: "18",
        version: "0",
        collateralCap: "0",
        underlyingPrice: "0",
        supplyPaused: true,
        borrowPaused: true,
        supplyCap: "100",
        borrowCap: "200",
        supplyJoeRewardsPerSecond: "0",
        borrowJoeRewardsPerSecond: "0",
        supplyAvaxRewardsPerSecond: "0",
        borrowAvaxRewardsPerSecond: "0",
      });
    });

    it("is correct for jAvax", async () => {
      let jAvax = await makeGToken({
        kind: "javax",
      });

      expect(
        cullTuple(await call(joeLens, "gTokenMetadata", [jAvax._address]))
      ).toEqual({
        borrowRatePerSecond: "0",
        gToken: jAvax._address,
        gTokenDecimals: "8",
        collateralFactorMantissa: "0",
        exchangeRateCurrent: "1000000000000000000",
        isListed: false,
        reserveFactorMantissa: "0",
        supplyRatePerSecond: "0",
        totalBorrows: "0",
        totalCash: "0",
        totalReserves: "0",
        totalSupply: "0",
        totalCollateralTokens: "0",
        underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
        underlyingDecimals: "18",
        version: "0",
        collateralCap: "0",
        underlyingPrice: "1000000000000000000",
        supplyPaused: false,
        borrowPaused: false,
        supplyCap: "0",
        borrowCap: "0",
        supplyJoeRewardsPerSecond: "0",
        borrowJoeRewardsPerSecond: "0",
        supplyAvaxRewardsPerSecond: "0",
        borrowAvaxRewardsPerSecond: "0",
      });
    });

    it("is correct for a jCollateralCapErc20", async () => {
      let jCollateralCapErc20 = await makeGToken({
        kind: "jcollateralcap",
        supportMarket: true,
      });
      expect(
        cullTuple(
          await call(joeLens, "gTokenMetadata", [jCollateralCapErc20._address])
        )
      ).toEqual({
        gToken: jCollateralCapErc20._address,
        exchangeRateCurrent: "1000000000000000000",
        supplyRatePerSecond: "0",
        borrowRatePerSecond: "0",
        reserveFactorMantissa: "0",
        totalBorrows: "0",
        totalReserves: "0",
        totalSupply: "0",
        totalCash: "0",
        totalCollateralTokens: "0",
        isListed: true,
        collateralFactorMantissa: "0",
        underlyingAssetAddress: await call(
          jCollateralCapErc20,
          "underlying",
          []
        ),
        gTokenDecimals: "8",
        underlyingDecimals: "18",
        version: "1",
        collateralCap: "0",
        underlyingPrice: "0",
        supplyPaused: false,
        borrowPaused: false,
        supplyCap: "0",
        borrowCap: "0",
        supplyJoeRewardsPerSecond: "0",
        borrowJoeRewardsPerSecond: "0",
        supplyAvaxRewardsPerSecond: "0",
        borrowAvaxRewardsPerSecond: "0",
      });
    });

    it("is correct for a jCollateralCapErc20 with collateral cap", async () => {
      let jCollateralCapErc20 = await makeGToken({
        kind: "jcollateralcap",
        supportMarket: true,
      });
      expect(
        await send(jCollateralCapErc20, "_setCollateralCap", [100])
      ).toSucceed();
      expect(
        cullTuple(
          await call(joeLens, "gTokenMetadata", [jCollateralCapErc20._address])
        )
      ).toEqual({
        gToken: jCollateralCapErc20._address,
        exchangeRateCurrent: "1000000000000000000",
        supplyRatePerSecond: "0",
        borrowRatePerSecond: "0",
        reserveFactorMantissa: "0",
        totalBorrows: "0",
        totalReserves: "0",
        totalSupply: "0",
        totalCash: "0",
        totalCollateralTokens: "0",
        isListed: true,
        collateralFactorMantissa: "0",
        underlyingAssetAddress: await call(
          jCollateralCapErc20,
          "underlying",
          []
        ),
        gTokenDecimals: "8",
        underlyingDecimals: "18",
        version: "1",
        collateralCap: "100",
        underlyingPrice: "0",
        supplyPaused: false,
        borrowPaused: false,
        supplyCap: "0",
        borrowCap: "0",
        supplyJoeRewardsPerSecond: "0",
        borrowJoeRewardsPerSecond: "0",
        supplyAvaxRewardsPerSecond: "0",
        borrowAvaxRewardsPerSecond: "0",
      });
    });

    it("is correct for a jWrappedNative", async () => {
      let jWrappedNative = await makeGToken({
        kind: "jwrapped",
        supportMarket: true,
      });
      expect(
        cullTuple(
          await call(joeLens, "gTokenMetadata", [jWrappedNative._address])
        )
      ).toEqual({
        gToken: jWrappedNative._address,
        exchangeRateCurrent: "1000000000000000000",
        supplyRatePerSecond: "0",
        borrowRatePerSecond: "0",
        reserveFactorMantissa: "0",
        totalBorrows: "0",
        totalReserves: "0",
        totalSupply: "0",
        totalCash: "0",
        totalCollateralTokens: "0",
        isListed: true,
        collateralFactorMantissa: "0",
        underlyingAssetAddress: await call(jWrappedNative, "underlying", []),
        gTokenDecimals: "8",
        underlyingDecimals: "18",
        version: "2",
        collateralCap: "0",
        underlyingPrice: "0",
        supplyPaused: false,
        borrowPaused: false,
        supplyCap: "0",
        borrowCap: "0",
        supplyJoeRewardsPerSecond: "0",
        borrowJoeRewardsPerSecond: "0",
        supplyAvaxRewardsPerSecond: "0",
        borrowAvaxRewardsPerSecond: "0",
      });
    });
  });

  describe("gTokenMetadataAll", () => {
    it("is correct for a jErc20 and jAvax", async () => {
      let gTroller = await makeGtroller();
      let jErc20 = await makeGToken({ gTroller: gTroller });
      let jAvax = await makeGToken({ kind: "javax", gTroller: gTroller });
      let jCollateralCapErc20 = await makeGToken({
        kind: "jcollateralcap",
        supportMarket: true,
        gTroller: gTroller,
      });
      let jWrappedNative = await makeGToken({
        kind: "jwrapped",
        supportMarket: true,
        gTroller: gTroller,
      });
      expect(
        await send(jCollateralCapErc20, "_setCollateralCap", [100])
      ).toSucceed();
      expect(
        (
          await call(joeLens, "gTokenMetadataAll", [
            [
              jErc20._address,
              jAvax._address,
              jCollateralCapErc20._address,
              jWrappedNative._address,
            ],
          ])
        ).map(cullTuple)
      ).toEqual([
        {
          gToken: jErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerSecond: "0",
          borrowRatePerSecond: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          totalCollateralTokens: "0",
          isListed: false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(jErc20, "underlying", []),
          gTokenDecimals: "8",
          underlyingDecimals: "18",
          version: "0",
          collateralCap: "0",
          underlyingPrice: "0",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0",
          supplyJoeRewardsPerSecond: "0",
          borrowJoeRewardsPerSecond: "0",
          supplyAvaxRewardsPerSecond: "0",
          borrowAvaxRewardsPerSecond: "0",
        },
        {
          borrowRatePerSecond: "0",
          gToken: jAvax._address,
          gTokenDecimals: "8",
          collateralFactorMantissa: "0",
          exchangeRateCurrent: "1000000000000000000",
          isListed: false,
          reserveFactorMantissa: "0",
          supplyRatePerSecond: "0",
          totalBorrows: "0",
          totalCash: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCollateralTokens: "0",
          underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
          underlyingDecimals: "18",
          version: "0",
          collateralCap: "0",
          underlyingPrice: "1000000000000000000",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0",
          supplyJoeRewardsPerSecond: "0",
          borrowJoeRewardsPerSecond: "0",
          supplyAvaxRewardsPerSecond: "0",
          borrowAvaxRewardsPerSecond: "0",
        },
        {
          borrowRatePerSecond: "0",
          gToken: jCollateralCapErc20._address,
          gTokenDecimals: "8",
          collateralFactorMantissa: "0",
          exchangeRateCurrent: "1000000000000000000",
          isListed: true,
          reserveFactorMantissa: "0",
          supplyRatePerSecond: "0",
          totalBorrows: "0",
          totalCash: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCollateralTokens: "0",
          underlyingAssetAddress: await call(
            jCollateralCapErc20,
            "underlying",
            []
          ),
          underlyingDecimals: "18",
          version: "1",
          collateralCap: "100",
          underlyingPrice: "0",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0",
          supplyJoeRewardsPerSecond: "0",
          borrowJoeRewardsPerSecond: "0",
          supplyAvaxRewardsPerSecond: "0",
          borrowAvaxRewardsPerSecond: "0",
        },
        {
          gToken: jWrappedNative._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerSecond: "0",
          borrowRatePerSecond: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          totalCollateralTokens: "0",
          isListed: true,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(jWrappedNative, "underlying", []),
          gTokenDecimals: "8",
          underlyingDecimals: "18",
          version: "2",
          collateralCap: "0",
          underlyingPrice: "0",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0",
          supplyJoeRewardsPerSecond: "0",
          borrowJoeRewardsPerSecond: "0",
          supplyAvaxRewardsPerSecond: "0",
          borrowAvaxRewardsPerSecond: "0",
        },
      ]);
    });

    it("fails for mismatch gTroller", async () => {
      let gTroller = await makeGtroller();
      let gTroller2 = await makeGtroller();
      let jErc20 = await makeGToken({ gTroller: gTroller });
      let jAvax = await makeGToken({ kind: "javax", gTroller: gTroller });
      let jCollateralCapErc20 = await makeGToken({
        kind: "jcollateralcap",
        supportMarket: true,
        gTroller: gTroller2,
      }); // different gTroller
      let jWrappedNative = await makeGToken({
        kind: "jwrapped",
        supportMarket: true,
        gTroller: gTroller2,
      }); // different gTroller
      await expect(
        call(joeLens, "gTokenMetadataAll", [
          [
            jErc20._address,
            jAvax._address,
            jCollateralCapErc20._address,
            jWrappedNative._address,
          ],
        ])
      ).rejects.toRevert("revert mismatch gTroller");
    });

    it("fails for invalid input", async () => {
      await expect(call(joeLens, "gTokenMetadataAll", [[]])).rejects.toRevert(
        "revert invalid input"
      );
    });
  });

  describe("gTokenBalances", () => {
    it("is correct for jERC20", async () => {
      let jErc20 = await makeGToken();
      let avaxBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(
          await call(joeLens, "gTokenBalances", [jErc20._address, acct], {
            gasPrice: "0",
          })
        )
      ).toEqual({
        gTokenBalance: "0",
        balanceOfUnderlyingCurrent: "0",
        borrowBalanceCurrent: "0",
        borrowValueUSD: "0",
        gToken: jErc20._address,
        underlyingTokenAllowance: "0",
        underlyingTokenBalance: "10000000000000000000000000",
        collateralEnabled: false,
        supplyValueUSD: "0",
        collateralValueUSD: "0",
      });
    });

    it("is correct for jAVAX", async () => {
      let jAvax = await makeGToken({ kind: "javax" });
      let avaxBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(
          await call(joeLens, "gTokenBalances", [jAvax._address, acct], {
            gasPrice: "0",
          })
        )
      ).toEqual({
        gTokenBalance: "0",
        balanceOfUnderlyingCurrent: "0",
        borrowBalanceCurrent: "0",
        borrowValueUSD: "0",
        gToken: jAvax._address,
        underlyingTokenAllowance: avaxBalance,
        underlyingTokenBalance: avaxBalance,
        collateralEnabled: false,
        supplyValueUSD: "0",
        collateralValueUSD: "0",
      });
    });

    it("is correct for jCollateralCapErc20", async () => {
      let jCollateralCapErc20 = await makeGToken({
        kind: "jcollateralcap",
        gTrollerOpts: { kind: "bool" },
      });
      await send(jCollateralCapErc20, "harnessSetBalance", [acct, mintTokens]);
      await send(jCollateralCapErc20, "harnessSetCollateralBalance", [
        acct,
        mintTokens,
      ]);
      await send(jCollateralCapErc20, "harnessSetCollateralBalanceInit", [
        acct,
      ]);
      let avaxBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(
          await call(
            joeLens,
            "gTokenBalances",
            [jCollateralCapErc20._address, acct],
            { gasPrice: "0" }
          )
        )
      ).toEqual({
        gTokenBalance: "2",
        balanceOfUnderlyingCurrent: "2",
        borrowBalanceCurrent: "0",
        borrowValueUSD: "0",
        gToken: jCollateralCapErc20._address,
        underlyingTokenAllowance: "0",
        underlyingTokenBalance: "10000000000000000000000000",
        collateralEnabled: true,
        collateralValueUSD: "2",
        supplyValueUSD: "0",
        collateralValueUSD: "0",
      });
    });
  });

  describe("gTokenBalancesAll", () => {
    it("is correct for jAvax and jErc20", async () => {
      let jErc20 = await makeGToken();
      let jAvax = await makeGToken({ kind: "javax" });
      let avaxBalance = await web3.eth.getBalance(acct);

      expect(
        (
          await call(
            joeLens,
            "gTokenBalancesAll",
            [[jErc20._address, jAvax._address], acct],
            { gasPrice: "0" }
          )
        ).map(cullTuple)
      ).toEqual([
        {
          gTokenBalance: "0",
          balanceOfUnderlyingCurrent: "0",
          borrowBalanceCurrent: "0",
          borrowValueUSD: "0",
          gToken: jErc20._address,
          underlyingTokenAllowance: "0",
          underlyingTokenBalance: "10000000000000000000000000",
          collateralEnabled: false,
          collateralValueUSD: "0",
          supplyValueUSD: "0",
        },
        {
          gTokenBalance: "0",
          balanceOfUnderlyingCurrent: "0",
          borrowBalanceCurrent: "0",
          borrowValueUSD: "0",
          gToken: jAvax._address,
          underlyingTokenAllowance: avaxBalance,
          underlyingTokenBalance: avaxBalance,
          collateralEnabled: false,
          collateralValueUSD: "0",
          supplyValueUSD: "0",
        },
      ]);
    });
  });

  describe("getAccountLimits", () => {
    it("gets correct values", async () => {
      let gTroller = await makeGtroller();

      expect(
        cullTuple(
          await call(joeLens, "getAccountLimits", [gTroller._address, acct])
        )
      ).toEqual({
        healthFactor: "0",
        liquidity: "0",
        markets: [],
        shortfall: "0",
        totalBorrowValueUSD: "0",
        totalCollateralValueUSD: "0",
      });
    });
  });

  describe("getClaimableRewards", () => {
    let root, minter, accounts;
    let gToken;
    beforeEach(async () => {
      [root, minter, ...accounts] = saddle.accounts;
      gToken = await makeGToken({
        gTrollerOpts: { kind: "bool" },
        exchangeRate,
        supportMarket: true,
      });
      await preMint(gToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("gets claimable rewards", async () => {
      const gTroller = gToken.gTroller;
      const rewardDistributorAddress = await call(
        gTroller,
        "rewardDistributor"
      );
      const rewardDistributor = await saddle.getContractAt(
        "MockRewardDistributor",
        rewardDistributorAddress
      );
      const joeAddress = await call(rewardDistributor, "joeAddress");
      await send(rewardDistributor, "_setRewardSpeed", [
        0,
        gToken._address,
        "1000000000000000000",
      ]);

      expect(await quickMint(gToken, minter, mintAmount)).toSucceed();

      await fastForward(rewardDistributor, 10);
      const pendingRewards = await call(joeLens, "getClaimableRewards", [
        "0",
        gToken.gTroller._address,
        joeAddress,
        minter,
      ]);
      expect(pendingRewards).toEqualNumber("10000000000000000000");
    });
  });
});
