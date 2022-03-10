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
} = require("../Utils/BankerJoe");

const exchangeRate = 50e3;
const mintAmount = avaxUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);

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

async function mintFresh(jToken, minter, mintAmount) {
  return send(jToken, "harnessMintFresh", [minter, mintAmount]);
}

async function redeemFreshTokens(jToken, redeemer, redeemTokens, redeemAmount) {
  return send(jToken, "harnessRedeemFresh", [redeemer, redeemTokens, 0]);
}

async function redeemFreshAmount(jToken, redeemer, redeemTokens, redeemAmount) {
  return send(jToken, "harnessRedeemFresh", [redeemer, 0, redeemAmount]);
}

describe("GToken", function () {
  let root, minter, accounts;
  let jToken;
  beforeEach(async () => {
    [root, minter, ...accounts] = saddle.accounts;
    jToken = await makeGToken({
      kind: "jjlp",
      gTrollerOpts: { kind: "bool" },
      exchangeRate,
    });
  });

  describe("mintFresh", () => {
    beforeEach(async () => {
      await preMint(jToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("fails if gTroller tells it to", async () => {
      await send(jToken.gTroller, "setMintAllowed", [false]);
      expect(await mintFresh(jToken, minter, mintAmount)).toHaveTrollReject(
        "MINT_JOETROLLER_REJECTION",
        "MATH_ERROR"
      );
    });

    it("proceeds if gTroller tells it to", async () => {
      await expect(await mintFresh(jToken, minter, mintAmount)).toSucceed();
    });

    it("fails if not fresh", async () => {
      await fastForward(jToken);
      expect(await mintFresh(jToken, minter, mintAmount)).toHaveTokenFailure(
        "MARKET_NOT_FRESH",
        "MINT_FRESHNESS_CHECK"
      );
    });

    it("continues if fresh", async () => {
      expect(await send(jToken, "accrueInterest")).toSucceed();
      expect(await mintFresh(jToken, minter, mintAmount)).toSucceed();
    });

    it("fails if insufficient approval", async () => {
      expect(
        await send(jToken.underlying, "approve", [jToken._address, 1], {
          from: minter,
        })
      ).toSucceed();
      await expect(mintFresh(jToken, minter, mintAmount)).rejects.toRevert(
        "revert Insufficient allowance"
      );
    });

    it("fails if insufficient balance", async () => {
      await setBalance(jToken.underlying, minter, 1);
      await expect(mintFresh(jToken, minter, mintAmount)).rejects.toRevert(
        "revert Insufficient balance"
      );
    });

    it("proceeds if sufficient approval and balance", async () => {
      expect(await mintFresh(jToken, minter, mintAmount)).toSucceed();
    });

    it("fails if exchange calculation fails", async () => {
      expect(await send(jToken, "harnessSetExchangeRate", [0])).toSucceed();
      await expect(mintFresh(jToken, minter, mintAmount)).rejects.toRevert(
        "revert divide by zero"
      );
    });

    it("fails if transferring in fails", async () => {
      await send(jToken.underlying, "harnessSetFailTransferFromAddress", [
        minter,
        true,
      ]);
      await expect(mintFresh(jToken, minter, mintAmount)).rejects.toRevert(
        "revert unexpected EIP-20 transfer in return"
      );
    });

    it("transfers the underlying cash, tokens, and emits Mint, Transfer events", async () => {
      const beforeBalances = await getBalances([jToken], [minter]);
      const result = await mintFresh(jToken, minter, mintAmount);
      const afterBalances = await getBalances([jToken], [minter]);
      expect(result).toSucceed();
      expect(result).toHaveLog("Mint", {
        minter,
        mintAmount: mintAmount.toString(),
        mintTokens: mintTokens.toString(),
      });
      expect(result).toHaveLog(["Transfer", 2], {
        from: jToken._address,
        to: minter,
        amount: mintTokens.toString(),
      });
      expect(afterBalances).toEqual(
        await adjustBalances(beforeBalances, [
          [jToken, minter, "cash", -mintAmount],
          [jToken, minter, "tokens", mintTokens],
          [jToken, "cash", mintAmount],
          [jToken, "tokens", mintTokens],
        ])
      );
    });
  });

  describe("mint", () => {
    beforeEach(async () => {
      await preMint(jToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("emits a mint failure if interest accrual fails", async () => {
      await send(jToken.interestRateModel, "setFailBorrowRate", [true]);
      await expect(quickMint(jToken, minter, mintAmount)).rejects.toRevert(
        "revert INTEREST_RATE_MODEL_ERROR"
      );
    });

    it("returns error from mintFresh without emitting any extra logs", async () => {
      await send(jToken.underlying, "harnessSetBalance", [minter, 1]);
      await expect(mintFresh(jToken, minter, mintAmount)).rejects.toRevert(
        "revert Insufficient balance"
      );
    });

    it("returns success from mintFresh and mints the correct number of tokens", async () => {
      expect(await quickMint(jToken, minter, mintAmount)).toSucceed();
      expect(mintTokens).not.toEqualNumber(0);
      expect(await balanceOf(jToken, minter)).toEqualNumber(mintTokens);
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(jToken, minter, mintAmount)).toHaveLog(
        "AccrueInterest",
        {
          borrowIndex: "1000000000000000000",
          cashPrior: "0",
          interestAccumulated: "0",
          totalBorrows: "0",
        }
      );
    });

    it("claims joe rewards after minting", async () => {
      const joeAddress = await call(jToken, "joe", []);
      const masterChefAddress = await call(jToken, "masterChef", []);

      const joe = await saddle.getContractAt("JoeToken", joeAddress);
      const masterChef = await saddle.getContractAt(
        "MasterChef",
        masterChefAddress
      );

      expect(await quickMint(jToken, minter, mintAmount)).toSucceed();
      expect(await balanceOf(joe, minter)).toEqualNumber(avaxUnsigned(0));

      await fastForward(masterChef, 1);

      expect(
        await send(jToken, "claimG", [minter], { from: minter })
      ).toSucceed();
      expect(await balanceOf(joe, minter)).toEqualNumber(
        await call(masterChef, "joePerSec", [])
      );
    });
  });

  [redeemFreshTokens, redeemFreshAmount].forEach((redeemFresh) => {
    describe(redeemFresh.name, () => {
      beforeEach(async () => {
        await preMint(jToken, minter, mintAmount, mintTokens, exchangeRate);
        expect(await mintFresh(jToken, minter, mintAmount)).toSucceed();
      });

      it("fails if gTroller tells it to", async () => {
        await send(jToken.gTroller, "setRedeemAllowed", [false]);
        expect(
          await redeemFresh(jToken, minter, mintTokens, mintAmount)
        ).toHaveTrollReject("REDEEM_JOETROLLER_REJECTION");
      });

      it("fails if not fresh", async () => {
        await fastForward(jToken);
        expect(
          await redeemFresh(jToken, minter, mintTokens, mintAmount)
        ).toHaveTokenFailure("MARKET_NOT_FRESH", "REDEEM_FRESHNESS_CHECK");
      });

      it("continues if fresh", async () => {
        expect(await send(jToken, "accrueInterest")).toSucceed();
        expect(
          await redeemFresh(jToken, minter, mintTokens, mintAmount)
        ).toSucceed();
      });

      it("fails if insufficient protocol cash to transfer out", async () => {
        const masterChefAddress = await call(jToken, "masterChef", []);
        const masterChef = await saddle.getContractAt(
          "MasterChef",
          masterChefAddress
        );
        await send(masterChef, "harnessSetUserAmount", [0, jToken._address, 1]);
        expect(
          await redeemFresh(jToken, minter, mintTokens, mintAmount)
        ).toHaveTokenFailure(
          "TOKEN_INSUFFICIENT_CASH",
          "REDEEM_TRANSFER_OUT_NOT_POSSIBLE"
        );
      });

      it("fails if exchange calculation fails", async () => {
        if (redeemFresh == redeemFreshTokens) {
          expect(
            await send(jToken, "harnessSetExchangeRate", [UInt256Max()])
          ).toSucceed();
          await expect(
            redeemFresh(jToken, minter, mintTokens, mintAmount)
          ).rejects.toRevert("revert multiplication overflow");
        } else {
          expect(await send(jToken, "harnessSetExchangeRate", [0])).toSucceed();
          await expect(
            redeemFresh(jToken, minter, mintTokens, mintAmount)
          ).rejects.toRevert("revert divide by zero");
        }
      });

      it("fails if transferring out fails", async () => {
        await send(jToken.underlying, "harnessSetFailTransferToAddress", [
          minter,
          true,
        ]);
        await expect(
          redeemFresh(jToken, minter, mintTokens, mintAmount)
        ).rejects.toRevert("revert unexpected EIP-20 transfer out return");
      });

      it("fails if total supply < redemption amount", async () => {
        await send(jToken, "harnessExchangeRateDetails", [0, 0, 0]);
        await expect(
          redeemFresh(jToken, minter, mintTokens, mintAmount)
        ).rejects.toRevert("revert subtraction underflow");
      });

      it("reverts if new account balance underflows", async () => {
        await send(jToken, "harnessSetBalance", [minter, 0]);
        await expect(
          redeemFresh(jToken, minter, mintTokens, mintAmount)
        ).rejects.toRevert("revert subtraction underflow");
      });

      it("transfers the underlying cash, tokens, and emits Redeem, Transfer events", async () => {
        const beforeBalances = await getBalances([jToken], [minter]);
        const result = await redeemFresh(
          jToken,
          minter,
          mintTokens,
          mintAmount
        );
        const afterBalances = await getBalances([jToken], [minter]);
        expect(result).toSucceed();
        expect(result).toHaveLog("Redeem", {
          redeemer: minter,
          redeemAmount: mintAmount.toString(),
          redeemTokens: mintTokens.toString(),
        });
        expect(result).toHaveLog(["Transfer", 3], {
          from: minter,
          to: jToken._address,
          amount: mintTokens.toString(),
        });
        expect(afterBalances).toEqual(
          await adjustBalances(beforeBalances, [
            [jToken, minter, "cash", mintAmount],
            [jToken, minter, "tokens", -mintTokens],
            [jToken, "cash", -mintAmount],
            [jToken, "tokens", -mintTokens],
          ])
        );
      });
    });
  });

  describe("redeem", () => {
    beforeEach(async () => {
      await preMint(jToken, minter, mintAmount, mintTokens, exchangeRate);
      expect(await mintFresh(jToken, minter, mintAmount)).toSucceed();
    });

    it("emits a redeem failure if interest accrual fails", async () => {
      await send(jToken.interestRateModel, "setFailBorrowRate", [true]);
      await fastForward(jToken, 1);
      await expect(
        send(jToken, "redeem", [mintTokens], { from: minter })
      ).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from redeemFresh without emitting any extra logs", async () => {
      const masterChefAddress = await call(jToken, "masterChef", []);
      const masterChef = await saddle.getContractAt(
        "MasterChef",
        masterChefAddress
      );
      await send(masterChef, "harnessSetUserAmount", [0, jToken._address, 1]);
      expect(
        await send(jToken, "redeem", [mintTokens], { from: minter })
      ).toHaveTokenFailure(
        "TOKEN_INSUFFICIENT_CASH",
        "REDEEM_TRANSFER_OUT_NOT_POSSIBLE"
      );
    });

    it("returns success from redeemFresh and redeems the right amount", async () => {
      expect(
        await send(jToken, "redeem", [mintTokens], { from: minter })
      ).toSucceed();
      expect(await balanceOf(jToken.underlying, minter)).toEqualNumber(
        mintAmount
      );
    });

    it("returns success from redeemFresh and redeems the right amount of underlying", async () => {
      expect(
        await send(jToken, "redeemUnderlying", [mintAmount], { from: minter })
      ).toSucceed();
      expect(await balanceOf(jToken.underlying, minter)).toEqualNumber(
        mintAmount
      );
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(jToken, minter, mintAmount)).toHaveLog(
        "AccrueInterest",
        {
          borrowIndex: "1000000000000000000",
          cashPrior: "100000",
          interestAccumulated: "0",
          totalBorrows: "0",
        }
      );
    });

    it("claims joe rewards after redeeming", async () => {
      const joeAddress = await call(jToken, "joe", []);
      const masterChefAddress = await call(jToken, "masterChef", []);

      const joe = await saddle.getContractAt("JoeToken", joeAddress);
      const masterChef = await saddle.getContractAt(
        "MasterChef",
        masterChefAddress
      );

      await fastForward(masterChef, 1);

      expect(
        await send(jToken, "redeem", [mintTokens], { from: minter })
      ).toSucceed();
      expect(await balanceOf(joe, minter)).toEqualNumber(avaxUnsigned(0));

      await fastForward(masterChef, 1);
      expect(
        await send(jToken, "claimG", [minter], { from: minter })
      ).toSucceed();
      expect(await balanceOf(joe, minter)).toEqualNumber(
        await call(masterChef, "joePerSec", [])
      );
    });
  });
});
