const {
  makeGToken,
  getBalances,
  adjustBalances,
} = require("../Utils/BankerJoe");

const exchangeRate = 5;

describe("GIotx", function () {
  let root, nonRoot, accounts;
  let gToken;
  beforeEach(async () => {
    [root, nonRoot, ...accounts] = saddle.accounts;
    gToken = await makeGToken({
      kind: "javax",
      gTrollerOpts: { kind: "bool" },
    });
  });

  describe("getCashPrior", () => {
    it("returns the amount of avax held by the cAvax contract before the current message", async () => {
      expect(
        await call(gToken, "harnessGetCashPrior", [], { value: 100 })
      ).toEqualNumber(0);
    });
  });

  describe("doTransferIn", () => {
    it("succeeds if from is msg.nonRoot and amount is msg.value", async () => {
      expect(
        await call(gToken, "harnessDoTransferIn", [root, 100], { value: 100 })
      ).toEqualNumber(100);
    });

    it("reverts if from != msg.sender", async () => {
      await expect(
        call(gToken, "harnessDoTransferIn", [nonRoot, 100], { value: 100 })
      ).rejects.toRevert("revert sender mismatch");
    });

    it("reverts if amount != msg.value", async () => {
      await expect(
        call(gToken, "harnessDoTransferIn", [root, 77], { value: 100 })
      ).rejects.toRevert("revert value mismatch");
    });

    describe("doTransferOut", () => {
      it("transfers avax out", async () => {
        const beforeBalances = await getBalances([gToken], [nonRoot]);
        const receipt = await send(
          gToken,
          "harnessDoTransferOut",
          [nonRoot, 77],
          { value: 77 }
        );
        const afterBalances = await getBalances([gToken], [nonRoot]);
        expect(receipt).toSucceed();
        expect(afterBalances).toEqual(
          await adjustBalances(beforeBalances, [[gToken, nonRoot, "avax", 77]])
        );
      });

      it("reverts if it fails", async () => {
        await expect(
          call(gToken, "harnessDoTransferOut", [root, 77], { value: 0 })
        ).rejects.toRevert();
      });
    });
  });
});
