const { avaxUnsigned, avaxMantissa } = require("../Utils/Avalanche");

const {
  makeGToken,
  preApprove,
  balanceOf,
  fastForward,
} = require("../Utils/BankerJoe");

const exchangeRate = 50e3;
const mintAmount = avaxUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);

async function preMint(gToken, minter, mintAmount, exchangeRate) {
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

describe("GToken", function () {
  let root, minter, accounts;
  beforeEach(async () => {
    [root, minter, ...accounts] = saddle.accounts;
  });

  describe("transfer", () => {
    it("cannot transfer from a zero balance", async () => {
      const gToken = await makeGToken({ supportMarket: true });
      expect(await call(gToken, "balanceOf", [root])).toEqualNumber(0);
      await expect(
        send(gToken, "transfer", [accounts[0], 100])
      ).rejects.toRevert("revert subtraction underflow");
    });

    it("transfers 50 tokens", async () => {
      const gToken = await makeGToken({ supportMarket: true });
      await send(gToken, "harnessSetBalance", [root, 100]);
      expect(await call(gToken, "balanceOf", [root])).toEqualNumber(100);
      await send(gToken, "transfer", [accounts[0], 50]);
      expect(await call(gToken, "balanceOf", [root])).toEqualNumber(50);
      expect(await call(gToken, "balanceOf", [accounts[0]])).toEqualNumber(50);
    });

    it("doesn't transfer when src == dst", async () => {
      const gToken = await makeGToken({ supportMarket: true });
      await send(gToken, "harnessSetBalance", [root, 100]);
      expect(await call(gToken, "balanceOf", [root])).toEqualNumber(100);
      expect(await send(gToken, "transfer", [root, 50])).toHaveTokenFailure(
        "BAD_INPUT",
        "TRANSFER_NOT_ALLOWED"
      );
    });

    it("rejects transfer when not allowed and reverts if not verified", async () => {
      const gToken = await makeGToken({ gTrollerOpts: { kind: "bool" } });
      await send(gToken, "harnessSetBalance", [root, 100]);
      expect(await call(gToken, "balanceOf", [root])).toEqualNumber(100);

      await send(gToken.gTroller, "setTransferAllowed", [false]);
      expect(await send(gToken, "transfer", [root, 50])).toHaveTrollReject(
        "TRANSFER_JOETROLLER_REJECTION"
      );

      await send(gToken.gTroller, "setTransferAllowed", [true]);
      await send(gToken.gTroller, "setTransferVerify", [false]);
      // no longer support verifyTransfer on gToken end
      // await expect(send(gToken, 'transfer', [accounts[0], 50])).rejects.toRevert("revert transferVerify rejected transfer");
    });

    it("transfers jjlp token", async () => {
      const gToken = await makeGToken({
        kind: "jjlp",
        gTrollerOpts: { kind: "bool" },
      });
      const joeAddress = await call(gToken, "joe", []);
      const masterChefAddress = await call(gToken, "masterChef", []);

      const joe = await saddle.getContractAt("JoeToken", joeAddress);
      const masterChef = await saddle.getContractAt(
        "MasterChef",
        masterChefAddress
      );

      await preMint(gToken, minter, mintAmount, exchangeRate);
      expect(await mintFresh(gToken, minter, mintAmount)).toSucceed();
      expect(await call(gToken, "balanceOf", [minter])).toEqualNumber(
        mintTokens
      );

      await fastForward(gToken, 1);
      await fastForward(masterChef, 1);

      await send(gToken, "transfer", [accounts[0], mintTokens], {
        from: minter,
      });
      expect(await call(gToken, "balanceOf", [minter])).toEqualNumber(0);
      expect(await call(gToken, "balanceOf", [accounts[0]])).toEqualNumber(
        mintTokens
      );

      expect(await balanceOf(joe, minter)).toEqualNumber(avaxMantissa(0));
      expect(await call(gToken, "xJoeUserAccrued", [minter])).toEqualNumber(
        avaxMantissa(1)
      );

      await fastForward(gToken, 1);
      await fastForward(masterChef, 1);

      await send(gToken, "claimG", [minter], { from: minter });
      expect(await balanceOf(joe, minter)).toEqualNumber(avaxMantissa(1));
      expect(await call(gToken, "xJoeUserAccrued", [minter])).toEqualNumber(
        avaxMantissa(0)
      );
    });

    describe("transfer jcollateralcap token", () => {
      it("transfers collateral tokens", async () => {
        const gToken = await makeGToken({
          kind: "jcollateralcap",
          supportMarket: true,
        });
        await send(gToken, "harnessSetBalance", [root, 100]);
        await send(gToken, "harnessSetCollateralBalance", [root, 100]);
        await send(gToken, "harnessSetTotalSupply", [100]);
        await send(gToken, "harnessSetTotalCollateralTokens", [100]);

        expect(await call(gToken, "balanceOf", [root])).toEqualNumber(100);
        expect(
          await call(gToken, "accountCollateralTokens", [root])
        ).toEqualNumber(100);
        await send(gToken, "transfer", [accounts[0], 50]);
        expect(await call(gToken, "balanceOf", [root])).toEqualNumber(50);
        expect(
          await call(gToken, "accountCollateralTokens", [root])
        ).toEqualNumber(50);
        expect(await call(gToken, "balanceOf", [accounts[0]])).toEqualNumber(
          50
        );
        expect(
          await call(gToken, "accountCollateralTokens", [accounts[0]])
        ).toEqualNumber(50);
      });

      it("transfers non-collateral tokens", async () => {
        const gToken = await makeGToken({
          kind: "jcollateralcap",
          supportMarket: true,
        });
        await send(gToken, "harnessSetBalance", [root, 100]);
        await send(gToken, "harnessSetCollateralBalance", [root, 50]);
        await send(gToken, "harnessSetTotalSupply", [100]);
        await send(gToken, "harnessSetTotalCollateralTokens", [50]);

        expect(await call(gToken, "balanceOf", [root])).toEqualNumber(100);
        expect(
          await call(gToken, "accountCollateralTokens", [root])
        ).toEqualNumber(50);
        await send(gToken, "transfer", [accounts[0], 50]);
        expect(await call(gToken, "balanceOf", [root])).toEqualNumber(50);
        expect(
          await call(gToken, "accountCollateralTokens", [root])
        ).toEqualNumber(50);
        expect(await call(gToken, "balanceOf", [accounts[0]])).toEqualNumber(
          50
        );
        expect(
          await call(gToken, "accountCollateralTokens", [accounts[0]])
        ).toEqualNumber(0);
      });

      it("transfers partial collateral tokens", async () => {
        const gToken = await makeGToken({
          kind: "jcollateralcap",
          supportMarket: true,
        });
        await send(gToken, "harnessSetBalance", [root, 100]);
        await send(gToken, "harnessSetCollateralBalance", [root, 80]);
        await send(gToken, "harnessSetTotalSupply", [100]);
        await send(gToken, "harnessSetTotalCollateralTokens", [80]);

        expect(await call(gToken, "balanceOf", [root])).toEqualNumber(100);
        expect(
          await call(gToken, "accountCollateralTokens", [root])
        ).toEqualNumber(80);
        await send(gToken, "transfer", [accounts[0], 50]);
        expect(await call(gToken, "balanceOf", [root])).toEqualNumber(50);
        expect(
          await call(gToken, "accountCollateralTokens", [root])
        ).toEqualNumber(50);
        expect(await call(gToken, "balanceOf", [accounts[0]])).toEqualNumber(
          50
        );
        expect(
          await call(gToken, "accountCollateralTokens", [accounts[0]])
        ).toEqualNumber(30);
      });
    });
  });
});
