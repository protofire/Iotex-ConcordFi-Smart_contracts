const {
  makeGtroller,
  makeGToken,
  enterMarkets,
  quickMint,
} = require("../Utils/BankerJoe");
const { UInt256Max } = require("../Utils/Avalanche");

describe("Gtroller", () => {
  let root, accounts;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe("liquidity", () => {
    it("fails if a price has not been set", async () => {
      const user = accounts[1],
        amount = 1e6;
      const gToken = await makeGToken({ supportMarket: true });
      await call(gToken.underlying, "balanceOf", [user]);
      await enterMarkets([gToken], user);
      await quickMint(gToken, user, amount);
      let result = await call(gToken.gTroller, "getAccountLiquidity", [user]);
      expect(result).toHaveTrollError("PRICE_ERROR");
    });

    it("allows a borrow up to collateralFactor, but not more", async () => {
      const collateralFactor = 0.5,
        underlyingPrice = 1,
        user = accounts[1],
        amount = 1e6;
      const gToken = await makeGToken({
        supportMarket: true,
        collateralFactor,
        underlyingPrice,
      });

      let error, liquidity, shortfall;

      // not in market yet, hypothetical borrow should have no effect
      ({ 1: liquidity, 2: shortfall } = await call(
        gToken.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, gToken._address, 0, amount]
      ));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);

      await enterMarkets([gToken], user);
      await quickMint(gToken, user, amount);

      // total account liquidity after supplying `amount`
      ({ 1: liquidity, 2: shortfall } = await call(
        gToken.gTroller,
        "getAccountLiquidity",
        [user]
      ));
      expect(liquidity).toEqualNumber(amount * collateralFactor);
      expect(shortfall).toEqualNumber(0);

      // hypothetically borrow `amount`, should shortfall over collateralFactor
      ({ 1: liquidity, 2: shortfall } = await call(
        gToken.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, gToken._address, 0, amount]
      ));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(amount * (1 - collateralFactor));

      // hypothetically redeem `amount`, should be back to even
      ({ 1: liquidity, 2: shortfall } = await call(
        gToken.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, gToken._address, amount, 0]
      ));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);
    }, 20000);

    it("allows entering 3 markets, supplying to 2 and borrowing up to collateralFactor in the 3rd", async () => {
      const amount1 = 1e6,
        amount2 = 1e3,
        user = accounts[1];
      const cf1 = 0.5,
        cf2 = 0.666,
        cf3 = 0,
        up1 = 3,
        up2 = 2.718,
        up3 = 1;
      const c1 = amount1 * cf1 * up1,
        c2 = amount2 * cf2 * up2,
        collateral = Math.floor(c1 + c2);
      const gToken1 = await makeGToken({
        supportMarket: true,
        collateralFactor: cf1,
        underlyingPrice: up1,
      });
      const gToken2 = await makeGToken({
        supportMarket: true,
        gTroller: gToken1.gTroller,
        collateralFactor: cf2,
        underlyingPrice: up2,
      });
      const gToken3 = await makeGToken({
        supportMarket: true,
        gTroller: gToken1.gTroller,
        collateralFactor: cf3,
        underlyingPrice: up3,
      });

      await enterMarkets([gToken1, gToken2, gToken3], user);
      await quickMint(gToken1, user, amount1);
      await quickMint(gToken2, user, amount2);

      let error, liquidity, shortfall;

      ({
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(gToken3.gTroller, "getAccountLiquidity", [user]));
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(collateral);
      expect(shortfall).toEqualNumber(0);

      ({ 1: liquidity, 2: shortfall } = await call(
        gToken3.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, gToken3._address, Math.floor(c2), 0]
      ));
      expect(liquidity).toEqualNumber(collateral);
      expect(shortfall).toEqualNumber(0);

      ({ 1: liquidity, 2: shortfall } = await call(
        gToken3.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, gToken3._address, 0, Math.floor(c2)]
      ));
      expect(liquidity).toEqualNumber(c1);
      expect(shortfall).toEqualNumber(0);

      ({ 1: liquidity, 2: shortfall } = await call(
        gToken3.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, gToken3._address, 0, collateral + c1]
      ));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(c1);

      ({ 1: liquidity, 2: shortfall } = await call(
        gToken1.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, gToken1._address, amount1, 0]
      ));
      expect(liquidity).toEqualNumber(Math.floor(c2));
      expect(shortfall).toEqualNumber(0);
    });

    it("has account liquidity with credit limit", async () => {
      const collateralFactor = 0.5,
        underlyingPrice = 1,
        user = accounts[1],
        amount = 1e6,
        creditLimit = 500;
      const gToken = await makeGToken({
        supportMarket: true,
        collateralFactor,
        underlyingPrice,
      });
      let error, liquidity, shortfall;

      ({
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(gToken.gTroller, "getAccountLiquidity", [user]));
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);

      await send(gToken.gTroller, "_setCreditLimit", [user, creditLimit]);

      ({
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(gToken.gTroller, "getAccountLiquidity", [user]));
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(creditLimit);
      expect(shortfall).toEqualNumber(0);

      await enterMarkets([gToken], user);
      await expect(quickMint(gToken, user, amount)).rejects.toRevert(
        "revert credit account cannot mint"
      );

      await send(gToken.gTroller, "_setCreditLimit", [user, 0]);

      await enterMarkets([gToken], user);
      await quickMint(gToken, user, amount);

      ({
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(gToken.gTroller, "getAccountLiquidity", [user]));
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(amount * collateralFactor);
      expect(shortfall).toEqualNumber(0);
    });
  });

  describe("getAccountLiquidity", () => {
    it("returns 0 if not 'in' any markets", async () => {
      const gTroller = await makeGtroller();
      const {
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(gTroller, "getAccountLiquidity", [accounts[0]]);
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);
    });
  });

  describe("getHypotheticalAccountLiquidity", () => {
    it("returns 0 if not 'in' any markets", async () => {
      const gToken = await makeGToken();
      const {
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(gToken.gTroller, "getHypotheticalAccountLiquidity", [
        accounts[0],
        gToken._address,
        0,
        0,
      ]);
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);
    });

    it("returns collateral factor times dollar amount of tokens minted in a single market", async () => {
      const collateralFactor = 0.5,
        exchangeRate = 1,
        underlyingPrice = 1;
      const gToken = await makeGToken({
        supportMarket: true,
        collateralFactor,
        exchangeRate,
        underlyingPrice,
      });
      const from = accounts[0],
        balance = 1e7,
        amount = 1e6;
      await enterMarkets([gToken], from);
      await send(gToken.underlying, "harnessSetBalance", [from, balance], {
        from,
      });
      await send(gToken.underlying, "approve", [gToken._address, balance], {
        from,
      });
      await send(gToken, "mint", [amount], { from });
      const {
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(gToken.gTroller, "getHypotheticalAccountLiquidity", [
        from,
        gToken._address,
        0,
        0,
      ]);
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(
        amount * collateralFactor * exchangeRate * underlyingPrice
      );
      expect(shortfall).toEqualNumber(0);
    });
  });

  it.skip("max credit limit saves gas", async () => {
    const collateralFactor = 0.5,
      exchangeRate = 1,
      underlyingPrice = 1;
    const gToken = await makeGToken({
      supportMarket: true,
      collateralFactor,
      exchangeRate,
      underlyingPrice,
    });
    const from = accounts[0],
      balance = 1e7,
      amount = 1e6,
      borrowAmount = 1e4;
    await enterMarkets([gToken], from);
    await send(gToken.underlying, "harnessSetBalance", [from, balance], {
      from,
    });
    await send(gToken.underlying, "approve", [gToken._address, balance], {
      from,
    });
    await send(gToken, "mint", [amount], { from });

    const result1 = await send(gToken, "borrow", [borrowAmount], { from });
    expect(result1).toSucceed();
    console.log("result1", result1.gasUsed); // 180466

    await send(gToken.gTroller, "_setCreditLimit", [from, UInt256Max()]);

    const result2 = await send(gToken, "borrow", [borrowAmount], { from });
    expect(result2).toSucceed();
    console.log("result2", result2.gasUsed); // 95882
  });
});
