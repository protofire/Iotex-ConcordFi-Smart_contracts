const { address, both, avaxMantissa } = require("../Utils/Avalanche");
const { makeGtroller, makeGToken } = require("../Utils/BankerJoe");

describe("Gtroller", () => {
  let gTroller, jToken;
  let root, accounts;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe("_setPauseGuardian", () => {
    beforeEach(async () => {
      gTroller = await makeGtroller();
    });

    describe("failing", () => {
      it("emits a failure log if not sent by admin", async () => {
        let result = await send(gTroller, "_setPauseGuardian", [root], {
          from: accounts[1],
        });
        expect(result).toHaveTrollFailure(
          "UNAUTHORIZED",
          "SET_PAUSE_GUARDIAN_OWNER_CHECK"
        );
      });

      it("does not change the pause guardian", async () => {
        let pauseGuardian = await call(gTroller, "pauseGuardian");
        expect(pauseGuardian).toEqual(address(0));
        await send(gTroller, "_setPauseGuardian", [root], {
          from: accounts[1],
        });

        pauseGuardian = await call(gTroller, "pauseGuardian");
        expect(pauseGuardian).toEqual(address(0));
      });
    });

    describe("succesfully changing pause guardian", () => {
      let result;

      beforeEach(async () => {
        gTroller = await makeGtroller();

        result = await send(gTroller, "_setPauseGuardian", [accounts[1]]);
      });

      it("emits new pause guardian event", async () => {
        expect(result).toHaveLog("NewPauseGuardian", {
          newPauseGuardian: accounts[1],
          oldPauseGuardian: address(0),
        });
      });

      it("changes pending pause guardian", async () => {
        let pauseGuardian = await call(gTroller, "pauseGuardian");
        expect(pauseGuardian).toEqual(accounts[1]);
      });
    });
  });

  describe("setting paused", () => {
    beforeEach(async () => {
      jToken = await makeGToken({ supportMarket: true });
      gTroller = jToken.gTroller;
    });

    let globalMethods = ["Transfer", "Seize"];
    describe("succeeding", () => {
      let pauseGuardian;
      beforeEach(async () => {
        pauseGuardian = accounts[1];
        await send(gTroller, "_setPauseGuardian", [accounts[1]], {
          from: root,
        });
      });

      globalMethods.forEach(async (method) => {
        it(`only pause guardian or admin can pause ${method}`, async () => {
          await expect(
            send(gTroller, `_set${method}Paused`, [true], {
              from: accounts[2],
            })
          ).rejects.toRevert("revert only pause guardian and admin can pause");
          await expect(
            send(gTroller, `_set${method}Paused`, [false], {
              from: accounts[2],
            })
          ).rejects.toRevert("revert only pause guardian and admin can pause");
        });

        it(`PauseGuardian can pause of ${method}GuardianPaused`, async () => {
          result = await send(gTroller, `_set${method}Paused`, [true], {
            from: pauseGuardian,
          });
          expect(result).toHaveLog(`ActionPaused`, {
            action: method,
            pauseState: true,
          });

          let camelCase = method.charAt(0).toLowerCase() + method.substring(1);

          state = await call(gTroller, `${camelCase}GuardianPaused`);
          expect(state).toEqual(true);

          await expect(
            send(gTroller, `_set${method}Paused`, [false], {
              from: pauseGuardian,
            })
          ).rejects.toRevert("revert only admin can unpause");
          result = await send(gTroller, `_set${method}Paused`, [false]);

          expect(result).toHaveLog(`ActionPaused`, {
            action: method,
            pauseState: false,
          });

          state = await call(gTroller, `${camelCase}GuardianPaused`);
          expect(state).toEqual(false);
        });

        it(`pauses ${method}`, async () => {
          await send(gTroller, `_set${method}Paused`, [true], {
            from: pauseGuardian,
          });
          switch (method) {
            case "Transfer":
              await expect(
                send(gTroller, "transferAllowed", [
                  address(1),
                  address(2),
                  address(3),
                  1,
                ])
              ).rejects.toRevert(`revert ${method.toLowerCase()} is paused`);
              break;

            case "Seize":
              await expect(
                send(gTroller, "seizeAllowed", [
                  address(1),
                  address(2),
                  address(3),
                  address(4),
                  1,
                ])
              ).rejects.toRevert(`revert ${method.toLowerCase()} is paused`);
              break;

            default:
              break;
          }
        });
      });
    });

    let marketMethods = ["Borrow", "Mint", "Flashloan"];
    describe("succeeding", () => {
      let pauseGuardian;
      beforeEach(async () => {
        pauseGuardian = accounts[1];
        await send(gTroller, "_setPauseGuardian", [accounts[1]], {
          from: root,
        });
      });

      marketMethods.forEach(async (method) => {
        it(`only pause guardian or admin can pause ${method}`, async () => {
          await expect(
            send(gTroller, `_set${method}Paused`, [jToken._address, true], {
              from: accounts[2],
            })
          ).rejects.toRevert("revert only pause guardian and admin can pause");
          await expect(
            send(gTroller, `_set${method}Paused`, [jToken._address, false], {
              from: accounts[2],
            })
          ).rejects.toRevert("revert only pause guardian and admin can pause");
        });

        it(`PauseGuardian can pause of ${method}GuardianPaused`, async () => {
          result = await send(
            gTroller,
            `_set${method}Paused`,
            [jToken._address, true],
            { from: pauseGuardian }
          );
          expect(result).toHaveLog(`ActionPaused`, {
            jToken: jToken._address,
            action: method,
            pauseState: true,
          });

          let camelCase = method.charAt(0).toLowerCase() + method.substring(1);

          state = await call(gTroller, `${camelCase}GuardianPaused`, [
            jToken._address,
          ]);
          expect(state).toEqual(true);

          await expect(
            send(gTroller, `_set${method}Paused`, [jToken._address, false], {
              from: pauseGuardian,
            })
          ).rejects.toRevert("revert only admin can unpause");
          result = await send(gTroller, `_set${method}Paused`, [
            jToken._address,
            false,
          ]);

          expect(result).toHaveLog(`ActionPaused`, {
            jToken: jToken._address,
            action: method,
            pauseState: false,
          });

          state = await call(gTroller, `${camelCase}GuardianPaused`, [
            jToken._address,
          ]);
          expect(state).toEqual(false);
        });

        it(`pauses ${method}`, async () => {
          await send(gTroller, `_set${method}Paused`, [jToken._address, true], {
            from: pauseGuardian,
          });
          switch (method) {
            case "Mint":
              expect(
                await call(gTroller, "mintAllowed", [address(1), address(2), 1])
              ).toHaveTrollError("MARKET_NOT_LISTED");
              await expect(
                send(gTroller, "mintAllowed", [jToken._address, address(2), 1])
              ).rejects.toRevert(`revert ${method.toLowerCase()} is paused`);
              break;

            case "Borrow":
              expect(
                await call(gTroller, "borrowAllowed", [
                  address(1),
                  address(2),
                  1,
                ])
              ).toHaveTrollError("MARKET_NOT_LISTED");
              await expect(
                send(gTroller, "borrowAllowed", [
                  jToken._address,
                  address(2),
                  1,
                ])
              ).rejects.toRevert(`revert ${method.toLowerCase()} is paused`);
              break;

            default:
              break;
          }
        });
      });
    });
  });
});
