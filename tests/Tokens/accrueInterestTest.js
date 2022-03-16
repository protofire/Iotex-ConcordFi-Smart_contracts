const {
  avaxMantissa,
  avaxUnsigned,
  UInt256Max,
} = require("../Utils/Avalanche");
const { makeGToken, setBorrowRate } = require("../Utils/BankerJoe");

const blockTimestamp = 2e7;
const borrowIndex = 1e18;
const borrowRate = 0.000001;

async function pretendTimestamp(
  gToken,
  accrualBlockTimestamp = blockTimestamp,
  deltaTimestamp = 1
) {
  await send(gToken, "harnessSetAccrualBlockTimestamp", [
    avaxUnsigned(blockTimestamp),
  ]);
  await send(gToken, "harnessSetBlockTimestamp", [
    avaxUnsigned(blockTimestamp + deltaTimestamp),
  ]);
  await send(gToken, "harnessSetBorrowIndex", [avaxUnsigned(borrowIndex)]);
}

async function preAccrue(gToken) {
  await setBorrowRate(gToken, borrowRate);
  await send(gToken.interestRateModel, "setFailBorrowRate", [false]);
  await send(gToken, "harnessExchangeRateDetails", [0, 0, 0]);
}

describe("GToken", () => {
  let root, accounts;
  let gToken;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    gToken = await makeGToken({ gTrollerOpts: { kind: "bool" } });
  });

  beforeEach(async () => {
    await preAccrue(gToken);
  });

  describe("accrueInterest", () => {
    it("reverts if the interest rate is absurdly high", async () => {
      await pretendTimestamp(gToken, blockTimestamp, 1);
      expect(await call(gToken, "getBorrowRateMaxMantissa")).toEqualNumber(
        avaxMantissa(0.000005)
      ); // 0.0005% per block
      await setBorrowRate(gToken, 0.001e-2); // 0.0010% per block
      await expect(send(gToken, "accrueInterest")).rejects.toRevert(
        "revert borrow rate is absurdly high"
      );
    });

    it("fails if new borrow rate calculation fails", async () => {
      await pretendTimestamp(gToken, blockTimestamp, 1);
      await send(gToken.interestRateModel, "setFailBorrowRate", [true]);
      await expect(send(gToken, "accrueInterest")).rejects.toRevert(
        "revert INTEREST_RATE_MODEL_ERROR"
      );
    });

    it("fails if simple interest factor calculation fails", async () => {
      await pretendTimestamp(gToken, blockTimestamp, 5e70);
      await expect(send(gToken, "accrueInterest")).rejects.toRevert(
        "revert multiplication overflow"
      );
    });

    it("fails if new borrow index calculation fails", async () => {
      await pretendTimestamp(gToken, blockTimestamp, 5e60);
      await expect(send(gToken, "accrueInterest")).rejects.toRevert(
        "revert multiplication overflow"
      );
    });

    it("fails if new borrow interest index calculation fails", async () => {
      await pretendTimestamp(gToken);
      await send(gToken, "harnessSetBorrowIndex", [UInt256Max()]);
      await expect(send(gToken, "accrueInterest")).rejects.toRevert(
        "revert multiplication overflow"
      );
    });

    it("fails if interest accumulated calculation fails", async () => {
      await send(gToken, "harnessExchangeRateDetails", [0, UInt256Max(), 0]);
      await pretendTimestamp(gToken);
      await expect(send(gToken, "accrueInterest")).rejects.toRevert(
        "revert multiplication overflow"
      );
    });

    it("fails if new total borrows calculation fails", async () => {
      await setBorrowRate(gToken, 1e-18);
      await pretendTimestamp(gToken);
      await send(gToken, "harnessExchangeRateDetails", [0, UInt256Max(), 0]);
      await expect(send(gToken, "accrueInterest")).rejects.toRevert(
        "revert addition overflow"
      );
    });

    it("fails if interest accumulated for reserves calculation fails", async () => {
      await setBorrowRate(gToken, 0.000001);
      await send(gToken, "harnessExchangeRateDetails", [
        0,
        avaxUnsigned(1e30),
        UInt256Max(),
      ]);
      await send(gToken, "harnessSetReserveFactorFresh", [avaxUnsigned(1e10)]);
      await pretendTimestamp(gToken, blockTimestamp, 5e20);
      await expect(send(gToken, "accrueInterest")).rejects.toRevert(
        "revert addition overflow"
      );
    });

    it("fails if new total reserves calculation fails", async () => {
      await setBorrowRate(gToken, 1e-18);
      await send(gToken, "harnessExchangeRateDetails", [
        0,
        avaxUnsigned(1e56),
        UInt256Max(),
      ]);
      await send(gToken, "harnessSetReserveFactorFresh", [avaxUnsigned(1e17)]);
      await pretendTimestamp(gToken);
      await expect(send(gToken, "accrueInterest")).rejects.toRevert(
        "revert addition overflow"
      );
    });

    it("succeeds and saves updated values in storage on success", async () => {
      const startingTotalBorrows = 1e22;
      const startingTotalReserves = 1e20;
      const reserveFactor = 1e17;

      await send(gToken, "harnessExchangeRateDetails", [
        0,
        avaxUnsigned(startingTotalBorrows),
        avaxUnsigned(startingTotalReserves),
      ]);
      await send(gToken, "harnessSetReserveFactorFresh", [
        avaxUnsigned(reserveFactor),
      ]);
      await pretendTimestamp(gToken);

      const expectedAccrualBlockTimestamp = blockTimestamp + 1;
      const expectedBorrowIndex = borrowIndex + borrowIndex * borrowRate;
      const expectedTotalBorrows =
        startingTotalBorrows + startingTotalBorrows * borrowRate;
      const expectedTotalReserves =
        startingTotalReserves +
        (startingTotalBorrows * borrowRate * reserveFactor) / 1e18;

      const receipt = await send(gToken, "accrueInterest");
      expect(receipt).toSucceed();
      expect(receipt).toHaveLog("AccrueInterest", {
        cashPrior: 0,
        interestAccumulated: avaxUnsigned(expectedTotalBorrows)
          .minus(avaxUnsigned(startingTotalBorrows))
          .toFixed(),
        borrowIndex: avaxUnsigned(expectedBorrowIndex).toFixed(),
        totalBorrows: avaxUnsigned(expectedTotalBorrows).toFixed(),
      });
      expect(await call(gToken, "accrualBlockTimestamp")).toEqualNumber(
        expectedAccrualBlockTimestamp
      );
      expect(await call(gToken, "borrowIndex")).toEqualNumber(
        expectedBorrowIndex
      );
      expect(await call(gToken, "totalBorrows")).toEqualNumber(
        expectedTotalBorrows
      );
      expect(await call(gToken, "totalReserves")).toEqualNumber(
        expectedTotalReserves
      );
    });
  });
});
