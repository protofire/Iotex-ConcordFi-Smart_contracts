const { avaxUnsigned } = require("../Utils/Avalanche");

const { makeGToken, preJJLP } = require("../Utils/BankerJoe");

const amount = avaxUnsigned(10e4);

describe("GToken", function () {
  let gToken, root, admin, accounts;
  beforeEach(async () => {
    [root, admin, ...accounts] = saddle.accounts;
    gToken = await makeGToken({ gTrollerOpts: { kind: "bool" } });
  });

  describe("_setImplementation", () => {
    describe("jcapable", () => {
      let jCapableDelegate;
      beforeEach(async () => {
        jCapableDelegate = await deploy("GCapableXrc20Delegate");
      });

      it("fails due to non admin", async () => {
        gToken = await saddle.getContractAt("GXrc20Delegator", gToken._address);
        await expect(
          send(
            gToken,
            "_setImplementation",
            [jCapableDelegate._address, true, "0x0"],
            { from: accounts[0] }
          )
        ).rejects.toRevert(
          "revert GXrc20Delegator::_setImplementation: Caller must be admin"
        );
      });

      it("succeeds to have internal cash", async () => {
        await send(gToken.underlying, "harnessSetBalance", [
          gToken._address,
          amount,
        ]);

        gToken = await saddle.getContractAt("GXrc20Delegator", gToken._address);
        expect(
          await send(gToken, "_setImplementation", [
            jCapableDelegate._address,
            true,
            "0x0",
          ])
        ).toSucceed();

        gToken = await saddle.getContractAt(
          "GCapableXrc20Delegate",
          gToken._address
        );
        const result = await call(gToken, "getCash");
        expect(result).toEqualNumber(amount);
      });
    });

    describe("jjlp", () => {
      let jjlpDelegate, data;
      beforeEach(async () => {
        jjlpDelegate = await deploy("JJLPDelegateHarness");
        data = await preJJLP(gToken.underlying._address);
      });

      it("fails due to non admin", async () => {
        gToken = await saddle.getContractAt("GXrc20Delegator", gToken._address);
        await expect(
          send(
            gToken,
            "_setImplementation",
            [jjlpDelegate._address, true, data],
            { from: accounts[0] }
          )
        ).rejects.toRevert(
          "revert GXrc20Delegator::_setImplementation: Caller must be admin"
        );
      });

      // It's unlikely to upgrade an implementation to JJLPDelegate.
    });

    describe("jjtoken", () => {
      let jjtokenDelegate;
      beforeEach(async () => {
        jjtokenDelegate = await deploy("JGTokenDelegateHarness");
      });

      it("fails due to non admin", async () => {
        gToken = await saddle.getContractAt("GXrc20Delegator", gToken._address);
        await expect(
          send(
            gToken,
            "_setImplementation",
            [jjtokenDelegate._address, true, "0x0"],
            { from: accounts[0] }
          )
        ).rejects.toRevert(
          "revert GXrc20Delegator::_setImplementation: Caller must be admin"
        );
      });

      // It's unlikely to upgrade an implementation to JGTokenDelegate.
    });
  });
});
