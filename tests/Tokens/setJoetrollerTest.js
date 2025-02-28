const { makeGtroller, makeGToken } = require("../Utils/BankerJoe");

describe("GToken", function () {
  let root, accounts;
  let gToken, oldGtroller, newGtroller;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    gToken = await makeGToken();
    oldGtroller = gToken.gTroller;
    newGtroller = await makeGtroller();
    expect(newGtroller._address).not.toEqual(oldGtroller._address);
  });

  describe("_setGtroller", () => {
    it("should fail if called by non-admin", async () => {
      expect(
        await send(gToken, "_setGtroller", [newGtroller._address], {
          from: accounts[0],
        })
      ).toHaveTokenFailure("UNAUTHORIZED", "SET_JOETROLLER_OWNER_CHECK");
      expect(await call(gToken, "gTroller")).toEqual(oldGtroller._address);
    });

    it("reverts if passed a contract that doesn't implement isGtroller", async () => {
      await expect(
        send(gToken, "_setGtroller", [gToken.underlying._address])
      ).rejects.toRevert("revert");
      expect(await call(gToken, "gTroller")).toEqual(oldGtroller._address);
    });

    it("reverts if passed a contract that implements isGtroller as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badGtroller = await makeGtroller({ kind: "false-marker" });
      await expect(
        send(gToken, "_setGtroller", [badGtroller._address])
      ).rejects.toRevert("revert marker method returned false");
      expect(await call(gToken, "gTroller")).toEqual(oldGtroller._address);
    });

    it("updates gTroller and emits log on success", async () => {
      const result = await send(gToken, "_setGtroller", [newGtroller._address]);
      expect(result).toSucceed();
      expect(result).toHaveLog("NewGtroller", {
        oldGtroller: oldGtroller._address,
        newGtroller: newGtroller._address,
      });
      expect(await call(gToken, "gTroller")).toEqual(newGtroller._address);
    });
  });
});
