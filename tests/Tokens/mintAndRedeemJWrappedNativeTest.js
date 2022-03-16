const {
  avaxGasCost,
  avaxMantissa,
  avaxUnsigned,
} = require("../Utils/Avalanche");

const {
  makeGToken,
  fastForward,
  setBalance,
  setAvaxBalance,
  getBalances,
  adjustBalances,
} = require("../Utils/BankerJoe");

const exchangeRate = 5;
const mintAmount = avaxUnsigned(1e5);
const mintTokens = mintAmount.dividedBy(exchangeRate);
const redeemTokens = avaxUnsigned(10e3);
const redeemAmount = redeemTokens.multipliedBy(exchangeRate);

async function preMint(gToken, minter, mintAmount, mintTokens, exchangeRate) {
  await send(gToken.gTroller, "setMintAllowed", [true]);
  await send(gToken.gTroller, "setMintVerify", [true]);
  await send(gToken.interestRateModel, "setFailBorrowRate", [false]);
  await send(gToken.underlying, "deposit", [], {
    from: minter,
    value: mintAmount,
  });
  await send(gToken.underlying, "approve", [gToken._address, mintAmount], {
    from: minter,
  });
  await send(gToken, "harnessSetBalance", [minter, 0]);
  await send(gToken, "harnessSetExchangeRate", [avaxMantissa(exchangeRate)]);
}

async function mintNative(gToken, minter, mintAmount) {
  return send(gToken, "mintNative", [], { from: minter, value: mintAmount });
}

async function mint(gToken, minter, mintAmount) {
  return send(gToken, "mint", [mintAmount], { from: minter });
}

async function preRedeem(
  gToken,
  redeemer,
  redeemTokens,
  redeemAmount,
  exchangeRate
) {
  const root = saddle.account;
  await send(gToken.gTroller, "setRedeemAllowed", [true]);
  await send(gToken.gTroller, "setRedeemVerify", [true]);
  await send(gToken.interestRateModel, "setFailBorrowRate", [false]);
  await send(gToken, "harnessSetExchangeRate", [avaxMantissa(exchangeRate)]);
  await send(gToken.underlying, "deposit", [], {
    from: root,
    value: redeemAmount,
  });
  await send(gToken.underlying, "harnessSetBalance", [
    gToken._address,
    redeemAmount,
  ]);
  await send(gToken, "harnessSetTotalSupply", [redeemTokens]);
  await setBalance(gToken, redeemer, redeemTokens);
}

async function redeemGTokensNative(
  gToken,
  redeemer,
  redeemTokens,
  redeemAmount
) {
  return send(gToken, "redeemNative", [redeemTokens], { from: redeemer });
}

async function redeemGTokens(gToken, redeemer, redeemTokens, redeemAmount) {
  return send(gToken, "redeem", [redeemTokens], { from: redeemer });
}

async function redeemUnderlyingNative(
  gToken,
  redeemer,
  redeemTokens,
  redeemAmount
) {
  return send(gToken, "redeemUnderlyingNative", [redeemAmount], {
    from: redeemer,
  });
}

async function redeemUnderlying(gToken, redeemer, redeemTokens, redeemAmount) {
  return send(gToken, "redeemUnderlying", [redeemAmount], { from: redeemer });
}

describe("CWrappedNative", () => {
  let root, minter, redeemer, accounts;
  let gToken;

  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    gToken = await makeGToken({
      kind: "jwrapped",
      gTrollerOpts: { kind: "bool" },
      exchangeRate,
    });
    await fastForward(gToken, 1);
  });

  [mintNative, mint].forEach((mint) => {
    describe(mint.name, () => {
      beforeEach(async () => {
        await preMint(gToken, minter, mintAmount, mintTokens, exchangeRate);
      });

      it("reverts if interest accrual fails", async () => {
        await send(gToken.interestRateModel, "setFailBorrowRate", [true]);
        await expect(mint(gToken, minter, mintAmount)).rejects.toRevert(
          "revert INTEREST_RATE_MODEL_ERROR"
        );
      });
    });
  });

  describe("mint", () => {
    beforeEach(async () => {
      await preMint(gToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("mint", async () => {
      const beforeBalances = await getBalances([gToken], [minter]);
      const receipt = await mint(gToken, minter, mintAmount);
      const afterBalances = await getBalances([gToken], [minter]);
      expect(receipt).toSucceed();
      expect(mintTokens).not.toEqualNumber(0);
      expect(afterBalances).toEqual(
        await adjustBalances(beforeBalances, [
          [gToken, "tokens", mintTokens],
          [gToken, "cash", mintAmount],
          [gToken, minter, "cash", -mintAmount],
          [gToken, minter, "avax", -(await avaxGasCost(receipt))],
          [gToken, minter, "tokens", mintTokens],
        ])
      );
    });

    it("mintNative", async () => {
      const beforeBalances = await getBalances([gToken], [minter]);
      const receipt = await mintNative(gToken, minter, mintAmount);
      const afterBalances = await getBalances([gToken], [minter]);
      expect(receipt).toSucceed();
      expect(mintTokens).not.toEqualNumber(0);
      expect(afterBalances).toEqual(
        await adjustBalances(beforeBalances, [
          [gToken, "tokens", mintTokens],
          [gToken, "cash", mintAmount],
          [
            gToken,
            minter,
            "avax",
            -mintAmount.plus(await avaxGasCost(receipt)),
          ],
          [gToken, minter, "tokens", mintTokens],
        ])
      );
    });
  });

  [redeemGTokensNative, redeemUnderlyingNative].forEach((redeem) => {
    describe(redeem.name, () => {
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
          redeem(gToken, redeemer, redeemTokens, redeemAmount)
        ).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns error from redeemFresh without emitting any extra logs", async () => {
        await expect(
          redeem(
            gToken,
            redeemer,
            redeemTokens.multipliedBy(5),
            redeemAmount.multipliedBy(5)
          )
        ).rejects.toRevert("revert subtraction underflow");
      });

      it("returns success from redeemFresh and redeems the correct amount", async () => {
        await fastForward(gToken);
        const beforeBalances = await getBalances([gToken], [redeemer]);
        const receipt = await redeem(
          gToken,
          redeemer,
          redeemTokens,
          redeemAmount
        );
        expect(receipt).toTokenSucceed();
        const afterBalances = await getBalances([gToken], [redeemer]);
        expect(redeemTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(
          await adjustBalances(beforeBalances, [
            [gToken, "tokens", -redeemTokens],
            [gToken, "cash", -redeemAmount],
            [
              gToken,
              redeemer,
              "avax",
              redeemAmount.minus(await avaxGasCost(receipt)),
            ],
            [gToken, redeemer, "tokens", -redeemTokens],
          ])
        );
      });
    });
  });

  [redeemGTokens, redeemUnderlying].forEach((redeem) => {
    describe(redeem.name, () => {
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
          redeem(gToken, redeemer, redeemTokens, redeemAmount)
        ).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns error from redeemFresh without emitting any extra logs", async () => {
        await expect(
          redeem(
            gToken,
            redeemer,
            redeemTokens.multipliedBy(5),
            redeemAmount.multipliedBy(5)
          )
        ).rejects.toRevert("revert subtraction underflow");
      });

      it("returns success from redeemFresh and redeems the correct amount", async () => {
        await fastForward(gToken);
        const beforeBalances = await getBalances([gToken], [redeemer]);
        const receipt = await redeem(
          gToken,
          redeemer,
          redeemTokens,
          redeemAmount
        );
        expect(receipt).toTokenSucceed();
        const afterBalances = await getBalances([gToken], [redeemer]);
        expect(redeemTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(
          await adjustBalances(beforeBalances, [
            [gToken, "tokens", -redeemTokens],
            [gToken, "cash", -redeemAmount],
            [gToken, redeemer, "cash", redeemAmount],
            [gToken, redeemer, "avax", -(await avaxGasCost(receipt))],
            [gToken, redeemer, "tokens", -redeemTokens],
          ])
        );
      });
    });
  });
});
