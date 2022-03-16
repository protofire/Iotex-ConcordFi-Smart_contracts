const { avaxGasCost, avaxUnsigned, UInt256Max } = require("../Utils/Avalanche");

const {
  makeGToken,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  pretendBorrow,
  preApprove,
} = require("../Utils/BankerJoe");

const repayAmount = avaxUnsigned(10e2);
const seizeAmount = repayAmount;
const seizeTokens = seizeAmount.multipliedBy(4); // forced

async function preLiquidate(
  gToken,
  liquidator,
  borrower,
  repayAmount,
  gTokenCollateral
) {
  // setup for success in liquidating
  await send(gToken.gTroller, "setLiquidateBorrowAllowed", [true]);
  await send(gToken.gTroller, "setLiquidateBorrowVerify", [true]);
  await send(gToken.gTroller, "setRepayBorrowAllowed", [true]);
  await send(gToken.gTroller, "setRepayBorrowVerify", [true]);
  await send(gToken.gTroller, "setSeizeAllowed", [true]);
  await send(gToken.gTroller, "setSeizeVerify", [true]);
  await send(gToken.gTroller, "setFailCalculateSeizeTokens", [false]);
  await send(gToken.underlying, "harnessSetFailTransferFromAddress", [
    liquidator,
    false,
  ]);
  await send(gToken.interestRateModel, "setFailBorrowRate", [false]);
  await send(gTokenCollateral.interestRateModel, "setFailBorrowRate", [false]);
  await send(gTokenCollateral.gTroller, "setCalculatedSeizeTokens", [
    seizeTokens,
  ]);
  await setBalance(gTokenCollateral, liquidator, 0);
  await setBalance(gTokenCollateral, borrower, seizeTokens);
  await pretendBorrow(gTokenCollateral, borrower, 0, 1, 0);
  await pretendBorrow(gToken, borrower, 1, 1, repayAmount);
  await preApprove(gToken, liquidator, repayAmount);
}

async function liquidateFresh(
  gToken,
  liquidator,
  borrower,
  repayAmount,
  gTokenCollateral
) {
  return send(gToken, "harnessLiquidateBorrowFresh", [
    liquidator,
    borrower,
    repayAmount,
    gTokenCollateral._address,
  ]);
}

async function liquidate(
  gToken,
  liquidator,
  borrower,
  repayAmount,
  gTokenCollateral
) {
  // make sure to have a block delta so we accrue interest
  await fastForward(gToken, 1);
  await fastForward(gTokenCollateral, 1);
  return send(
    gToken,
    "liquidateBorrow",
    [borrower, repayAmount, gTokenCollateral._address],
    { from: liquidator }
  );
}

async function seize(gToken, liquidator, borrower, seizeAmount) {
  return send(gToken, "seize", [liquidator, borrower, seizeAmount]);
}

describe("GToken", function () {
  let root, liquidator, borrower, accounts;
  let gToken, gTokenCollateral;

  beforeEach(async () => {
    [root, liquidator, borrower, ...accounts] = saddle.accounts;
    gToken = await makeGToken({ gTrollerOpts: { kind: "bool" } });
    gTokenCollateral = await makeGToken({ gTroller: gToken.gTroller });
  });

  beforeEach(async () => {
    await preLiquidate(
      gToken,
      liquidator,
      borrower,
      repayAmount,
      gTokenCollateral
    );
  });

  describe("liquidateBorrowFresh", () => {
    it("fails if gTroller tells it to", async () => {
      await send(gToken.gTroller, "setLiquidateBorrowAllowed", [false]);
      expect(
        await liquidateFresh(
          gToken,
          liquidator,
          borrower,
          repayAmount,
          gTokenCollateral
        )
      ).toHaveTrollReject("LIQUIDATE_JOETROLLER_REJECTION", "MATH_ERROR");
    });

    it("proceeds if gTroller tells it to", async () => {
      expect(
        await liquidateFresh(
          gToken,
          liquidator,
          borrower,
          repayAmount,
          gTokenCollateral
        )
      ).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(gToken);
      expect(
        await liquidateFresh(
          gToken,
          liquidator,
          borrower,
          repayAmount,
          gTokenCollateral
        )
      ).toHaveTokenFailure("MARKET_NOT_FRESH", "LIQUIDATE_FRESHNESS_CHECK");
    });

    it("fails if collateral market not fresh", async () => {
      await fastForward(gToken);
      await fastForward(gTokenCollateral);
      await send(gToken, "accrueInterest");
      expect(
        await liquidateFresh(
          gToken,
          liquidator,
          borrower,
          repayAmount,
          gTokenCollateral
        )
      ).toHaveTokenFailure(
        "MARKET_NOT_FRESH",
        "LIQUIDATE_COLLATERAL_FRESHNESS_CHECK"
      );
    });

    it("fails if borrower is equal to liquidator", async () => {
      expect(
        await liquidateFresh(
          gToken,
          borrower,
          borrower,
          repayAmount,
          gTokenCollateral
        )
      ).toHaveTokenFailure(
        "INVALID_ACCOUNT_PAIR",
        "LIQUIDATE_LIQUIDATOR_IS_BORROWER"
      );
    });

    it("fails if repayAmount = 0", async () => {
      expect(
        await liquidateFresh(gToken, liquidator, borrower, 0, gTokenCollateral)
      ).toHaveTokenFailure(
        "INVALID_CLOSE_AMOUNT_REQUESTED",
        "LIQUIDATE_CLOSE_AMOUNT_IS_ZERO"
      );
    });

    it("fails if calculating seize tokens fails and does not adjust balances", async () => {
      const beforeBalances = await getBalances(
        [gToken, gTokenCollateral],
        [liquidator, borrower]
      );
      await send(gToken.gTroller, "setFailCalculateSeizeTokens", [true]);
      await expect(
        liquidateFresh(
          gToken,
          liquidator,
          borrower,
          repayAmount,
          gTokenCollateral
        )
      ).rejects.toRevert(
        "revert LIQUIDATE_JOETROLLER_CALCULATE_AMOUNT_SEIZE_FAILED"
      );
      const afterBalances = await getBalances(
        [gToken, gTokenCollateral],
        [liquidator, borrower]
      );
      expect(afterBalances).toEqual(beforeBalances);
    });

    it("fails if repay fails", async () => {
      await send(gToken.gTroller, "setRepayBorrowAllowed", [false]);
      expect(
        await liquidateFresh(
          gToken,
          liquidator,
          borrower,
          repayAmount,
          gTokenCollateral
        )
      ).toHaveTrollReject("LIQUIDATE_REPAY_BORROW_FRESH_FAILED");
    });

    it("reverts if seize fails", async () => {
      await send(gToken.gTroller, "setSeizeAllowed", [false]);
      await expect(
        liquidateFresh(
          gToken,
          liquidator,
          borrower,
          repayAmount,
          gTokenCollateral
        )
      ).rejects.toRevert("revert token seizure failed");
    });

    xit("reverts if liquidateBorrowVerify fails", async () => {
      await send(gToken.gTroller, "setLiquidateBorrowVerify", [false]);
      await expect(
        liquidateFresh(
          gToken,
          liquidator,
          borrower,
          repayAmount,
          gTokenCollateral
        )
      ).rejects.toRevert(
        "revert liquidateBorrowVerify rejected liquidateBorrow"
      );
    });

    it("transfers the cash, borrows, tokens, and emits Transfer, LiquidateBorrow events", async () => {
      const beforeBalances = await getBalances(
        [gToken, gTokenCollateral],
        [liquidator, borrower]
      );
      const result = await liquidateFresh(
        gToken,
        liquidator,
        borrower,
        repayAmount,
        gTokenCollateral
      );
      const afterBalances = await getBalances(
        [gToken, gTokenCollateral],
        [liquidator, borrower]
      );
      expect(result).toSucceed();
      expect(result).toHaveLog("LiquidateBorrow", {
        liquidator: liquidator,
        borrower: borrower,
        repayAmount: repayAmount.toString(),
        gTokenCollateral: gTokenCollateral._address,
        seizeTokens: seizeTokens.toString(),
      });
      expect(result).toHaveLog(["Transfer", 0], {
        from: liquidator,
        to: gToken._address,
        amount: repayAmount.toString(),
      });
      expect(result).toHaveLog(["Transfer", 1], {
        from: borrower,
        to: liquidator,
        amount: seizeTokens.toString(),
      });
      expect(afterBalances).toEqual(
        await adjustBalances(beforeBalances, [
          [gToken, "cash", repayAmount],
          [gToken, "borrows", -repayAmount],
          [gToken, liquidator, "cash", -repayAmount],
          [gTokenCollateral, liquidator, "tokens", seizeTokens],
          [gToken, borrower, "borrows", -repayAmount],
          [gTokenCollateral, borrower, "tokens", -seizeTokens],
        ])
      );
    });
  });

  describe("liquidateBorrow", () => {
    it("emits a liquidation failure if borrowed asset interest accrual fails", async () => {
      await send(gToken.interestRateModel, "setFailBorrowRate", [true]);
      await expect(
        liquidate(gToken, liquidator, borrower, repayAmount, gTokenCollateral)
      ).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("emits a liquidation failure if collateral asset interest accrual fails", async () => {
      await send(gTokenCollateral.interestRateModel, "setFailBorrowRate", [
        true,
      ]);
      await expect(
        liquidate(gToken, liquidator, borrower, repayAmount, gTokenCollateral)
      ).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from liquidateBorrowFresh without emitting any extra logs", async () => {
      expect(
        await liquidate(gToken, liquidator, borrower, 0, gTokenCollateral)
      ).toHaveTokenFailure(
        "INVALID_CLOSE_AMOUNT_REQUESTED",
        "LIQUIDATE_CLOSE_AMOUNT_IS_ZERO"
      );
    });

    it("returns success from liquidateBorrowFresh and transfers the correct amounts", async () => {
      const beforeBalances = await getBalances(
        [gToken, gTokenCollateral],
        [liquidator, borrower]
      );
      const result = await liquidate(
        gToken,
        liquidator,
        borrower,
        repayAmount,
        gTokenCollateral
      );
      const gasCost = await avaxGasCost(result);
      const afterBalances = await getBalances(
        [gToken, gTokenCollateral],
        [liquidator, borrower]
      );
      expect(result).toSucceed();
      expect(afterBalances).toEqual(
        await adjustBalances(beforeBalances, [
          [gToken, "cash", repayAmount],
          [gToken, "borrows", -repayAmount],
          [gToken, liquidator, "avax", -gasCost],
          [gToken, liquidator, "cash", -repayAmount],
          [gTokenCollateral, liquidator, "avax", -gasCost],
          [gTokenCollateral, liquidator, "tokens", seizeTokens],
          [gToken, borrower, "borrows", -repayAmount],
          [gTokenCollateral, borrower, "tokens", -seizeTokens],
        ])
      );
    });
  });

  describe("seize", () => {
    // XXX verify callers are properly checked

    it("fails if seize is not allowed", async () => {
      await send(gToken.gTroller, "setSeizeAllowed", [false]);
      expect(
        await seize(gTokenCollateral, liquidator, borrower, seizeTokens)
      ).toHaveTrollReject("LIQUIDATE_SEIZE_JOETROLLER_REJECTION", "MATH_ERROR");
    });

    it("fails if gTokenBalances[borrower] < amount", async () => {
      await setBalance(gTokenCollateral, borrower, 1);
      await expect(
        seize(gTokenCollateral, liquidator, borrower, seizeTokens)
      ).rejects.toRevert("revert subtraction underflow");
    });

    it("fails if gTokenBalances[liquidator] overflows", async () => {
      await setBalance(gTokenCollateral, liquidator, UInt256Max());
      await expect(
        seize(gTokenCollateral, liquidator, borrower, seizeTokens)
      ).rejects.toRevert("revert addition overflow");
    });

    it("succeeds, updates balances, and emits Transfer event", async () => {
      const beforeBalances = await getBalances(
        [gTokenCollateral],
        [liquidator, borrower]
      );
      const result = await seize(
        gTokenCollateral,
        liquidator,
        borrower,
        seizeTokens
      );
      const afterBalances = await getBalances(
        [gTokenCollateral],
        [liquidator, borrower]
      );
      expect(result).toSucceed();
      expect(result).toHaveLog("Transfer", {
        from: borrower,
        to: liquidator,
        amount: seizeTokens.toString(),
      });
      expect(afterBalances).toEqual(
        await adjustBalances(beforeBalances, [
          [gTokenCollateral, liquidator, "tokens", seizeTokens],
          [gTokenCollateral, borrower, "tokens", -seizeTokens],
        ])
      );
    });
  });
});
