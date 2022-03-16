const {
  address,
  avaxMantissa,
  avaxUnsigned,
  avaxGasCost,
} = require("../Utils/Avalanche");
const {
  makeGToken,
  makeGTokenAdmin,
  makeGtroller,
  makeInterestRateModel,
  makeToken,
  setAvaxBalance,
  getBalances,
  adjustBalances,
} = require("../Utils/BankerJoe");

describe("GTokenAdmin", () => {
  let gTokenAdmin, gToken, root, accounts, admin, reserveManager;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    admin = accounts[1];
    reserveManager = accounts[2];
    others = accounts[3];
    gTokenAdmin = await makeGTokenAdmin({ admin: admin });
  });

  describe("getGTokenAdmin", () => {
    it("it is normal admin", async () => {
      gToken = await makeGToken();
      expect(
        await call(gTokenAdmin, "getGTokenAdmin", [gToken._address])
      ).toEqual(root);
    });

    it("it is gToken admin contract", async () => {
      gToken = await makeGToken({ admin: gTokenAdmin._address });
      expect(
        await call(gTokenAdmin, "getGTokenAdmin", [gToken._address])
      ).toEqual(gTokenAdmin._address);
    });
  });

  describe("_setPendingAdmin()", () => {
    beforeEach(async () => {
      gToken = await makeGToken({ admin: gTokenAdmin._address });
    });

    it("should only be callable by admin", async () => {
      await expect(
        send(gTokenAdmin, "_setPendingAdmin", [gToken._address, others], {
          from: others,
        })
      ).rejects.toRevert("revert only the admin may call this function");

      // Check admin stays the same
      expect(await call(gToken, "admin")).toEqual(gTokenAdmin._address);
      expect(await call(gToken, "pendingAdmin")).toBeAddressZero();
    });

    it("should properly set pending admin", async () => {
      expect(
        await send(gTokenAdmin, "_setPendingAdmin", [gToken._address, others], {
          from: admin,
        })
      ).toSucceed();

      // Check admin stays the same
      expect(await call(gToken, "admin")).toEqual(gTokenAdmin._address);
      expect(await call(gToken, "pendingAdmin")).toEqual(others);
    });
  });

  describe("_acceptAdmin()", () => {
    beforeEach(async () => {
      gToken = await makeGToken();
      expect(
        await send(gToken, "_setPendingAdmin", [gTokenAdmin._address])
      ).toSucceed();
    });

    it("should only be callable by admin", async () => {
      await expect(
        send(gTokenAdmin, "_acceptAdmin", [gToken._address], { from: others })
      ).rejects.toRevert("revert only the admin may call this function");

      // Check admin stays the same
      expect(await call(gToken, "admin")).toEqual(root);
      expect(await call(gToken, "pendingAdmin")[others]).toEqual();
    });

    it("should succeed and set admin and clear pending admin", async () => {
      expect(
        await send(gTokenAdmin, "_acceptAdmin", [gToken._address], {
          from: admin,
        })
      ).toSucceed();

      expect(await call(gToken, "admin")).toEqual(gTokenAdmin._address);
      expect(await call(gToken, "pendingAdmin")).toBeAddressZero();
    });
  });

  describe("_setGtroller()", () => {
    let oldGtroller, newGtroller;

    beforeEach(async () => {
      gToken = await makeGToken({ admin: gTokenAdmin._address });
      oldGtroller = gToken.gTroller;
      newGtroller = await makeGtroller();
    });

    it("should only be callable by admin", async () => {
      await expect(
        send(
          gTokenAdmin,
          "_setGtroller",
          [gToken._address, newGtroller._address],
          { from: others }
        )
      ).rejects.toRevert("revert only the admin may call this function");

      expect(await call(gToken, "gTroller")).toEqual(oldGtroller._address);
    });

    it("should succeed and set new gTroller", async () => {
      expect(
        await send(
          gTokenAdmin,
          "_setGtroller",
          [gToken._address, newGtroller._address],
          { from: admin }
        )
      ).toSucceed();

      expect(await call(gToken, "gTroller")).toEqual(newGtroller._address);
    });
  });

  describe("_setReserveFactor()", () => {
    const factor = avaxMantissa(0.02);

    beforeEach(async () => {
      gToken = await makeGToken({ admin: gTokenAdmin._address });
    });

    it("should only be callable by admin", async () => {
      await expect(
        send(gTokenAdmin, "_setReserveFactor", [gToken._address, factor], {
          from: others,
        })
      ).rejects.toRevert("revert only the admin may call this function");

      expect(await call(gToken, "reserveFactorMantissa")).toEqualNumber(0);
    });

    it("should succeed and set new reserve factor", async () => {
      expect(
        await send(
          gTokenAdmin,
          "_setReserveFactor",
          [gToken._address, factor],
          { from: admin }
        )
      ).toSucceed();

      expect(await call(gToken, "reserveFactorMantissa")).toEqualNumber(factor);
    });
  });

  describe("_reduceReserves()", () => {
    const reserves = avaxUnsigned(3e12);
    const cash = avaxUnsigned(reserves.multipliedBy(2));
    const reduction = avaxUnsigned(2e12);

    beforeEach(async () => {
      gToken = await makeGToken({ admin: gTokenAdmin._address });
      await send(gToken.interestRateModel, "setFailBorrowRate", [false]);
      expect(
        await send(gToken, "harnessSetTotalReserves", [reserves])
      ).toSucceed();
      expect(
        await send(gToken.underlying, "harnessSetBalance", [
          gToken._address,
          cash,
        ])
      ).toSucceed();
    });

    it("should only be callable by admin", async () => {
      await expect(
        send(gTokenAdmin, "_reduceReserves", [gToken._address, reduction], {
          from: others,
        })
      ).rejects.toRevert("revert only the admin may call this function");

      expect(
        await call(gToken.underlying, "balanceOf", [gTokenAdmin._address])
      ).toEqualNumber(0);
    });

    it("should succeed and reduce reserves", async () => {
      expect(
        await send(
          gTokenAdmin,
          "_reduceReserves",
          [gToken._address, reduction],
          { from: admin }
        )
      ).toSucceed();

      expect(
        await call(gToken.underlying, "balanceOf", [gTokenAdmin._address])
      ).toEqualNumber(reduction);
    });
  });

  describe("_setInterestRateModel()", () => {
    let oldModel, newModel;

    beforeEach(async () => {
      gToken = await makeGToken({ admin: gTokenAdmin._address });
      oldModel = gToken.interestRateModel;
      newModel = await makeInterestRateModel();
    });

    it("should only be callable by admin", async () => {
      await expect(
        send(
          gTokenAdmin,
          "_setInterestRateModel",
          [gToken._address, newModel._address],
          { from: others }
        )
      ).rejects.toRevert("revert only the admin may call this function");

      expect(await call(gToken, "interestRateModel")).toEqual(
        oldModel._address
      );
    });

    it("should succeed and set new interest rate model", async () => {
      expect(
        await send(
          gTokenAdmin,
          "_setInterestRateModel",
          [gToken._address, newModel._address],
          { from: admin }
        )
      ).toSucceed();

      expect(await call(gToken, "interestRateModel")).toEqual(
        newModel._address
      );
    });
  });

  describe("_setCollateralCap()", () => {
    const cap = avaxMantissa(100);

    let jCollateralCapErc20;

    beforeEach(async () => {
      jCollateralCapErc20 = await makeGToken({
        kind: "jcollateralcap",
        admin: gTokenAdmin._address,
      });
      gToken = await makeGToken({ admin: gTokenAdmin._address });
    });

    it("should only be callable by admin", async () => {
      await expect(
        send(
          gTokenAdmin,
          "_setCollateralCap",
          [jCollateralCapErc20._address, cap],
          { from: others }
        )
      ).rejects.toRevert("revert only the admin may call this function");

      expect(await call(jCollateralCapErc20, "collateralCap")).toEqualNumber(0);
    });

    it("should fail for not GCollateralCapXrc20 token", async () => {
      await expect(
        send(gTokenAdmin, "_setCollateralCap", [gToken._address, cap], {
          from: admin,
        })
      ).rejects.toRevert("revert");
    });

    it("should succeed and set new collateral cap", async () => {
      expect(
        await send(
          gTokenAdmin,
          "_setCollateralCap",
          [jCollateralCapErc20._address, cap],
          { from: admin }
        )
      ).toSucceed();

      expect(await call(jCollateralCapErc20, "collateralCap")).toEqualNumber(
        cap
      );
    });
  });

  describe("_setImplementation()", () => {
    let jCapableDelegate;

    beforeEach(async () => {
      gToken = await makeGToken({ admin: gTokenAdmin._address });
      jCapableDelegate = await deploy("GCapableXrc20Delegate");
    });

    it("should only be callable by admin", async () => {
      await expect(
        send(
          gTokenAdmin,
          "_setImplementation",
          [gToken._address, jCapableDelegate._address, true, "0x0"],
          { from: others }
        )
      ).rejects.toRevert("revert only the admin may call this function");
    });

    it("should succeed and set new implementation", async () => {
      expect(
        await send(
          gTokenAdmin,
          "_setImplementation",
          [gToken._address, jCapableDelegate._address, true, "0x0"],
          { from: admin }
        )
      ).toSucceed();

      expect(await call(gToken, "implementation")).toEqual(
        jCapableDelegate._address
      );
    });
  });

  describe("extractReserves()", () => {
    const reserves = avaxUnsigned(3e12);
    const cash = avaxUnsigned(reserves.multipliedBy(2));
    const reduction = avaxUnsigned(2e12);

    beforeEach(async () => {
      gToken = await makeGToken({ admin: gTokenAdmin._address });
      await send(gToken.interestRateModel, "setFailBorrowRate", [false]);
      expect(
        await send(gToken, "harnessSetTotalReserves", [reserves])
      ).toSucceed();
      expect(
        await send(gToken.underlying, "harnessSetBalance", [
          gToken._address,
          cash,
        ])
      ).toSucceed();
      await send(gTokenAdmin, "setReserveManager", [reserveManager], {
        from: admin,
      });
    });

    it("should only be callable by reserve manager", async () => {
      await expect(
        send(gTokenAdmin, "extractReserves", [gToken._address, reduction])
      ).rejects.toRevert(
        "revert only the reserve manager may call this function"
      );

      expect(
        await call(gToken.underlying, "balanceOf", [reserveManager])
      ).toEqualNumber(0);
    });

    it("should succeed and extract reserves", async () => {
      expect(
        await send(
          gTokenAdmin,
          "extractReserves",
          [gToken._address, reduction],
          { from: reserveManager }
        )
      ).toSucceed();

      expect(
        await call(gToken.underlying, "balanceOf", [reserveManager])
      ).toEqualNumber(reduction);
    });
  });

  describe("seize()", () => {
    const amount = 1000;

    let erc20, nonStandardErc20;

    beforeEach(async () => {
      erc20 = await makeToken();
      nonStandardErc20 = await makeToken({ kind: "nonstandard" });
      await send(erc20, "transfer", [gTokenAdmin._address, amount]);
      await send(nonStandardErc20, "transfer", [gTokenAdmin._address, amount]);
    });

    it("should only be callable by admin", async () => {
      await expect(
        send(gTokenAdmin, "seize", [erc20._address], { from: others })
      ).rejects.toRevert("revert only the admin may call this function");

      expect(
        await call(erc20, "balanceOf", [gTokenAdmin._address])
      ).toEqualNumber(amount);
      expect(await call(erc20, "balanceOf", [admin])).toEqualNumber(0);
    });

    it("should succeed and seize tokens", async () => {
      expect(
        await send(gTokenAdmin, "seize", [erc20._address], { from: admin })
      ).toSucceed();

      expect(
        await call(erc20, "balanceOf", [gTokenAdmin._address])
      ).toEqualNumber(0);
      expect(await call(erc20, "balanceOf", [admin])).toEqualNumber(amount);
    });

    it("should succeed and seize non-standard tokens", async () => {
      expect(
        await send(gTokenAdmin, "seize", [nonStandardErc20._address], {
          from: admin,
        })
      ).toSucceed();

      expect(
        await call(nonStandardErc20, "balanceOf", [gTokenAdmin._address])
      ).toEqualNumber(0);
      expect(await call(nonStandardErc20, "balanceOf", [admin])).toEqualNumber(
        amount
      );
    });
  });

  describe("setAdmin()", () => {
    it("should only be callable by admin", async () => {
      await expect(
        send(gTokenAdmin, "setAdmin", [others], { from: others })
      ).rejects.toRevert("revert only the admin may call this function");

      expect(await call(gTokenAdmin, "admin")).toEqual(admin);
    });

    it("cannot set admin to zero address", async () => {
      await expect(
        send(gTokenAdmin, "setAdmin", [address(0)], { from: admin })
      ).rejects.toRevert("revert new admin cannot be zero address");

      expect(await call(gTokenAdmin, "admin")).toEqual(admin);
    });

    it("should succeed and set new admin", async () => {
      expect(
        await send(gTokenAdmin, "setAdmin", [others], { from: admin })
      ).toSucceed();

      expect(await call(gTokenAdmin, "admin")).toEqual(others);
    });
  });

  describe("setReserveManager()", () => {
    it("should only be callable by admin", async () => {
      await expect(
        send(gTokenAdmin, "setReserveManager", [reserveManager], {
          from: others,
        })
      ).rejects.toRevert("revert only the admin may call this function");

      expect(await call(gTokenAdmin, "reserveManager")).toEqual(address(0));
    });

    it("should succeed and set new reserve manager", async () => {
      expect(
        await send(gTokenAdmin, "setReserveManager", [reserveManager], {
          from: admin,
        })
      ).toSucceed();

      expect(await call(gTokenAdmin, "reserveManager")).toEqual(reserveManager);
    });
  });
});
