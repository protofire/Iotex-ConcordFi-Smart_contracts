const {
  address,
  avaxMantissa,
  both,
  UInt256Max,
} = require("../Utils/Avalanche");

const {
  makeGtroller,
  makePriceOracle,
  makeGToken,
  makeToken,
  makeRewardDistributor,
} = require("../Utils/BankerJoe");

describe("Gtroller", () => {
  let root, accounts;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe("constructor", () => {
    it("on success it sets admin to creator and pendingAdmin is unset", async () => {
      const gTroller = await makeGtroller();
      expect(await call(gTroller, "admin")).toEqual(root);
      expect(await call(gTroller, "pendingAdmin")).toEqualNumber(0);
    });

    it("on success it sets closeFactor and maxAssets as specified", async () => {
      const gTroller = await makeGtroller();
      expect(await call(gTroller, "closeFactorMantissa")).toEqualNumber(
        0.051e18
      );
    });
  });

  describe("_setLiquidationIncentive", () => {
    const initialIncentive = avaxMantissa(1.0);
    const validIncentive = avaxMantissa(1.1);

    let gTroller;
    beforeEach(async () => {
      gTroller = await makeGtroller();
    });

    it("fails if called by non-admin", async () => {
      const { reply, receipt } = await both(
        gTroller,
        "_setLiquidationIncentive",
        [initialIncentive],
        { from: accounts[0] }
      );
      expect(reply).toHaveTrollError("UNAUTHORIZED");
      expect(receipt).toHaveTrollFailure(
        "UNAUTHORIZED",
        "SET_LIQUIDATION_INCENTIVE_OWNER_CHECK"
      );
      expect(
        await call(gTroller, "liquidationIncentiveMantissa")
      ).toEqualNumber(initialIncentive);
    });

    it("accepts a valid incentive and emits a NewLiquidationIncentive event", async () => {
      const { reply, receipt } = await both(
        gTroller,
        "_setLiquidationIncentive",
        [validIncentive]
      );
      expect(reply).toHaveTrollError("NO_ERROR");
      expect(receipt).toHaveLog("NewLiquidationIncentive", {
        oldLiquidationIncentiveMantissa: initialIncentive.toString(),
        newLiquidationIncentiveMantissa: validIncentive.toString(),
      });
      expect(
        await call(gTroller, "liquidationIncentiveMantissa")
      ).toEqualNumber(validIncentive);
    });
  });

  describe("_setPriceOracle", () => {
    let gTroller, oldOracle, newOracle;
    beforeEach(async () => {
      gTroller = await makeGtroller();
      oldOracle = gTroller.priceOracle;
      newOracle = await makePriceOracle();
    });

    it("fails if called by non-admin", async () => {
      expect(
        await send(gTroller, "_setPriceOracle", [newOracle._address], {
          from: accounts[0],
        })
      ).toHaveTrollFailure("UNAUTHORIZED", "SET_PRICE_ORACLE_OWNER_CHECK");
      expect(await gTroller.methods.oracle().call()).toEqual(
        oldOracle._address
      );
    });

    it.skip("reverts if passed a contract that doesn't implement isPriceOracle", async () => {
      await expect(
        send(gTroller, "_setPriceOracle", [gTroller._address])
      ).rejects.toRevert();
      expect(await call(gTroller, "oracle")).toEqual(oldOracle._address);
    });

    it.skip("reverts if passed a contract that implements isPriceOracle as false", async () => {
      await send(newOracle, "setIsPriceOracle", [false]); // Note: not yet implemented
      await expect(
        send(notOracle, "_setPriceOracle", [gTroller._address])
      ).rejects.toRevert("revert oracle method isPriceOracle returned false");
      expect(await call(gTroller, "oracle")).toEqual(oldOracle._address);
    });

    it("accepts a valid price oracle and emits a NewPriceOracle event", async () => {
      const result = await send(gTroller, "_setPriceOracle", [
        newOracle._address,
      ]);
      expect(result).toSucceed();
      expect(result).toHaveLog("NewPriceOracle", {
        oldPriceOracle: oldOracle._address,
        newPriceOracle: newOracle._address,
      });
      expect(await call(gTroller, "oracle")).toEqual(newOracle._address);
    });
  });

  describe("_setRewardDistributor", () => {
    let gTroller;
    let rewardDistributor;

    beforeEach(async () => {
      gTroller = await makeGtroller();
      rewardDistributor = await makeRewardDistributor();
    });

    it("fails if called by non-admin", async () => {
      const { reply } = await both(
        gTroller,
        "_setRewardDistributor",
        [rewardDistributor._address],
        {
          from: accounts[0],
        }
      );
      expect(reply).toHaveTrollError("UNAUTHORIZED");
    });

    it("succeeds NewRewardDistributor event", async () => {
      const result = await send(gTroller, "_setRewardDistributor", [
        rewardDistributor._address,
      ]);
      expect(result).toSucceed();
      expect(await call(gTroller, "rewardDistributor")).toEqual(
        rewardDistributor._address
      );
    });
  });

  describe("_setCloseFactor", () => {
    it("fails if not called by admin", async () => {
      const jToken = await makeGToken();
      expect(
        await send(jToken.gTroller, "_setCloseFactor", [1], {
          from: accounts[0],
        })
      ).toHaveTrollFailure("UNAUTHORIZED", "SET_CLOSE_FACTOR_OWNER_CHECK");
    });
  });

  describe("_setCollateralFactor", () => {
    const half = avaxMantissa(0.5);
    const one = avaxMantissa(1);

    it("fails if not called by admin", async () => {
      const jToken = await makeGToken();
      expect(
        await send(
          jToken.gTroller,
          "_setCollateralFactor",
          [jToken._address, half],
          { from: accounts[0] }
        )
      ).toHaveTrollFailure("UNAUTHORIZED", "SET_COLLATERAL_FACTOR_OWNER_CHECK");
    });

    it("fails if asset is not listed", async () => {
      const jToken = await makeGToken();
      expect(
        await send(jToken.gTroller, "_setCollateralFactor", [
          jToken._address,
          half,
        ])
      ).toHaveTrollFailure(
        "MARKET_NOT_LISTED",
        "SET_COLLATERAL_FACTOR_NO_EXISTS"
      );
    });

    it("fails if factor is too high", async () => {
      const jToken = await makeGToken({ supportMarket: true });
      expect(
        await send(jToken.gTroller, "_setCollateralFactor", [
          jToken._address,
          one,
        ])
      ).toHaveTrollFailure(
        "INVALID_COLLATERAL_FACTOR",
        "SET_COLLATERAL_FACTOR_VALIDATION"
      );
    });

    it("fails if factor is set without an underlying price", async () => {
      const jToken = await makeGToken({ supportMarket: true });
      expect(
        await send(jToken.gTroller, "_setCollateralFactor", [
          jToken._address,
          half,
        ])
      ).toHaveTrollFailure(
        "PRICE_ERROR",
        "SET_COLLATERAL_FACTOR_WITHOUT_PRICE"
      );
    });

    it("succeeds and sets market", async () => {
      const jToken = await makeGToken({
        supportMarket: true,
        underlyingPrice: 1,
      });
      const result = await send(jToken.gTroller, "_setCollateralFactor", [
        jToken._address,
        half,
      ]);
      expect(result).toHaveLog("NewCollateralFactor", {
        jToken: jToken._address,
        oldCollateralFactorMantissa: "0",
        newCollateralFactorMantissa: half.toString(),
      });
    });
  });

  describe("_supportMarket", () => {
    const version = 0;

    it("fails if not called by admin", async () => {
      const jToken = await makeGToken(root);
      await expect(
        send(jToken.gTroller, "_supportMarket", [jToken._address, version], {
          from: accounts[0],
        })
      ).rejects.toRevert("revert only admin may support market");
    });

    it("fails if asset is not a GToken", async () => {
      const gTroller = await makeGtroller();
      const asset = await makeToken(root);
      await expect(
        send(gTroller, "_supportMarket", [asset._address, version])
      ).rejects.toRevert();
    });

    it("succeeds and sets market", async () => {
      const jToken = await makeGToken();
      const result = await send(jToken.gTroller, "_supportMarket", [
        jToken._address,
        version,
      ]);
      expect(result).toHaveLog("MarketListed", { jToken: jToken._address });
    });

    it("cannot list a market a second time", async () => {
      const jToken = await makeGToken();
      const result1 = await send(jToken.gTroller, "_supportMarket", [
        jToken._address,
        version,
      ]);
      expect(result1).toHaveLog("MarketListed", { jToken: jToken._address });
      await expect(
        send(jToken.gTroller, "_supportMarket", [jToken._address, version])
      ).rejects.toRevert("revert market already listed");
    });

    it("can list two different markets", async () => {
      const jToken1 = await makeGToken();
      const jToken2 = await makeGToken({ gTroller: jToken1.gTroller });
      const result1 = await send(jToken1.gTroller, "_supportMarket", [
        jToken1._address,
        version,
      ]);
      const result2 = await send(jToken1.gTroller, "_supportMarket", [
        jToken2._address,
        version,
      ]);
      expect(result1).toHaveLog("MarketListed", { jToken: jToken1._address });
      expect(result2).toHaveLog("MarketListed", { jToken: jToken2._address });
    });
  });

  describe("_setCreditLimit", () => {
    const creditLimit = avaxMantissa(500);

    it("fails if not called by admin", async () => {
      const jToken = await makeGToken(root);
      await expect(
        send(jToken.gTroller, "_setCreditLimit", [accounts[0], creditLimit], {
          from: accounts[0],
        })
      ).rejects.toRevert("revert only admin can set protocol credit limit");
    });

    it("succeeds and sets credit limit", async () => {
      const jToken = await makeGToken();
      const result = await send(jToken.gTroller, "_setCreditLimit", [
        accounts[0],
        creditLimit,
      ]);
      expect(result).toHaveLog("CreditLimitChanged", {
        protocol: accounts[0],
        creditLimit: creditLimit.toString(),
      });
    });

    it("succeeds and sets to max credit limit", async () => {
      const jToken = await makeGToken();
      const result = await send(jToken.gTroller, "_setCreditLimit", [
        accounts[0],
        UInt256Max(),
      ]);
      expect(result).toHaveLog("CreditLimitChanged", {
        protocol: accounts[0],
        creditLimit: UInt256Max().toString(),
      });
    });

    it("succeeds and sets to 0 credit limit", async () => {
      const jToken = await makeGToken();
      const result = await send(jToken.gTroller, "_setCreditLimit", [
        accounts[0],
        0,
      ]);
      expect(result).toHaveLog("CreditLimitChanged", {
        protocol: accounts[0],
        creditLimit: "0",
      });
    });
  });

  describe("_delistMarket", () => {
    const version = 0;

    it("fails if not called by admin", async () => {
      const jToken = await makeGToken(root);
      await expect(
        send(jToken.gTroller, "_delistMarket", [jToken._address], {
          from: accounts[0],
        })
      ).rejects.toRevert("revert only admin may delist market");
    });

    it("fails if market not listed", async () => {
      const gTroller = await makeGtroller();
      const asset = await makeToken(root);
      await expect(
        send(gTroller, "_delistMarket", [asset._address])
      ).rejects.toRevert("revert market not listed");
    });

    it("fails if market not empty", async () => {
      const jToken = await makeGToken(root);
      expect(
        await send(jToken.gTroller, "_supportMarket", [
          jToken._address,
          version,
        ])
      ).toSucceed();
      await send(jToken, "harnessSetTotalSupply", [1]);
      await expect(
        send(jToken.gTroller, "_delistMarket", [jToken._address])
      ).rejects.toRevert("revert market not empty");
    });

    it("succeeds and delists market", async () => {
      const jToken = await makeGToken();
      expect(
        await send(jToken.gTroller, "_supportMarket", [
          jToken._address,
          version,
        ])
      ).toSucceed();
      const result = await send(jToken.gTroller, "_delistMarket", [
        jToken._address,
      ]);
      expect(result).toHaveLog("MarketDelisted", { jToken: jToken._address });
    });

    it("can delist two different markets", async () => {
      const jToken1 = await makeGToken();
      const jToken2 = await makeGToken({ gTroller: jToken1.gTroller });
      expect(
        await send(jToken1.gTroller, "_supportMarket", [
          jToken1._address,
          version,
        ])
      ).toSucceed();
      expect(
        await send(jToken2.gTroller, "_supportMarket", [
          jToken2._address,
          version,
        ])
      ).toSucceed();
      const result1 = await send(jToken1.gTroller, "_delistMarket", [
        jToken1._address,
      ]);
      const result2 = await send(jToken2.gTroller, "_delistMarket", [
        jToken2._address,
      ]);
      expect(result1).toHaveLog("MarketDelisted", { jToken: jToken1._address });
      expect(result2).toHaveLog("MarketDelisted", { jToken: jToken2._address });
    });
  });

  describe("redeemVerify", () => {
    it("should allow you to redeem 0 underlying for 0 tokens", async () => {
      const gTroller = await makeGtroller();
      const jToken = await makeGToken({ gTroller: gTroller });
      await call(gTroller, "redeemVerify", [
        jToken._address,
        accounts[0],
        0,
        0,
      ]);
    });

    it("should allow you to redeem 5 underlyig for 5 tokens", async () => {
      const gTroller = await makeGtroller();
      const jToken = await makeGToken({ gTroller: gTroller });
      await call(gTroller, "redeemVerify", [
        jToken._address,
        accounts[0],
        5,
        5,
      ]);
    });

    it("should not allow you to redeem 5 underlying for 0 tokens", async () => {
      const gTroller = await makeGtroller();
      const jToken = await makeGToken({ gTroller: gTroller });
      await expect(
        call(gTroller, "redeemVerify", [jToken._address, accounts[0], 5, 0])
      ).rejects.toRevert("revert redeemTokens zero");
    });
  });
});
