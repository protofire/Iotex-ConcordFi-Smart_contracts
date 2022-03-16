const { avaxUnsigned, UInt256Max } = require("../Utils/Avalanche");
const {
  makeGtroller,
  makeGToken,
  setOraclePrice,
} = require("../Utils/BankerJoe");

const borrowedPrice = 2e10;
const collateralPrice = 1e18;
const repayAmount = avaxUnsigned(1e18);

async function calculateSeizeTokens(
  gTroller,
  gTokenBorrowed,
  gTokenCollateral,
  repayAmount
) {
  return call(gTroller, "liquidateCalculateSeizeTokens", [
    gTokenBorrowed._address,
    gTokenCollateral._address,
    repayAmount,
  ]);
}

function rando(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

describe("Gtroller", () => {
  let root, accounts;
  let gTroller, gTokenBorrowed, gTokenCollateral;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    gTroller = await makeGtroller();
    gTokenBorrowed = await makeGToken({
      gTroller: gTroller,
      underlyingPrice: 0,
    });
    gTokenCollateral = await makeGToken({
      gTroller: gTroller,
      underlyingPrice: 0,
    });
  });

  beforeEach(async () => {
    await setOraclePrice(gTokenBorrowed, borrowedPrice);
    await setOraclePrice(gTokenCollateral, collateralPrice);
    await send(gTokenCollateral, "harnessExchangeRateDetails", [8e10, 4e10, 0]);
  });

  describe("liquidateCalculateAmountSeize", () => {
    it("fails if either asset price is 0", async () => {
      await setOraclePrice(gTokenBorrowed, 0);
      expect(
        await calculateSeizeTokens(
          gTroller,
          gTokenBorrowed,
          gTokenCollateral,
          repayAmount
        )
      ).toHaveTrollErrorTuple(["PRICE_ERROR", 0]);

      await setOraclePrice(gTokenCollateral, 0);
      expect(
        await calculateSeizeTokens(
          gTroller,
          gTokenBorrowed,
          gTokenCollateral,
          repayAmount
        )
      ).toHaveTrollErrorTuple(["PRICE_ERROR", 0]);
    });

    it("fails if the repayAmount causes overflow ", async () => {
      await expect(
        calculateSeizeTokens(
          gTroller,
          gTokenBorrowed,
          gTokenCollateral,
          UInt256Max()
        )
      ).rejects.toRevert("revert multiplication overflow");
    });

    it("fails if the borrowed asset price causes overflow ", async () => {
      await setOraclePrice(gTokenBorrowed, -1);
      await expect(
        calculateSeizeTokens(
          gTroller,
          gTokenBorrowed,
          gTokenCollateral,
          repayAmount
        )
      ).rejects.toRevert("revert multiplication overflow");
    });

    it("reverts if it fails to calculate the exchange rate", async () => {
      await send(gTokenCollateral, "harnessExchangeRateDetails", [1, 0, 10]); // (1 - 10) -> underflow
      await expect(
        send(gTroller, "liquidateCalculateSeizeTokens", [
          gTokenBorrowed._address,
          gTokenCollateral._address,
          repayAmount,
        ])
      ).rejects.toRevert("revert subtraction underflow");
    });

    [
      [1e18, 1e18, 1e18, 1e18, 1e18],
      [2e18, 1e18, 1e18, 1e18, 1e18],
      [2e18, 2e18, 1.42e18, 1.3e18, 2.45e18],
      [2.789e18, 5.230480842e18, 771.32e18, 1.3e18, 10002.45e18],
      [
        7.009232529961056e24, 2.5278726317240445e24, 2.6177112093242585e23,
        1179713989619784000, 7.790468414639561e24,
      ],
      [
        rando(0, 1e25),
        rando(0, 1e25),
        rando(1, 1e25),
        rando(1e18, 1.5e18),
        rando(0, 1e25),
      ],
    ].forEach((testCase) => {
      it(`returns the correct value for ${testCase}`, async () => {
        const [
          exchangeRate,
          borrowedPrice,
          collateralPrice,
          liquidationIncentive,
          repayAmount,
        ] = testCase.map(avaxUnsigned);

        await setOraclePrice(gTokenCollateral, collateralPrice);
        await setOraclePrice(gTokenBorrowed, borrowedPrice);
        await send(gTroller, "_setLiquidationIncentive", [
          liquidationIncentive,
        ]);
        await send(gTokenCollateral, "harnessSetExchangeRate", [exchangeRate]);

        const seizeAmount = repayAmount
          .multipliedBy(liquidationIncentive)
          .multipliedBy(borrowedPrice)
          .dividedBy(collateralPrice);
        const seizeTokens = seizeAmount.dividedBy(exchangeRate);

        expect(
          await calculateSeizeTokens(
            gTroller,
            gTokenBorrowed,
            gTokenCollateral,
            repayAmount
          )
        ).toHaveTrollErrorTuple(
          ["NO_ERROR", Number(seizeTokens)],
          (x, y) => Math.abs(x - y) < 1e7
        );
      });
    });
  });
});
