let rand = (x) => new bn(Math.floor(Math.random() * x));
let range = (count) => [...Array(count).keys()];

const bn = require("bignumber.js");
bn.config({ ROUNDING_MODE: bn.ROUND_HALF_DOWN });

const RUN_COUNT = 20;
const NUM_EVENTS = 50;
const PRECISION_DECIMALS = 15;

class AssertionError extends Error {
  constructor(assertion, reason, event, index) {
    let message = `Assertion Error: ${reason} when processing ${JSON.stringify(
      event
    )} at pos ${index}`;

    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

expect.extend({
  toFuzzPass(assertion, expected, actual, reason, state, events) {
    let eventStr = events
      .filter(({ action, failed }) => !failed)
      .map((event) => `${JSON.stringify(event)},`)
      .join("\n");

    return {
      pass: !!assertion(expected, actual),
      message: () => `
        Expected: ${JSON.stringify(expected)},
        Actual: ${JSON.stringify(actual)},
        Reason: ${reason}
        State: \n${JSON.stringify(state, null, "\t")}
        Events:\n${eventStr}
      `,
    };
  },
});

describe.skip("RewardWheelFuzzTest", () => {
  // This whole test is fake, but we're testing to see if our equations match reality.

  // First, we're going to build a simple simulator of the Banker Joe protocol

  let randAccount = (globals) => {
    return globals.accounts[rand(globals.accounts.length)];
  };

  let get = (src) => {
    return src || new bn(0);
  };

  let isPositive = (src) => {
    assert(
      bn.isBigNumber(src),
      "isPositive got wrong type: expected bigNumber"
    );
    return src.decimalPlaces(PRECISION_DECIMALS).isGreaterThan(0);
  };

  let almostEqual = (expected, actual) => {
    return expected
      .decimalPlaces(PRECISION_DECIMALS)
      .eq(actual.decimalPlaces(PRECISION_DECIMALS));
  };

  let deepCopy = (src) => {
    return Object.entries(src).reduce((acc, [key, val]) => {
      if (bn.isBigNumber(val)) {
        return {
          ...acc,
          [key]: new bn(val),
        };
      } else {
        return {
          ...acc,
          [key]: deepCopy(val),
        };
      }
    }, {});
  };

  let initialState = (globals) => {
    return {
      // ctoken
      accrualBlockTimestamp: globals.blockTimestamp,
      borrowIndex: new bn(1),
      totalCash: new bn(0),
      totalSupply: new bn(0),
      totalBorrows: new bn(0),
      totalReserves: new bn(0),
      reserveFactor: new bn(0.05),

      balances: {},
      borrowBalances: {},
      borrowIndexSnapshots: {},

      // flywheel & gTroller
      rewardSupplySpeed: new bn(1),
      rewardSupplyIndex: new bn(1),
      rewardSupplyIndexSnapshots: {},
      rewardSupplyIndexUpdatedBlock: globals.blockTimestamp,

      rewardBorrowSpeed: new bn(1),
      rewardBorrowIndex: new bn(1),
      rewardBorrowIndexSnapshots: {},
      rewardSupplyIndexUpdatedBlock: globals.blockTimestamp,

      rewardAccruedWithCrank: {}, // naive method, accruing all accounts every block
      rewardAccruedWithIndex: {}, // with indices

      activeBorrowBlocks: new bn(0), // # blocks with an active borrow, for which we expect to see reward distributed. just for fuzz testing.
      activeSupplyBlocks: new bn(0),
    };
  };

  let getExchangeRate = ({
    totalCash,
    totalSupply,
    totalBorrows,
    totalReserves,
  }) => {
    if (isPositive(totalSupply)) {
      return totalCash.plus(totalBorrows).minus(totalReserves).div(totalSupply);
    } else {
      return new bn(1);
    }
  };

  let getBorrowRate = (cash, borrows, reserves) => {
    let denom = cash.plus(borrows).minus(reserves);
    if (denom.isZero()) {
      return new bn(0);
    } else if (denom.lt(0)) {
      throw new Error(
        `Borrow Rate failure cash:${cash} borrows:${borrows} reserves:${reserves}`
      );
    } else {
      let util = borrows.div(denom);
      return util.times(0.001);
    }
  };

  // only used after events are run to test invariants
  let trueUpReward = (globals, state) => {
    state = accrueInterest(globals, state);

    state = Object.keys(state.rewardSupplyIndexSnapshots).reduce(
      (acc, account) => supplierFlywheelByIndex(globals, state, account),
      state
    );

    state = Object.keys(state.rewardBorrowIndexSnapshots).reduce(
      (acc, account) => borrowerFlywheelByIndex(globals, state, account),
      state
    );

    return state;
  };

  // manual flywheel loops through every account and updates reward accrued mapping
  // cranked within accrue interest (borrowBalance not updated, totalBorrows should be)
  let flywheelByCrank = (
    state,
    deltaTimestamp,
    borrowIndexNew,
    borrowIndexPrev
  ) => {
    let {
      balances,
      rewardBorrowSpeed,
      rewardSupplySpeed,
      totalSupply,
      totalBorrows,
      rewardAccruedWithCrank,
      borrowBalances,
    } = state;

    // suppliers
    for (let [account, balance] of Object.entries(balances)) {
      if (isPositive(totalSupply)) {
        rewardAccruedWithCrank[account] = get(
          state.rewardAccruedWithCrank[account]
        ).plus(
          deltaTimestamp
            .times(rewardSupplySpeed)
            .times(balance)
            .div(totalSupply)
        );
      }
    }

    // borrowers
    for (let [account, borrowBalance] of Object.entries(borrowBalances)) {
      if (isPositive(totalBorrows)) {
        let truedUpBorrowBalance = getAccruedBorrowBalance(state, account);

        rewardAccruedWithCrank[account] = get(
          state.rewardAccruedWithCrank[account]
        ).plus(
          deltaTimestamp
            .times(rewardBorrowSpeed)
            .times(truedUpBorrowBalance)
            .div(totalBorrows)
        );
      }
    }

    return {
      ...state,
      rewardAccruedWithCrank: rewardAccruedWithCrank,
    };
  };

  // real deal reward index flywheel™️
  let borrowerFlywheelByIndex = (globals, state, account) => {
    let {
      rewardBorrowSpeed,
      rewardBorrowIndex,
      rewardBorrowIndexSnapshots,
      rewardAccruedWithIndex,
      totalBorrows,
      borrowBalances,
      rewardBorrowIndexUpdatedBlock,
      borrowIndex,
      borrowIndexSnapshots,
    } = state;

    let deltaTimestamp = globals.blockTimestamp.minus(
      rewardBorrowIndexUpdatedBlock
    );
    if (isPositive(totalBorrows)) {
      let scaledTotalBorrows = totalBorrows.div(borrowIndex);
      rewardBorrowIndex = rewardBorrowIndex.plus(
        rewardBorrowSpeed.times(deltaTimestamp).div(scaledTotalBorrows)
      );
    }

    let indexSnapshot = rewardBorrowIndexSnapshots[account];

    if (
      indexSnapshot !== undefined &&
      rewardBorrowIndex.isGreaterThan(indexSnapshot) &&
      borrowBalances[account] !== undefined
    ) {
      // to simulate borrowBalanceStored
      let borrowBalanceNew = borrowBalances[account]
        .times(borrowIndex)
        .div(state.borrowIndexSnapshots[account]);
      rewardAccruedWithIndex[account] = get(
        rewardAccruedWithIndex[account]
      ).plus(
        borrowBalanceNew
          .div(borrowIndex)
          .times(rewardBorrowIndex.minus(indexSnapshot))
      );
    }

    return {
      ...state,
      rewardBorrowIndexUpdatedBlock: globals.blockTimestamp,
      rewardBorrowIndex: rewardBorrowIndex,
      rewardBorrowIndexSnapshots: {
        ...state.rewardBorrowIndexSnapshots,
        [account]: rewardBorrowIndex,
      },
    };
  };

  // real deal reward index flywheel™️
  let supplierFlywheelByIndex = (globals, state, account) => {
    let {
      balances,
      rewardSupplySpeed,
      rewardSupplyIndex,
      rewardSupplyIndexSnapshots,
      rewardAccruedWithIndex,
      totalSupply,
      rewardSupplyIndexUpdatedBlock,
    } = state;

    let deltaTimestamp = globals.blockTimestamp.minus(
      rewardSupplyIndexUpdatedBlock
    );

    if (isPositive(totalSupply)) {
      rewardSupplyIndex = rewardSupplyIndex.plus(
        rewardSupplySpeed.times(deltaTimestamp).div(totalSupply)
      );
    }

    let indexSnapshot = rewardSupplyIndexSnapshots[account];
    if (indexSnapshot !== undefined) {
      // if had prev snapshot,  accrue some reward
      rewardAccruedWithIndex[account] = get(
        rewardAccruedWithIndex[account]
      ).plus(balances[account].times(rewardSupplyIndex.minus(indexSnapshot)));
    }

    return {
      ...state,
      rewardSupplyIndexUpdatedBlock: globals.blockTimestamp,
      rewardSupplyIndex: rewardSupplyIndex,
      rewardSupplyIndexSnapshots: {
        ...state.rewardSupplyIndexSnapshots,
        [account]: rewardSupplyIndex,
      },
      rewardAccruedWithIndex: rewardAccruedWithIndex,
    };
  };

  let accrueActiveBlocks = (state, deltaTimestamp) => {
    let { activeBorrowBlocks, activeSupplyBlocks, totalBorrows, totalSupply } =
      state;
    if (isPositive(totalSupply)) {
      activeSupplyBlocks = activeSupplyBlocks.plus(deltaTimestamp);
    }

    if (isPositive(totalBorrows)) {
      activeBorrowBlocks = activeBorrowBlocks.plus(deltaTimestamp);
    }

    return {
      ...state,
      activeSupplyBlocks: activeSupplyBlocks,
      activeBorrowBlocks: activeBorrowBlocks,
    };
  };

  let getAccruedBorrowBalance = (state, account) => {
    let prevBorrowBalance = state.borrowBalances[account];
    let checkpointBorrowIndex = state.borrowIndexSnapshots[account];
    if (
      prevBorrowBalance !== undefined &&
      checkpointBorrowIndex !== undefined
    ) {
      return prevBorrowBalance
        .times(state.borrowIndex)
        .div(checkpointBorrowIndex);
    } else {
      return new bn(0);
    }
  };

  let accrueInterest = (globals, state) => {
    let {
      balances,
      totalCash,
      totalBorrows,
      totalSupply,
      totalReserves,
      accrualBlockTimestamp,
      borrowIndex,
      reserveFactor,
    } = state;

    let deltaTimestamp = globals.blockTimestamp.minus(accrualBlockTimestamp);
    state = accrueActiveBlocks(state, deltaTimestamp);

    let borrowRate = getBorrowRate(totalCash, totalBorrows, totalReserves);
    let simpleInterestFactor = deltaTimestamp.times(borrowRate);
    let borrowIndexNew = borrowIndex.times(simpleInterestFactor.plus(1));
    let interestAccumulated = totalBorrows.times(simpleInterestFactor);
    let totalBorrowsNew = totalBorrows.plus(interestAccumulated);
    let totalReservesNew = totalReserves
      .plus(interestAccumulated)
      .times(reserveFactor);

    state = flywheelByCrank(
      state,
      deltaTimestamp,
      borrowIndexNew,
      state.borrowIndex
    );

    return {
      ...state,
      accrualBlockTimestamp: globals.blockTimestamp,
      borrowIndex: borrowIndexNew,
      totalBorrows: totalBorrowsNew,
      totalReserves: totalReservesNew,
    };
  };

  let mine = {
    action: "mine",
    rate: 10,
    run: (globals, state, {}, { assert }) => {
      return state;
    },
    gen: (globals) => {
      return {
        mine: rand(100).plus(1),
      };
    },
  };

  let gift = {
    action: "gift",
    rate: 3,
    run: (globals, state, { amount }, { assert }) => {
      amount = new bn(amount);
      return {
        ...state,
        totalCash: state.totalCash.plus(amount),
      };
    },
    gen: (globals) => {
      return {
        amount: rand(1000),
      };
    },
  };

  let test = {
    action: "test",
    run: (globals, state, { amount }, { assert }) => {
      console.log(state);
      return state;
    },
  };

  let borrow = {
    action: "borrow",
    rate: 10,
    run: (globals, state, { account, amount }, { assert }) => {
      amount = new bn(amount);
      state = accrueInterest(globals, state);
      state = borrowerFlywheelByIndex(globals, state, account);

      let newTotalCash = state.totalCash.minus(amount);
      assert(
        isPositive(newTotalCash.plus(state.totalReserves)),
        "Attempted to borrow more than total cash"
      );

      let newBorrowBalance = getAccruedBorrowBalance(state, account).plus(
        amount
      );
      assert(
        get(state.balances[account])
          .times(getExchangeRate(state))
          .isGreaterThan(newBorrowBalance),
        "Borrower undercollateralized"
      );

      return {
        ...state,
        totalBorrows: state.totalBorrows.plus(amount),
        totalCash: newTotalCash,
        borrowBalances: {
          ...state.borrowBalances,
          [account]: newBorrowBalance,
        },
        borrowIndexSnapshots: {
          ...state.borrowIndexSnapshots,
          [account]: state.borrowIndex,
        },
      };
    },
    gen: (globals) => {
      return {
        account: randAccount(globals),
        amount: rand(1000),
      };
    },
  };

  let repayBorrow = {
    action: "repayBorrow",
    rate: 10,
    run: (globals, state, { account, amount }, { assert }) => {
      amount = new bn(amount);
      state = accrueInterest(globals, state);
      state = borrowerFlywheelByIndex(globals, state, account);

      let accruedBorrowBalance = getAccruedBorrowBalance(state, account);
      assert(isPositive(accruedBorrowBalance), "No active borrow");

      let newTotalBorrows;

      if (amount.isGreaterThan(accruedBorrowBalance)) {
        // repay full borrow
        delete state.borrowIndexSnapshots[account];
        delete state.borrowBalances[account];
        state.totalBorrows = state.totalBorrows.minus(accruedBorrowBalance);
      } else {
        state.borrowIndexSnapshots[account] = state.borrowIndex;
        state.borrowBalances[account] = accruedBorrowBalance.minus(amount);
        state.totalBorrows = state.totalBorrows.minus(amount);
      }

      return {
        ...state,
        totalCash: state.totalCash.plus(bn.min(amount, accruedBorrowBalance)),
      };
    },
    gen: (globals) => {
      return {
        account: randAccount(globals),
        amount: rand(1000),
      };
    },
  };

  let mint = {
    action: "mint",
    rate: 10,
    run: (globals, state, { account, amount }, { assert }) => {
      amount = new bn(amount);
      state = accrueInterest(globals, state);
      state = supplierFlywheelByIndex(globals, state, account);

      let balance = get(state.balances[account]);
      let exchangeRate = getExchangeRate(state);
      let tokens = amount.div(exchangeRate);
      return {
        ...state,
        totalCash: state.totalCash.plus(amount), // ignores transfer fees
        totalSupply: state.totalSupply.plus(tokens),
        balances: {
          ...state.balances,
          [account]: balance.plus(tokens),
        },
      };
    },
    gen: (globals) => {
      return {
        account: randAccount(globals),
        amount: rand(1000),
      };
    },
  };

  let redeem = {
    action: "redeem",
    rate: 10,
    run: (globals, state, { account, tokens }, { assert }) => {
      tokens = new bn(tokens);
      state = accrueInterest(globals, state);
      state = supplierFlywheelByIndex(globals, state, account);

      let balance = get(state.balances[account]);
      assert(
        balance.isGreaterThan(tokens),
        "Redeem fails for insufficient balance"
      );
      let exchangeRate = getExchangeRate(state);
      let amount = tokens.times(exchangeRate);

      return {
        ...state,
        totalCash: state.totalCash.minus(amount), // ignores transfer fees
        totalSupply: state.totalSupply.minus(tokens),
        balances: {
          ...state.balances,
          [account]: balance.minus(tokens),
        },
      };
    },
    gen: (globals) => {
      return {
        account: randAccount(globals),
        tokens: rand(1000),
      };
    },
  };

  let actors = {
    mine,
    mint,
    redeem,
    gift,
    borrow,
    repayBorrow,
    // test
  };

  let generateGlobals = () => {
    return {
      blockTimestamp: new bn(1000),
      accounts: ["Adam Savage", "Ben Solo", "Jeffrey Lebowski"],
    };
  };

  // assert amount distributed by the crank is expected, that it equals # blocks with a supply * reward speed
  let crankCorrectnessInvariant = (globals, state, events, invariantFn) => {
    let expected = state.activeSupplyBlocks
      .times(state.rewardSupplySpeed)
      .plus(state.activeBorrowBlocks.times(state.rewardBorrowSpeed));

    let actual = Object.values(state.rewardAccruedWithCrank).reduce(
      (acc, val) => acc.plus(val),
      new bn(0)
    );
    invariantFn(
      almostEqual,
      expected,
      actual,
      `crank method distributed reward inaccurately`
    );
  };

  // assert reward distributed by index is the same as amount distributed by crank
  let indexCorrectnessInvariant = (globals, state, events, invariantFn) => {
    let expected = state.rewardAccruedWithCrank;
    let actual = state.rewardAccruedWithIndex;
    invariantFn(
      (expected, actual) => {
        return Object.keys(expected).reduce((succeeded, account) => {
          return (
            almostEqual(get(expected[account]), get(actual[account])) &&
            succeeded
          );
        }, true);
      },
      expected,
      actual,
      `crank method does not match index method`
    );
  };

  let testInvariants = (globals, state, events, invariantFn) => {
    crankCorrectnessInvariant(globals, state, events, invariantFn);
    indexCorrectnessInvariant(globals, state, events, invariantFn);
  };

  let randActor = () => {
    // TODO: Handle weighting actors
    let actorKeys = Object.keys(actors);
    let actorsLen = actorKeys.length;
    return actors[actorKeys[rand(actorsLen)]];
  };

  let executeAction = (globals, state, event, i) => {
    const prevState = deepCopy(state);
    assert = (assertion, reason) => {
      if (!assertion) {
        throw new AssertionError(assertion, reason, event, i);
      }
    };

    try {
      return actors[event.action].run(globals, state, event, { assert });
    } catch (e) {
      if (e instanceof AssertionError) {
        // TODO: ignore e!
        console.debug(`assertion failed: ${e.toString()}`);
        event.failed = true;
        return prevState;
      } else {
        throw e;
      }
    } finally {
      if (event.mine) {
        globals.blockTimestamp = globals.blockTimestamp.plus(event.mine);
      }
    }
  };

  let runEvents = (globals, initState, events) => {
    let state = events.reduce(executeAction.bind(null, globals), initState);
    return trueUpReward(globals, state);
  };

  let generateEvent = (globals) => {
    let actor = randActor();

    return {
      ...actor.gen(globals),
      action: actor.action,
    };
  };

  let generateEvents = (globals, count) => {
    return range(count).map(() => {
      return generateEvent(globals);
    });
  };

  function go(invariantFn) {
    let globals = generateGlobals();
    let initState = initialState(globals);
    let events = generateEvents(globals, NUM_EVENTS);
    let state = runEvents(globals, initState, events);

    let invariantFnBound = (assertion, expected, actual, reason) => {
      invariantFn(assertion, expected, actual, reason, state, events);
    };

    testInvariants(globals, state, events, invariantFnBound);
  }

  range(RUN_COUNT).forEach((count) => {
    it(`runs: ${count}`, () => {
      let invariant = (assertion, expected, actual, reason, state, events) => {
        expect(assertion).toFuzzPass(expected, actual, reason, state, events);
      };

      go(invariant);
    });
  });
});
