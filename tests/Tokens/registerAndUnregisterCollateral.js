const { makeGToken } = require("../Utils/BankerJoe");

const exchangeRate = 50e3;

describe("GToken", function () {
  let root, admin, accounts;
  let gToken;

  beforeEach(async () => {
    [root, admin, ...accounts] = saddle.accounts;
    gToken = await makeGToken({
      kind: "jcollateralcap",
      gTrollerOpts: { kind: "bool" },
      exchangeRate,
    });
  });

  it("fails to register collateral for non gTroller", async () => {
    await expect(send(gToken, "registerCollateral", [root])).rejects.toRevert(
      "revert only gTroller may register collateral for user"
    );
  });

  it("fails to unregister collateral for non gTroller", async () => {
    await expect(send(gToken, "unregisterCollateral", [root])).rejects.toRevert(
      "revert only gTroller may unregister collateral for user"
    );
  });
});
