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

async function preMint(jToken, minter, mintAmount, mintTokens, exchangeRate) {
  await preApprove(jToken, minter, mintAmount);
  await send(jToken.gTroller, "setMintAllowed", [true]);
  await send(jToken.gTroller, "setMintVerify", [true]);
  await send(jToken.interestRateModel, "setFailBorrowRate", [false]);
  await send(jToken.underlying, "harnessSetFailTransferFromAddress", [
    minter,
    false,
  ]);
  await send(jToken, "harnessSetBalance", [minter, 0]);
  await send(jToken, "harnessSetExchangeRate", [avaxMantissa(exchangeRate)]);
}

describe("JoeLens", () => {
  let joeLens;
  let acct;

  beforeEach(async () => {
    joeLens = await deploy("JoeLens", ["jAVAX"]);
    acct = accounts[0];
  });

  describe("jTokenMetadata", () => {
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
          await call(joeLens, "jTokenMetadata", [jCollateralCapErc20._address])
        )
      ).toEqual({
        jToken: jCollateralCapErc20._address,
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
        jTokenDecimals: "8",
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
        cullTuple(await call(joeLens, "jTokenMetadata", [jErc20._address]))
      ).toEqual({
        jToken: jErc20._address,
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
        jTokenDecimals: "8",
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
        cullTuple(await call(joeLens, "jTokenMetadata", [jAvax._address]))
      ).toEqual({
        borrowRatePerSecond: "0",
        jToken: jAvax._address,
        jTokenDecimals: "8",
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
          await call(joeLens, "jTokenMetadata", [jCollateralCapErc20._address])
        )
      ).toEqual({
        jToken: jCollateralCapErc20._address,
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
        jTokenDecimals: "8",
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
          await call(joeLens, "jTokenMetadata", [jCollateralCapErc20._address])
        )
      ).toEqual({
        jToken: jCollateralCapErc20._address,
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
        jTokenDecimals: "8",
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
          await call(joeLens, "jTokenMetadata", [jWrappedNative._address])
        )
      ).toEqual({
        jToken: jWrappedNative._address,
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
        jTokenDecimals: "8",
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

  describe("jTokenMetadataAll", () => {
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
          await call(joeLens, "jTokenMetadataAll", [
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
          jToken: jErc20._address,
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
          jTokenDecimals: "8",
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
          jToken: jAvax._address,
          jTokenDecimals: "8",
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
          jToken: jCollateralCapErc20._address,
          jTokenDecimals: "8",
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
          jToken: jWrappedNative._address,
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
          jTokenDecimals: "8",
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
        call(joeLens, "jTokenMetadataAll", [
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
      await expect(call(joeLens, "jTokenMetadataAll", [[]])).rejects.toRevert(
        "revert invalid input"
      );
    });
  });

  describe("jTokenBalances", () => {
    it("is correct for jERC20", async () => {
      let jErc20 = await makeGToken();
      let avaxBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(
          await call(joeLens, "jTokenBalances", [jErc20._address, acct], {
            gasPrice: "0",
          })
        )
      ).toEqual({
        jTokenBalance: "0",
        balanceOfUnderlyingCurrent: "0",
        borrowBalanceCurrent: "0",
        borrowValueUSD: "0",
        jToken: jErc20._address,
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
          await call(joeLens, "jTokenBalances", [jAvax._address, acct], {
            gasPrice: "0",
          })
        )
      ).toEqual({
        jTokenBalance: "0",
        balanceOfUnderlyingCurrent: "0",
        borrowBalanceCurrent: "0",
        borrowValueUSD: "0",
        jToken: jAvax._address,
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
            "jTokenBalances",
            [jCollateralCapErc20._address, acct],
            { gasPrice: "0" }
          )
        )
      ).toEqual({
        jTokenBalance: "2",
        balanceOfUnderlyingCurrent: "2",
        borrowBalanceCurrent: "0",
        borrowValueUSD: "0",
        jToken: jCollateralCapErc20._address,
        underlyingTokenAllowance: "0",
        underlyingTokenBalance: "10000000000000000000000000",
        collateralEnabled: true,
        collateralValueUSD: "2",
        supplyValueUSD: "0",
        collateralValueUSD: "0",
      });
    });
  });

  describe("jTokenBalancesAll", () => {
    it("is correct for jAvax and jErc20", async () => {
      let jErc20 = await makeGToken();
      let jAvax = await makeGToken({ kind: "javax" });
      let avaxBalance = await web3.eth.getBalance(acct);

      expect(
        (
          await call(
            joeLens,
            "jTokenBalancesAll",
            [[jErc20._address, jAvax._address], acct],
            { gasPrice: "0" }
          )
        ).map(cullTuple)
      ).toEqual([
        {
          jTokenBalance: "0",
          balanceOfUnderlyingCurrent: "0",
          borrowBalanceCurrent: "0",
          borrowValueUSD: "0",
          jToken: jErc20._address,
          underlyingTokenAllowance: "0",
          underlyingTokenBalance: "10000000000000000000000000",
          collateralEnabled: false,
          collateralValueUSD: "0",
          supplyValueUSD: "0",
        },
        {
          jTokenBalance: "0",
          balanceOfUnderlyingCurrent: "0",
          borrowBalanceCurrent: "0",
          borrowValueUSD: "0",
          jToken: jAvax._address,
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
    let jToken;
    beforeEach(async () => {
      [root, minter, ...accounts] = saddle.accounts;
      jToken = await makeGToken({
        gTrollerOpts: { kind: "bool" },
        exchangeRate,
        supportMarket: true,
      });
      await preMint(jToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("gets claimable rewards", async () => {
      const gTroller = jToken.gTroller;
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
        jToken._address,
        "1000000000000000000",
      ]);

      expect(await quickMint(jToken, minter, mintAmount)).toSucceed();

      await fastForward(rewardDistributor, 10);
      const pendingRewards = await call(joeLens, "getClaimableRewards", [
        "0",
        jToken.gTroller._address,
        joeAddress,
        minter,
      ]);
      expect(pendingRewards).toEqualNumber("10000000000000000000");
    });
  });
});
