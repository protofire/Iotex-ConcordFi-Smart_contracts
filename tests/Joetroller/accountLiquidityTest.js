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
      const jToken = await makeGToken({ supportMarket: true });
      await call(jToken.underlying, "balanceOf", [user]);
      await enterMarkets([jToken], user);
      await quickMint(jToken, user, amount);
      let result = await call(jToken.gTroller, "getAccountLiquidity", [user]);
      expect(result).toHaveTrollError("PRICE_ERROR");
    });

    it("allows a borrow up to collateralFactor, but not more", async () => {
      const collateralFactor = 0.5,
        underlyingPrice = 1,
        user = accounts[1],
        amount = 1e6;
      const jToken = await makeGToken({
        supportMarket: true,
        collateralFactor,
        underlyingPrice,
      });

      let error, liquidity, shortfall;

      // not in market yet, hypothetical borrow should have no effect
      ({ 1: liquidity, 2: shortfall } = await call(
        jToken.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, jToken._address, 0, amount]
      ));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);

      await enterMarkets([jToken], user);
      await quickMint(jToken, user, amount);

      // total account liquidity after supplying `amount`
      ({ 1: liquidity, 2: shortfall } = await call(
        jToken.gTroller,
        "getAccountLiquidity",
        [user]
      ));
      expect(liquidity).toEqualNumber(amount * collateralFactor);
      expect(shortfall).toEqualNumber(0);

      // hypothetically borrow `amount`, should shortfall over collateralFactor
      ({ 1: liquidity, 2: shortfall } = await call(
        jToken.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, jToken._address, 0, amount]
      ));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(amount * (1 - collateralFactor));

      // hypothetically redeem `amount`, should be back to even
      ({ 1: liquidity, 2: shortfall } = await call(
        jToken.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, jToken._address, amount, 0]
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
      const jToken1 = await makeGToken({
        supportMarket: true,
        collateralFactor: cf1,
        underlyingPrice: up1,
      });
      const jToken2 = await makeGToken({
        supportMarket: true,
        gTroller: jToken1.gTroller,
        collateralFactor: cf2,
        underlyingPrice: up2,
      });
      const jToken3 = await makeGToken({
        supportMarket: true,
        gTroller: jToken1.gTroller,
        collateralFactor: cf3,
        underlyingPrice: up3,
      });

      await enterMarkets([jToken1, jToken2, jToken3], user);
      await quickMint(jToken1, user, amount1);
      await quickMint(jToken2, user, amount2);

      let error, liquidity, shortfall;

      ({
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(jToken3.gTroller, "getAccountLiquidity", [user]));
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(collateral);
      expect(shortfall).toEqualNumber(0);

      ({ 1: liquidity, 2: shortfall } = await call(
        jToken3.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, jToken3._address, Math.floor(c2), 0]
      ));
      expect(liquidity).toEqualNumber(collateral);
      expect(shortfall).toEqualNumber(0);

      ({ 1: liquidity, 2: shortfall } = await call(
        jToken3.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, jToken3._address, 0, Math.floor(c2)]
      ));
      expect(liquidity).toEqualNumber(c1);
      expect(shortfall).toEqualNumber(0);

      ({ 1: liquidity, 2: shortfall } = await call(
        jToken3.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, jToken3._address, 0, collateral + c1]
      ));
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(c1);

      ({ 1: liquidity, 2: shortfall } = await call(
        jToken1.gTroller,
        "getHypotheticalAccountLiquidity",
        [user, jToken1._address, amount1, 0]
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
      const jToken = await makeGToken({
        supportMarket: true,
        collateralFactor,
        underlyingPrice,
      });
      let error, liquidity, shortfall;

      ({
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(jToken.gTroller, "getAccountLiquidity", [user]));
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(0);
      expect(shortfall).toEqualNumber(0);

      await send(jToken.gTroller, "_setCreditLimit", [user, creditLimit]);

      ({
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(jToken.gTroller, "getAccountLiquidity", [user]));
      expect(error).toEqualNumber(0);
      expect(liquidity).toEqualNumber(creditLimit);
      expect(shortfall).toEqualNumber(0);

      await enterMarkets([jToken], user);
      await expect(quickMint(jToken, user, amount)).rejects.toRevert(
        "revert credit account cannot mint"
      );

      await send(jToken.gTroller, "_setCreditLimit", [user, 0]);

      await enterMarkets([jToken], user);
      await quickMint(jToken, user, amount);

      ({
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(jToken.gTroller, "getAccountLiquidity", [user]));
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
      const jToken = await makeGToken();
      const {
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(jToken.gTroller, "getHypotheticalAccountLiquidity", [
        accounts[0],
        jToken._address,
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
      const jToken = await makeGToken({
        supportMarket: true,
        collateralFactor,
        exchangeRate,
        underlyingPrice,
      });
      const from = accounts[0],
        balance = 1e7,
        amount = 1e6;
      await enterMarkets([jToken], from);
      await send(jToken.underlying, "harnessSetBalance", [from, balance], {
        from,
      });
      await send(jToken.underlying, "approve", [jToken._address, balance], {
        from,
      });
      await send(jToken, "mint", [amount], { from });
      const {
        0: error,
        1: liquidity,
        2: shortfall,
      } = await call(jToken.gTroller, "getHypotheticalAccountLiquidity", [
        from,
        jToken._address,
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
    const jToken = await makeGToken({
      supportMarket: true,
      collateralFactor,
      exchangeRate,
      underlyingPrice,
    });
    const from = accounts[0],
      balance = 1e7,
      amount = 1e6,
      borrowAmount = 1e4;
    await enterMarkets([jToken], from);
    await send(jToken.underlying, "harnessSetBalance", [from, balance], {
      from,
    });
    await send(jToken.underlying, "approve", [jToken._address, balance], {
      from,
    });
    await send(jToken, "mint", [amount], { from });

    const result1 = await send(jToken, "borrow", [borrowAmount], { from });
    expect(result1).toSucceed();
    console.log("result1", result1.gasUsed); // 180466

    await send(jToken.gTroller, "_setCreditLimit", [from, UInt256Max()]);

    const result2 = await send(jToken, "borrow", [borrowAmount], { from });
    expect(result2).toSucceed();
    console.log("result2", result2.gasUsed); // 95882
  });
});
