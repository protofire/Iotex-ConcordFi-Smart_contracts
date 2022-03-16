const {
  avaxUnsigned,
  avaxMantissa,
  mergeInterface,
} = require("../Utils/Avalanche");

const {
  makeGToken,
  makeFlashloanReceiver,
  balanceOf,
} = require("../Utils/BankerJoe");

describe("Flashloan test", function () {
  let gToken;
  let flashloanReceiver;
  let flashloanLender;
  let cash = 1000_000;
  let receiverBalance = 100;
  let reservesFactor = 0.5;

  beforeEach(async () => {
    gToken = await makeGToken({ kind: "jwrapped", supportMarket: true });
    flashloanReceiver = await makeFlashloanReceiver({ kind: "native" });
    flashloanLender = await deploy("FlashloanLender", [
      gToken.gTroller._address,
      saddle.accounts[0],
    ]);

    // so that we can format gToken event logs
    mergeInterface(flashloanReceiver, gToken);

    await send(gToken.underlying, "harnessSetBalance", [gToken._address, cash]);
    await send(gToken, "harnessSetBlockTimestamp", [avaxUnsigned(1e6)]);
    await send(gToken, "harnessSetAccrualBlockTimestamp", [avaxUnsigned(1e6)]);
    await send(gToken, "harnessSetReserveFactorFresh", [
      avaxMantissa(reservesFactor),
    ]);

    await send(gToken.underlying, "harnessSetBalance", [
      flashloanReceiver._address,
      receiverBalance,
    ]);
  });

  describe("internal cash equal underlying balance", () => {
    it("repay correctly", async () => {
      const borrowAmount = 10_000;
      const totalFee = 8;
      const reservesFee = 4;
      const result = await send(flashloanReceiver, "doFlashloan", [
        flashloanLender._address,
        gToken._address,
        borrowAmount,
        borrowAmount + totalFee,
      ]);

      expect(result).toHaveLog("Flashloan", {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      });

      expect(await balanceOf(gToken.underlying, gToken._address)).toEqualNumber(
        cash + totalFee
      );
      expect(await call(gToken, "getCash", [])).toEqualNumber(cash + totalFee);
      expect(await call(gToken, "totalReserves", [])).toEqualNumber(
        reservesFee
      );
      expect(
        await balanceOf(gToken.underlying, flashloanReceiver._address)
      ).toEqualNumber(receiverBalance - totalFee);
    });

    it("repay correctly, total fee is truncated", async () => {
      const borrowAmount = 1000;
      const totalFee = 0;
      const reservesFee = 0;
      const result = await send(flashloanReceiver, "doFlashloan", [
        flashloanLender._address,
        gToken._address,
        borrowAmount,
        borrowAmount + totalFee,
      ]);

      expect(result).toHaveLog("Flashloan", {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      });

      expect(await balanceOf(gToken.underlying, gToken._address)).toEqualNumber(
        cash + totalFee
      );
      expect(await call(gToken, "getCash", [])).toEqualNumber(cash + totalFee);
      expect(await call(gToken, "totalReserves", [])).toEqualNumber(
        reservesFee
      );
      expect(
        await balanceOf(gToken.underlying, flashloanReceiver._address)
      ).toEqualNumber(receiverBalance - totalFee);
    });

    it("repay correctly, reserve fee is truncated", async () => {
      const borrowAmount = 1250;
      const totalFee = 1;
      const reservesFee = 0;
      const result = await send(flashloanReceiver, "doFlashloan", [
        flashloanLender._address,
        gToken._address,
        borrowAmount,
        borrowAmount + totalFee,
      ]);

      expect(result).toHaveLog("Flashloan", {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      });

      expect(await balanceOf(gToken.underlying, gToken._address)).toEqualNumber(
        cash + totalFee
      );
      expect(await call(gToken, "getCash", [])).toEqualNumber(cash + totalFee);
      expect(await call(gToken, "totalReserves", [])).toEqualNumber(
        reservesFee
      );
      expect(
        await balanceOf(gToken.underlying, flashloanReceiver._address)
      ).toEqualNumber(receiverBalance - totalFee);
    });

    it("borrow exceed cash", async () => {
      const borrowAmount = cash + 1;
      const totalFee = 3;
      const result = send(flashloanReceiver, "doFlashloan", [
        flashloanLender._address,
        gToken._address,
        borrowAmount,
        borrowAmount + totalFee,
      ]);
      await expect(result).rejects.toRevert("revert INSUFFICIENT_LIQUIDITY");
    });
  });

  it("reject by gTroller", async () => {
    const borrowAmount = 10_000;
    const totalFee = 8;
    expect(
      await send(flashloanReceiver, "doFlashloan", [
        flashloanLender._address,
        gToken._address,
        borrowAmount,
        borrowAmount + totalFee,
      ])
    ).toSucceed();

    await send(gToken.gTroller, "_setFlashloanPaused", [gToken._address, true]);

    await expect(
      send(flashloanReceiver, "doFlashloan", [
        flashloanLender._address,
        gToken._address,
        borrowAmount,
        borrowAmount + totalFee,
      ])
    ).rejects.toRevert("revert flashloan is paused");

    await send(gToken.gTroller, "_setFlashloanPaused", [
      gToken._address,
      false,
    ]);

    expect(
      await send(flashloanReceiver, "doFlashloan", [
        flashloanLender._address,
        gToken._address,
        borrowAmount,
        borrowAmount + totalFee,
      ])
    ).toSucceed();
  });
});

describe("Flashloan re-entry test", () => {
  let gToken;
  let cash = 1000_000;

  beforeEach(async () => {
    gToken = await makeGToken({ kind: "jwrapped", supportMarket: true });
    flashloanLender = await deploy("FlashloanLender", [
      gToken.gTroller._address,
      saddle.accounts[0],
    ]);
    await send(gToken.underlying, "harnessSetBalance", [gToken._address, cash]);
    await send(gToken, "harnessSetBlockTimestamp", [avaxUnsigned(1e6)]);
    await send(gToken, "harnessSetAccrualBlockTimestamp", [avaxUnsigned(1e6)]);
  });

  it("flashloan and mint", async () => {
    const flashloanAndMint = await makeFlashloanReceiver({
      kind: "flashloan-and-mint-native",
    });
    const borrowAmount = 100;
    const result = send(flashloanAndMint, "doFlashloan", [
      flashloanLender._address,
      gToken._address,
      borrowAmount,
    ]);
    await expect(result).rejects.toRevert("revert re-entered");
  });

  it("flashloan and repay borrow", async () => {
    const flashloanAndRepayBorrow = await makeFlashloanReceiver({
      kind: "flashloan-and-repay-borrow-native",
    });
    const borrowAmount = 100;
    const result = send(flashloanAndRepayBorrow, "doFlashloan", [
      flashloanLender._address,
      gToken._address,
      borrowAmount,
    ]);
    await expect(result).rejects.toRevert("revert re-entered");
  });

  it("flashloan twice", async () => {
    const flashloanTwice = await makeFlashloanReceiver({
      kind: "flashloan-twice-native",
    });
    const borrowAmount = 100;
    const result = send(flashloanTwice, "doFlashloan", [
      flashloanLender._address,
      gToken._address,
      borrowAmount,
    ]);
    await expect(result).rejects.toRevert("revert re-entered");
  });
});
