const {
  avaxUnsigned,
  avaxMantissa,
  UInt256Max,
} = require("../Utils/Avalanche");

const {
  makeGToken,
  setBorrowRate,
  pretendBorrow,
} = require("../Utils/BankerJoe");

describe("GToken", function () {
  let root, admin, accounts;
  beforeEach(async () => {
    [root, admin, ...accounts] = saddle.accounts;
  });

  describe("constructor", () => {
    it("fails when non erc-20 underlying", async () => {
      await expect(
        makeGToken({ underlying: { _address: root } })
      ).rejects.toRevert("revert");
    });

    it("fails when 0 initial exchange rate", async () => {
      await expect(makeGToken({ exchangeRate: 0 })).rejects.toRevert(
        "revert initial exchange rate must be greater than zero."
      );
    });

    it("succeeds with erc-20 underlying and non-zero exchange rate", async () => {
      const gToken = await makeGToken();
      expect(await call(gToken, "underlying")).toEqual(
        gToken.underlying._address
      );
      expect(await call(gToken, "admin")).toEqual(root);
    });

    it("succeeds when setting admin to contructor argument", async () => {
      const gToken = await makeGToken({ admin: admin });
      expect(await call(gToken, "admin")).toEqual(admin);
    });
  });

  describe("name, symbol, decimals", () => {
    let gToken;

    beforeEach(async () => {
      gToken = await makeGToken({
        name: "GToken Foo",
        symbol: "cFOO",
        decimals: 10,
      });
    });

    it("should return correct name", async () => {
      expect(await call(gToken, "name")).toEqual("GToken Foo");
    });

    it("should return correct symbol", async () => {
      expect(await call(gToken, "symbol")).toEqual("cFOO");
    });

    it("should return correct decimals", async () => {
      expect(await call(gToken, "decimals")).toEqualNumber(10);
    });
  });

  describe("balanceOfUnderlying", () => {
    it("has an underlying balance", async () => {
      const gToken = await makeGToken({ supportMarket: true, exchangeRate: 2 });
      await send(gToken, "harnessSetBalance", [root, 100]);
      expect(await call(gToken, "balanceOfUnderlying", [root])).toEqualNumber(
        200
      );
    });
  });

  describe("borrowRatePerSecond", () => {
    it("has a borrow rate", async () => {
      const gToken = await makeGToken({
        supportMarket: true,
        interestRateModelOpts: {
          kind: "jump-rate",
          baseRate: 0.05,
          multiplier: 0.45,
          kink: 0.95,
          jump: 5,
          roof: 1,
        },
      });
      const perSecond = await call(gToken, "borrowRatePerSecond");
      expect(Math.abs(perSecond * 31536000 - 5e16)).toBeLessThanOrEqual(1e8);
    });
  });

  describe("supplyRatePerSecond", () => {
    it("returns 0 if there's no supply", async () => {
      const gToken = await makeGToken({
        supportMarket: true,
        interestRateModelOpts: {
          kind: "jump-rate",
          baseRate: 0.05,
          multiplier: 0.45,
          kink: 0.95,
          jump: 5,
          roof: 1,
        },
      });
      const perSecond = await call(gToken, "supplyRatePerSecond");
      await expect(perSecond).toEqualNumber(0);
    });

    it("has a supply rate", async () => {
      const baseRate = 0.05;
      const multiplier = 0.45;
      const kink = 0.95;
      const jump = 5 * multiplier;
      const roof = 1;
      const gToken = await makeGToken({
        supportMarket: true,
        interestRateModelOpts: {
          kind: "jump-rate",
          baseRate,
          multiplier: multiplier * kink,
          kink,
          jump,
          roof,
        },
      });
      await send(gToken, "harnessSetReserveFactorFresh", [avaxMantissa(0.01)]);
      await send(gToken, "harnessExchangeRateDetails", [1, 1, 0]);
      await send(gToken, "harnessSetExchangeRate", [avaxMantissa(1)]);
      // Full utilization (Over the kink so jump is included), 1% reserves
      const borrowRate = baseRate + multiplier * kink + jump * 0.05;
      const expectedSuplyRate = borrowRate * 0.99;

      const perSecond = await call(gToken, "supplyRatePerSecond");
      expect(
        Math.abs(perSecond * 31536000 - expectedSuplyRate * 1e18)
      ).toBeLessThanOrEqual(1e8);
    });
  });

  describe("borrowBalanceCurrent", () => {
    let borrower;
    let gToken;

    beforeEach(async () => {
      borrower = accounts[0];
      gToken = await makeGToken();
    });

    beforeEach(async () => {
      await setBorrowRate(gToken, 0.001);
      await send(gToken.interestRateModel, "setFailBorrowRate", [false]);
    });

    it("reverts if interest accrual fails", async () => {
      await send(gToken.interestRateModel, "setFailBorrowRate", [true]);
      // make sure we accrue interest
      await send(gToken, "harnessFastForward", [1]);
      await expect(
        send(gToken, "borrowBalanceCurrent", [borrower])
      ).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns successful result from borrowBalanceStored with no interest", async () => {
      await setBorrowRate(gToken, 0);
      await pretendBorrow(gToken, borrower, 1, 1, 5e18);
      expect(
        await call(gToken, "borrowBalanceCurrent", [borrower])
      ).toEqualNumber(5e18);
    });

    it("returns successful result from borrowBalanceCurrent with no interest", async () => {
      await setBorrowRate(gToken, 0);
      await pretendBorrow(gToken, borrower, 1, 3, 5e18);
      expect(await send(gToken, "harnessFastForward", [5])).toSucceed();
      expect(
        await call(gToken, "borrowBalanceCurrent", [borrower])
      ).toEqualNumber(5e18 * 3);
    });
  });

  describe("borrowBalanceStored", () => {
    let borrower;
    let gToken;

    beforeEach(async () => {
      borrower = accounts[0];
      gToken = await makeGToken({ gTrollerOpts: { kind: "bool" } });
    });

    it("returns 0 for account with no borrows", async () => {
      expect(
        await call(gToken, "borrowBalanceStored", [borrower])
      ).toEqualNumber(0);
    });

    it("returns stored principal when account and market indexes are the same", async () => {
      await pretendBorrow(gToken, borrower, 1, 1, 5e18);
      expect(
        await call(gToken, "borrowBalanceStored", [borrower])
      ).toEqualNumber(5e18);
    });

    it("returns calculated balance when market index is higher than account index", async () => {
      await pretendBorrow(gToken, borrower, 1, 3, 5e18);
      expect(
        await call(gToken, "borrowBalanceStored", [borrower])
      ).toEqualNumber(5e18 * 3);
    });

    it("has undefined behavior when market index is lower than account index", async () => {
      // The market index < account index should NEVER happen, so we don't test this case
    });

    it("reverts on overflow of principal", async () => {
      await pretendBorrow(gToken, borrower, 1, 3, UInt256Max());
      await expect(
        call(gToken, "borrowBalanceStored", [borrower])
      ).rejects.toRevert("revert multiplication overflow");
    });

    it("reverts on non-zero stored principal with zero account index", async () => {
      await pretendBorrow(gToken, borrower, 0, 3, 5);
      await expect(
        call(gToken, "borrowBalanceStored", [borrower])
      ).rejects.toRevert("revert divide by zero");
    });
  });

  describe("exchangeRateStored", () => {
    let gToken,
      exchangeRate = 2;

    beforeEach(async () => {
      gToken = await makeGToken({ exchangeRate });
    });

    it("returns initial exchange rate with zero gTokenSupply", async () => {
      const result = await call(gToken, "exchangeRateStored");
      expect(result).toEqualNumber(avaxMantissa(exchangeRate));
    });

    it("calculates with single gTokenSupply and single total borrow", async () => {
      const gTokenSupply = 1,
        totalBorrows = 1,
        totalReserves = 0;
      await send(gToken, "harnessExchangeRateDetails", [
        gTokenSupply,
        totalBorrows,
        totalReserves,
      ]);
      const result = await call(gToken, "exchangeRateStored");
      expect(result).toEqualNumber(avaxMantissa(1));
    });

    it("calculates with gTokenSupply and total borrows", async () => {
      const gTokenSupply = 100e18,
        totalBorrows = 10e18,
        totalReserves = 0;
      await send(
        gToken,
        "harnessExchangeRateDetails",
        [gTokenSupply, totalBorrows, totalReserves].map(avaxUnsigned)
      );
      const result = await call(gToken, "exchangeRateStored");
      expect(result).toEqualNumber(avaxMantissa(0.1));
    });

    it("calculates with cash and gTokenSupply", async () => {
      const gTokenSupply = 5e18,
        totalBorrows = 0,
        totalReserves = 0;
      expect(
        await send(gToken.underlying, "transfer", [
          gToken._address,
          avaxMantissa(500),
        ])
      ).toSucceed();
      await send(
        gToken,
        "harnessExchangeRateDetails",
        [gTokenSupply, totalBorrows, totalReserves].map(avaxUnsigned)
      );
      const result = await call(gToken, "exchangeRateStored");
      expect(result).toEqualNumber(avaxMantissa(100));
    });

    it("calculates with cash, borrows, reserves and gTokenSupply", async () => {
      const gTokenSupply = 500e18,
        totalBorrows = 500e18,
        totalReserves = 5e18;
      expect(
        await send(gToken.underlying, "transfer", [
          gToken._address,
          avaxMantissa(500),
        ])
      ).toSucceed();
      await send(
        gToken,
        "harnessExchangeRateDetails",
        [gTokenSupply, totalBorrows, totalReserves].map(avaxUnsigned)
      );
      const result = await call(gToken, "exchangeRateStored");
      expect(result).toEqualNumber(avaxMantissa(1.99));
    });
  });

  describe("getCash", () => {
    it("gets the cash", async () => {
      const gToken = await makeGToken();
      const result = await call(gToken, "getCash");
      expect(result).toEqualNumber(0);
    });
  });
});
