const {
  avaxUnsigned,
  avaxMantissa,
  UInt256Max,
} = require("../Utils/Avalanche");

const {
  makeGToken,
  balanceOf,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  preApprove,
  quickMint,
  preSupply,
  quickRedeem,
  quickRedeemUnderlying,
} = require("../Utils/BankerJoe");

const exchangeRate = 50e3;
const mintAmount = avaxUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);
const redeemTokens = avaxUnsigned(10e3);
const redeemAmount = redeemTokens.multipliedBy(exchangeRate);

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

async function mintFresh(gToken, minter, mintAmount) {
  return send(gToken, "harnessMintFresh", [minter, mintAmount]);
}

async function preRedeem(
  gToken,
  redeemer,
  redeemTokens,
  redeemAmount,
  exchangeRate
) {
  await preSupply(gToken, redeemer, redeemTokens);
  await send(gToken.gTroller, "setRedeemAllowed", [true]);
  await send(gToken.gTroller, "setRedeemVerify", [true]);
  await send(gToken.interestRateModel, "setFailBorrowRate", [false]);
  await send(gToken.underlying, "harnessSetBalance", [
    gToken._address,
    redeemAmount,
  ]);
  await send(gToken.underlying, "harnessSetBalance", [redeemer, 0]);
  await send(gToken.underlying, "harnessSetFailTransferToAddress", [
    redeemer,
    false,
  ]);
  await send(gToken, "harnessSetExchangeRate", [avaxMantissa(exchangeRate)]);
}

async function redeemFreshTokens(gToken, redeemer, redeemTokens, redeemAmount) {
  return send(gToken, "harnessRedeemFresh", [redeemer, redeemTokens, 0]);
}

async function redeemFreshAmount(gToken, redeemer, redeemTokens, redeemAmount) {
  return send(gToken, "harnessRedeemFresh", [redeemer, 0, redeemAmount]);
}

describe("GToken", function () {
  let root, minter, redeemer, accounts;
  let gToken;
  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    gToken = await makeGToken({
      gTrollerOpts: { kind: "bool" },
      exchangeRate,
    });
  });

  describe("mintFresh", () => {
    beforeEach(async () => {
      await preMint(gToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("fails if gTroller tells it to", async () => {
      await send(gToken.gTroller, "setMintAllowed", [false]);
      expect(await mintFresh(gToken, minter, mintAmount)).toHaveTrollReject(
        "MINT_JOETROLLER_REJECTION",
        "MATH_ERROR"
      );
    });

    it("proceeds if gTroller tells it to", async () => {
      await expect(await mintFresh(gToken, minter, mintAmount)).toSucceed();
    });

    it("fails if not fresh", async () => {
      await fastForward(gToken);
      expect(await mintFresh(gToken, minter, mintAmount)).toHaveTokenFailure(
        "MARKET_NOT_FRESH",
        "MINT_FRESHNESS_CHECK"
      );
    });

    it("continues if fresh", async () => {
      await expect(await send(gToken, "accrueInterest")).toSucceed();
      expect(await mintFresh(gToken, minter, mintAmount)).toSucceed();
    });

    it("fails if insufficient approval", async () => {
      expect(
        await send(gToken.underlying, "approve", [gToken._address, 1], {
          from: minter,
        })
      ).toSucceed();
      await expect(mintFresh(gToken, minter, mintAmount)).rejects.toRevert(
        "revert Insufficient allowance"
      );
    });

    it("fails if insufficient balance", async () => {
      await setBalance(gToken.underlying, minter, 1);
      await expect(mintFresh(gToken, minter, mintAmount)).rejects.toRevert(
        "revert Insufficient balance"
      );
    });

    it("proceeds if sufficient approval and balance", async () => {
      expect(await mintFresh(gToken, minter, mintAmount)).toSucceed();
    });

    it("fails if exchange calculation fails", async () => {
      expect(await send(gToken, "harnessSetExchangeRate", [0])).toSucceed();
      await expect(mintFresh(gToken, minter, mintAmount)).rejects.toRevert(
        "revert divide by zero"
      );
    });

    it("fails if transferring in fails", async () => {
      await send(gToken.underlying, "harnessSetFailTransferFromAddress", [
        minter,
        true,
      ]);
      await expect(mintFresh(gToken, minter, mintAmount)).rejects.toRevert(
        "revert TOKEN_TRANSFER_IN_FAILED"
      );
    });

    it("transfers the underlying cash, tokens, and emits Mint, Transfer events", async () => {
      const beforeBalances = await getBalances([gToken], [minter]);
      const result = await mintFresh(gToken, minter, mintAmount);
      const afterBalances = await getBalances([gToken], [minter]);
      expect(result).toSucceed();
      expect(result).toHaveLog("Mint", {
        minter,
        mintAmount: mintAmount.toString(),
        mintTokens: mintTokens.toString(),
      });
      expect(result).toHaveLog(["Transfer", 1], {
        from: gToken._address,
        to: minter,
        amount: mintTokens.toString(),
      });
      expect(afterBalances).toEqual(
        await adjustBalances(beforeBalances, [
          [gToken, minter, "cash", -mintAmount],
          [gToken, minter, "tokens", mintTokens],
          [gToken, "cash", mintAmount],
          [gToken, "tokens", mintTokens],
        ])
      );
    });
  });

  describe("mint", () => {
    beforeEach(async () => {
      await preMint(gToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("emits a mint failure if interest accrual fails", async () => {
      await send(gToken.interestRateModel, "setFailBorrowRate", [true]);
      await expect(quickMint(gToken, minter, mintAmount)).rejects.toRevert(
        "revert INTEREST_RATE_MODEL_ERROR"
      );
    });

    it("returns error from mintFresh without emitting any extra logs", async () => {
      await send(gToken.underlying, "harnessSetBalance", [minter, 1]);
      await expect(mintFresh(gToken, minter, mintAmount)).rejects.toRevert(
        "revert Insufficient balance"
      );
    });

    it("returns success from mintFresh and mints the correct number of tokens", async () => {
      expect(await quickMint(gToken, minter, mintAmount)).toSucceed();
      expect(mintTokens).not.toEqualNumber(0);
      expect(await balanceOf(gToken, minter)).toEqualNumber(mintTokens);
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(gToken, minter, mintAmount)).toHaveLog(
        "AccrueInterest",
        {
          borrowIndex: "1000000000000000000",
          cashPrior: "0",
          interestAccumulated: "0",
          totalBorrows: "0",
        }
      );
    });
  });

  [redeemFreshTokens, redeemFreshAmount].forEach((redeemFresh) => {
    describe(redeemFresh.name, () => {
      beforeEach(async () => {
        await preRedeem(
          gToken,
          redeemer,
          redeemTokens,
          redeemAmount,
          exchangeRate
        );
      });

      it("fails if gTroller tells it to", async () => {
        await send(gToken.gTroller, "setRedeemAllowed", [false]);
        expect(
          await redeemFresh(gToken, redeemer, redeemTokens, redeemAmount)
        ).toHaveTrollReject("REDEEM_JOETROLLER_REJECTION");
      });

      it("fails if not fresh", async () => {
        await fastForward(gToken);
        expect(
          await redeemFresh(gToken, redeemer, redeemTokens, redeemAmount)
        ).toHaveTokenFailure("MARKET_NOT_FRESH", "REDEEM_FRESHNESS_CHECK");
      });

      it("continues if fresh", async () => {
        await expect(await send(gToken, "accrueInterest")).toSucceed();
        expect(
          await redeemFresh(gToken, redeemer, redeemTokens, redeemAmount)
        ).toSucceed();
      });

      it("fails if insufficient protocol cash to transfer out", async () => {
        await send(gToken.underlying, "harnessSetBalance", [
          gToken._address,
          1,
        ]);
        expect(
          await redeemFresh(gToken, redeemer, redeemTokens, redeemAmount)
        ).toHaveTokenFailure(
          "TOKEN_INSUFFICIENT_CASH",
          "REDEEM_TRANSFER_OUT_NOT_POSSIBLE"
        );
      });

      it("fails if exchange calculation fails", async () => {
        if (redeemFresh == redeemFreshTokens) {
          expect(
            await send(gToken, "harnessSetExchangeRate", [UInt256Max()])
          ).toSucceed();
          await expect(
            redeemFresh(gToken, redeemer, redeemTokens, redeemAmount)
          ).rejects.toRevert("revert multiplication overflow");
        } else {
          expect(await send(gToken, "harnessSetExchangeRate", [0])).toSucceed();
          await expect(
            redeemFresh(gToken, redeemer, redeemTokens, redeemAmount)
          ).rejects.toRevert("revert divide by zero");
        }
      });

      it("fails if transferring out fails", async () => {
        await send(gToken.underlying, "harnessSetFailTransferToAddress", [
          redeemer,
          true,
        ]);
        await expect(
          redeemFresh(gToken, redeemer, redeemTokens, redeemAmount)
        ).rejects.toRevert("revert TOKEN_TRANSFER_OUT_FAILED");
      });

      it("fails if total supply < redemption amount", async () => {
        await send(gToken, "harnessExchangeRateDetails", [0, 0, 0]);
        await expect(
          redeemFresh(gToken, redeemer, redeemTokens, redeemAmount)
        ).rejects.toRevert("revert subtraction underflow");
      });

      it("reverts if new account balance underflows", async () => {
        await send(gToken, "harnessSetBalance", [redeemer, 0]);
        await expect(
          redeemFresh(gToken, redeemer, redeemTokens, redeemAmount)
        ).rejects.toRevert("revert subtraction underflow");
      });

      it("transfers the underlying cash, tokens, and emits Redeem, Transfer events", async () => {
        const beforeBalances = await getBalances([gToken], [redeemer]);
        const result = await redeemFresh(
          gToken,
          redeemer,
          redeemTokens,
          redeemAmount
        );
        const afterBalances = await getBalances([gToken], [redeemer]);
        expect(result).toSucceed();
        expect(result).toHaveLog("Redeem", {
          redeemer,
          redeemAmount: redeemAmount.toString(),
          redeemTokens: redeemTokens.toString(),
        });
        expect(result).toHaveLog(["Transfer", 1], {
          from: redeemer,
          to: gToken._address,
          amount: redeemTokens.toString(),
        });
        expect(afterBalances).toEqual(
          await adjustBalances(beforeBalances, [
            [gToken, redeemer, "cash", redeemAmount],
            [gToken, redeemer, "tokens", -redeemTokens],
            [gToken, "cash", -redeemAmount],
            [gToken, "tokens", -redeemTokens],
          ])
        );
      });
    });
  });

  describe("redeem", () => {
    beforeEach(async () => {
      await preRedeem(
        gToken,
        redeemer,
        redeemTokens,
        redeemAmount,
        exchangeRate
      );
    });

    it("emits a redeem failure if interest accrual fails", async () => {
      await send(gToken.interestRateModel, "setFailBorrowRate", [true]);
      await expect(
        quickRedeem(gToken, redeemer, redeemTokens)
      ).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from redeemFresh without emitting any extra logs", async () => {
      await setBalance(gToken.underlying, gToken._address, 0);
      expect(
        await quickRedeem(gToken, redeemer, redeemTokens, { exchangeRate })
      ).toHaveTokenFailure(
        "TOKEN_INSUFFICIENT_CASH",
        "REDEEM_TRANSFER_OUT_NOT_POSSIBLE"
      );
    });

    it("returns success from redeemFresh and redeems the right amount", async () => {
      expect(
        await send(gToken.underlying, "harnessSetBalance", [
          gToken._address,
          redeemAmount,
        ])
      ).toSucceed();
      expect(
        await quickRedeem(gToken, redeemer, redeemTokens, { exchangeRate })
      ).toSucceed();
      expect(redeemAmount).not.toEqualNumber(0);
      expect(await balanceOf(gToken.underlying, redeemer)).toEqualNumber(
        redeemAmount
      );
    });

    it("returns success from redeemFresh and redeems the right amount of underlying", async () => {
      expect(
        await send(gToken.underlying, "harnessSetBalance", [
          gToken._address,
          redeemAmount,
        ])
      ).toSucceed();
      expect(
        await quickRedeemUnderlying(gToken, redeemer, redeemAmount, {
          exchangeRate,
        })
      ).toSucceed();
      expect(redeemAmount).not.toEqualNumber(0);
      expect(await balanceOf(gToken.underlying, redeemer)).toEqualNumber(
        redeemAmount
      );
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(gToken, minter, mintAmount)).toHaveLog(
        "AccrueInterest",
        {
          borrowIndex: "1000000000000000000",
          cashPrior: "500000000",
          interestAccumulated: "0",
          totalBorrows: "0",
        }
      );
    });
  });
});
