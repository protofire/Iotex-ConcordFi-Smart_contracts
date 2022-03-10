import { Event } from "../Event";
import { addAction, describeUser, World } from "../World";
import { decodeCall, getPastEvents } from "../Contract";
import { GToken, GTokenScenario } from "../Contract/GToken";
import { GXrc20Delegate } from "../Contract/GXrc20Delegate";
import { GXrc20Delegator } from "../Contract/GXrc20Delegator";
import { invoke, Sendable } from "../Invokation";
import {
  getAddressV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getStringV,
  getBoolV,
} from "../CoreValue";
import { AddressV, BoolV, EventV, NothingV, NumberV, StringV } from "../Value";
import { getContract } from "../Contract";
import { Arg, Command, View, processCommandEvent } from "../Command";
import { GTokenErrorReporter } from "../ErrorReporter";
import { getGtroller, getGTokenData } from "../ContractLookup";
import { buildGToken } from "../Builder/GTokenBuilder";
import { verify } from "../Verify";
import { getLiquidity } from "../Value/GtrollerValue";
import { getGTokenV, getGXrc20DelegatorV } from "../Value/GTokenValue";

function showTrxValue(world: World): string {
  return new NumberV(world.trxInvokationOpts.get("value")).show();
}

async function genGToken(
  world: World,
  from: string,
  event: Event
): Promise<World> {
  let {
    world: nextWorld,
    jToken,
    tokenData,
  } = await buildGToken(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added jToken ${tokenData.name} (${tokenData.contract}<decimals=${tokenData.decimals}>) at address ${jToken._address}`,
    tokenData.invokation
  );

  return world;
}

async function accrueInterest(
  world: World,
  from: string,
  jToken: GToken
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.accrueInterest(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: Interest accrued`,
    invokation
  );

  return world;
}

async function mint(
  world: World,
  from: string,
  jToken: GToken,
  amount: NumberV | NothingV
): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(
      world,
      jToken.methods.mint(amount.encode()),
      from,
      GTokenErrorReporter
    );
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(
      world,
      jToken.methods.mint(),
      from,
      GTokenErrorReporter
    );
  }

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(world, from)} mints ${showAmount}`,
    invokation
  );

  return world;
}

async function mintNative(
  world: World,
  from: string,
  jToken: GToken
): Promise<World> {
  const showAmount = showTrxValue(world);
  let invokation = await invoke(
    world,
    jToken.methods.mintNative(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(world, from)} mints ${showAmount}`,
    invokation
  );

  return world;
}

async function redeem(
  world: World,
  from: string,
  jToken: GToken,
  tokens: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.redeem(tokens.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} redeems ${tokens.show()} tokens`,
    invokation
  );

  return world;
}

async function redeemNative(
  world: World,
  from: string,
  jToken: GToken,
  tokens: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.redeemNative(tokens.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} redeems ${tokens.show()} tokens`,
    invokation
  );

  return world;
}

async function redeemUnderlying(
  world: World,
  from: string,
  jToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.redeemUnderlying(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} redeems ${amount.show()} underlying`,
    invokation
  );

  return world;
}

async function redeemUnderlyingNative(
  world: World,
  from: string,
  jToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.redeemUnderlyingNative(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} redeems ${amount.show()} underlying`,
    invokation
  );

  return world;
}

async function borrow(
  world: World,
  from: string,
  jToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.borrow(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} borrows ${amount.show()}`,
    invokation
  );

  return world;
}

async function borrowNative(
  world: World,
  from: string,
  jToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.borrowNative(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} borrows ${amount.show()}`,
    invokation
  );

  return world;
}

async function repayBorrow(
  world: World,
  from: string,
  jToken: GToken,
  amount: NumberV | NothingV
): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(
      world,
      jToken.methods.repayBorrow(amount.encode()),
      from,
      GTokenErrorReporter
    );
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(
      world,
      jToken.methods.repayBorrow(),
      from,
      GTokenErrorReporter
    );
  }

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} repays ${showAmount} of borrow`,
    invokation
  );

  return world;
}

async function repayBorrowNative(
  world: World,
  from: string,
  jToken: GToken
): Promise<World> {
  const showAmount = showTrxValue(world);
  let invokation = await invoke(
    world,
    jToken.methods.repayBorrowNative(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} repays ${showAmount} of borrow`,
    invokation
  );

  return world;
}

async function liquidateBorrow(
  world: World,
  from: string,
  jToken: GToken,
  borrower: string,
  collateral: GToken,
  repayAmount: NumberV | NothingV
): Promise<World> {
  let invokation;
  let showAmount;

  if (repayAmount instanceof NumberV) {
    showAmount = repayAmount.show();
    invokation = await invoke(
      world,
      jToken.methods.liquidateBorrow(
        borrower,
        repayAmount.encode(),
        collateral._address
      ),
      from,
      GTokenErrorReporter
    );
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(
      world,
      jToken.methods.liquidateBorrow(borrower, collateral._address),
      from,
      GTokenErrorReporter
    );
  }

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} liquidates ${showAmount} from of ${describeUser(
      world,
      borrower
    )}, seizing ${collateral.name}.`,
    invokation
  );

  return world;
}

async function seize(
  world: World,
  from: string,
  jToken: GToken,
  liquidator: string,
  borrower: string,
  seizeTokens: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.seize(liquidator, borrower, seizeTokens.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} initiates seizing ${seizeTokens.show()} to ${describeUser(
      world,
      liquidator
    )} from ${describeUser(world, borrower)}.`,
    invokation
  );

  return world;
}

async function evilSeize(
  world: World,
  from: string,
  jToken: GToken,
  treasure: GToken,
  liquidator: string,
  borrower: string,
  seizeTokens: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.evilSeize(
      treasure._address,
      liquidator,
      borrower,
      seizeTokens.encode()
    ),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} initiates illegal seizing ${seizeTokens.show()} to ${describeUser(
      world,
      liquidator
    )} from ${describeUser(world, borrower)}.`,
    invokation
  );

  return world;
}

async function setPendingAdmin(
  world: World,
  from: string,
  jToken: GToken,
  newPendingAdmin: string
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods._setPendingAdmin(newPendingAdmin),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(
  world: World,
  from: string,
  jToken: GToken
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods._acceptAdmin(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function addReserves(
  world: World,
  from: string,
  jToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods._addReserves(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} adds to reserves by ${amount.show()}`,
    invokation
  );

  return world;
}

async function reduceReserves(
  world: World,
  from: string,
  jToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods._reduceReserves(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} reduces reserves by ${amount.show()}`,
    invokation
  );

  return world;
}

async function setReserveFactor(
  world: World,
  from: string,
  jToken: GToken,
  reserveFactor: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods._setReserveFactor(reserveFactor.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} sets reserve factor to ${reserveFactor.show()}`,
    invokation
  );

  return world;
}

async function setInterestRateModel(
  world: World,
  from: string,
  jToken: GToken,
  interestRateModel: string
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods._setInterestRateModel(interestRateModel),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `Set interest rate for ${
      jToken.name
    } to ${interestRateModel} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setGtroller(
  world: World,
  from: string,
  jToken: GToken,
  gTroller: string
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods._setGtroller(gTroller),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `Set gTroller for ${jToken.name} to ${gTroller} as ${describeUser(
      world,
      from
    )}`,
    invokation
  );

  return world;
}

async function gulp(
  world: World,
  from: string,
  jToken: GToken
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.gulp(),
    from,
    GTokenErrorReporter
  );

  world = addAction(world, `GToken ${jToken.name}: Gulp`, invokation);

  return world;
}

async function setCollateralCap(
  world: World,
  from: string,
  jToken: GToken,
  cap: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods._setCollateralCap(cap.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `Set collateral cap for ${jToken.name} to ${cap.show()}`,
    invokation
  );

  return world;
}

async function becomeImplementation(
  world: World,
  from: string,
  jToken: GToken,
  becomeImplementationData: string
): Promise<World> {
  const cErc20Delegate = getContract("GXrc20Delegate");
  const cErc20DelegateContract = await cErc20Delegate.at<GXrc20Delegate>(
    world,
    jToken._address
  );

  let invokation = await invoke(
    world,
    cErc20DelegateContract.methods._becomeImplementation(
      becomeImplementationData
    ),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} initiates _becomeImplementation with data:${becomeImplementationData}.`,
    invokation
  );

  return world;
}

async function resignImplementation(
  world: World,
  from: string,
  jToken: GToken
): Promise<World> {
  const cErc20Delegate = getContract("GXrc20Delegate");
  const cErc20DelegateContract = await cErc20Delegate.at<GXrc20Delegate>(
    world,
    jToken._address
  );

  let invokation = await invoke(
    world,
    cErc20DelegateContract.methods._resignImplementation(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} initiates _resignImplementation.`,
    invokation
  );

  return world;
}

async function setImplementation(
  world: World,
  from: string,
  jToken: GXrc20Delegator,
  implementation: string,
  allowResign: boolean,
  becomeImplementationData: string
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods._setImplementation(
      implementation,
      allowResign,
      becomeImplementationData
    ),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${jToken.name}: ${describeUser(
      world,
      from
    )} initiates setImplementation with implementation:${implementation} allowResign:${allowResign} data:${becomeImplementationData}.`,
    invokation
  );

  return world;
}

async function donate(
  world: World,
  from: string,
  jToken: GToken
): Promise<World> {
  let invokation = await invoke(
    world,
    jToken.methods.donate(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `Donate for ${jToken.name} as ${describeUser(
      world,
      from
    )} with value ${showTrxValue(world)}`,
    invokation
  );

  return world;
}

async function setGTokenMock(
  world: World,
  from: string,
  jToken: GTokenScenario,
  mock: string,
  value: NumberV
): Promise<World> {
  let mockMethod: (number) => Sendable<void>;

  switch (mock.toLowerCase()) {
    case "totalborrows":
      mockMethod = jToken.methods.setTotalBorrows;
      break;
    case "totalreserves":
      mockMethod = jToken.methods.setTotalReserves;
      break;
    default:
      throw new Error(`Mock "${mock}" not defined for jToken`);
  }

  let invokation = await invoke(world, mockMethod(value.encode()), from);

  world = addAction(
    world,
    `Mocked ${mock}=${value.show()} for ${jToken.name}`,
    invokation
  );

  return world;
}

async function verifyGToken(
  world: World,
  jToken: GToken,
  name: string,
  contract: string,
  apiKey: string
): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(
      `Politely declining to verify on local network: ${world.network}.`
    );
  } else {
    await verify(world, apiKey, name, contract, jToken._address);
  }

  return world;
}

async function printMinters(world: World, jToken: GToken): Promise<World> {
  let events = await getPastEvents(world, jToken, jToken.name, "Mint");
  let addresses = events.map((event) => event.returnValues["minter"]);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Minters:");

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`);
  });

  return world;
}

async function printBorrowers(world: World, jToken: GToken): Promise<World> {
  let events = await getPastEvents(world, jToken, jToken.name, "Borrow");
  let addresses = events.map((event) => event.returnValues["borrower"]);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Borrowers:");

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`);
  });

  return world;
}

async function printLiquidity(world: World, jToken: GToken): Promise<World> {
  let mintEvents = await getPastEvents(world, jToken, jToken.name, "Mint");
  let mintAddresses = mintEvents.map((event) => event.returnValues["minter"]);
  let borrowEvents = await getPastEvents(world, jToken, jToken.name, "Borrow");
  let borrowAddresses = borrowEvents.map(
    (event) => event.returnValues["borrower"]
  );
  let uniq = [...new Set(mintAddresses.concat(borrowAddresses))];
  let gTroller = await getGtroller(world);

  world.printer.printLine("Liquidity:");

  const liquidityMap = await Promise.all(
    uniq.map(async (address) => {
      let userLiquidity = await getLiquidity(world, gTroller, address);

      return [address, userLiquidity.val];
    })
  );

  liquidityMap.forEach(([address, liquidity]) => {
    world.printer.printLine(
      `\t${world.settings.lookupAlias(address)}: ${liquidity / 1e18}e18`
    );
  });

  return world;
}

export function jTokenCommands() {
  return [
    new Command<{ jTokenParams: EventV }>(
      `
        #### Deploy

        * "GToken Deploy ...jTokenParams" - Generates a new GToken
          * E.g. "GToken cZRX Deploy"
      `,
      "Deploy",
      [new Arg("jTokenParams", getEventV, { variadic: true })],
      (world, from, { jTokenParams }) =>
        genGToken(world, from, jTokenParams.val)
    ),
    new View<{ jTokenArg: StringV; apiKey: StringV }>(
      `
        #### Verify

        * "GToken <jToken> Verify apiKey:<String>" - Verifies GToken in Etherscan
          * E.g. "GToken cZRX Verify "myApiKey"
      `,
      "Verify",
      [new Arg("jTokenArg", getStringV), new Arg("apiKey", getStringV)],
      async (world, { jTokenArg, apiKey }) => {
        let [jToken, name, data] = await getGTokenData(world, jTokenArg.val);

        return await verifyGToken(
          world,
          jToken,
          name,
          data.get("contract")!,
          apiKey.val
        );
      },
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken }>(
      `
        #### AccrueInterest

        * "GToken <jToken> AccrueInterest" - Accrues interest for given token
          * E.g. "GToken cZRX AccrueInterest"
      `,
      "AccrueInterest",
      [new Arg("jToken", getGTokenV)],
      (world, from, { jToken }) => accrueInterest(world, from, jToken),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; amount: NumberV | NothingV }>(
      `
        #### Mint

        * "GToken <jToken> Mint amount:<Number>" - Mints the given amount of jToken as specified user
          * E.g. "GToken cZRX Mint 1.0e18"
      `,
      "Mint",
      [
        new Arg("jToken", getGTokenV),
        new Arg("amount", getNumberV, { nullable: true }),
      ],
      (world, from, { jToken, amount }) => mint(world, from, jToken, amount),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken }>(
      `
        #### MintNative

        * "GToken <jToken> MintNative" - Mints the given amount of jToken as specified user
          * E.g. "GToken cWETH MintNative"
      `,
      "MintNative",
      [new Arg("jToken", getGTokenV)],
      (world, from, { jToken }) => mintNative(world, from, jToken),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; tokens: NumberV }>(
      `
        #### Redeem

        * "GToken <jToken> Redeem tokens:<Number>" - Redeems the given amount of jTokens as specified user
          * E.g. "GToken cZRX Redeem 1.0e9"
      `,
      "Redeem",
      [new Arg("jToken", getGTokenV), new Arg("tokens", getNumberV)],
      (world, from, { jToken, tokens }) => redeem(world, from, jToken, tokens),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; tokens: NumberV }>(
      `
        #### RedeemNative

        * "GToken <jToken> RedeemNative tokens:<Number>" - Redeems the given amount of jTokens as specified user
          * E.g. "GToken cZRX RedeemNative 1.0e9"
      `,
      "RedeemNative",
      [new Arg("jToken", getGTokenV), new Arg("tokens", getNumberV)],
      (world, from, { jToken, tokens }) =>
        redeemNative(world, from, jToken, tokens),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; amount: NumberV }>(
      `
        #### RedeemUnderlying

        * "GToken <jToken> RedeemUnderlying amount:<Number>" - Redeems the given amount of underlying as specified user
          * E.g. "GToken cZRX RedeemUnderlying 1.0e18"
      `,
      "RedeemUnderlying",
      [new Arg("jToken", getGTokenV), new Arg("amount", getNumberV)],
      (world, from, { jToken, amount }) =>
        redeemUnderlying(world, from, jToken, amount),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; amount: NumberV }>(
      `
        #### RedeemUnderlyingNative

        * "GToken <jToken> RedeemUnderlyingNative amount:<Number>" - Redeems the given amount of underlying as specified user
          * E.g. "GToken cZRX RedeemUnderlyingNative 1.0e18"
      `,
      "RedeemUnderlyingNative",
      [new Arg("jToken", getGTokenV), new Arg("amount", getNumberV)],
      (world, from, { jToken, amount }) =>
        redeemUnderlyingNative(world, from, jToken, amount),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; amount: NumberV }>(
      `
        #### Borrow

        * "GToken <jToken> Borrow amount:<Number>" - Borrows the given amount of this jToken as specified user
          * E.g. "GToken cZRX Borrow 1.0e18"
      `,
      "Borrow",
      [new Arg("jToken", getGTokenV), new Arg("amount", getNumberV)],
      // Note: we override from
      (world, from, { jToken, amount }) => borrow(world, from, jToken, amount),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; amount: NumberV }>(
      `
        #### BorrowNative

        * "GToken <jToken> BorrowNative amount:<Number>" - Borrows the given amount of this jToken as specified user
          * E.g. "GToken cZRX BorrowNative 1.0e18"
      `,
      "BorrowNative",
      [new Arg("jToken", getGTokenV), new Arg("amount", getNumberV)],
      // Note: we override from
      (world, from, { jToken, amount }) =>
        borrowNative(world, from, jToken, amount),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; amount: NumberV | NothingV }>(
      `
        #### RepayBorrow

        * "GToken <jToken> RepayBorrow underlyingAmount:<Number>" - Repays borrow in the given underlying amount as specified user
          * E.g. "GToken cZRX RepayBorrow 1.0e18"
      `,
      "RepayBorrow",
      [
        new Arg("jToken", getGTokenV),
        new Arg("amount", getNumberV, { nullable: true }),
      ],
      (world, from, { jToken, amount }) =>
        repayBorrow(world, from, jToken, amount),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; amount: NumberV | NothingV }>(
      `
        #### RepayBorrowNative

        * "GToken <jToken> RepayBorrowNative" - Repays borrow in the given underlying amount as specified user
          * E.g. "GToken cZRX RepayBorrowNative"
      `,
      "RepayBorrowNative",
      [new Arg("jToken", getGTokenV)],
      (world, from, { jToken, amount }) =>
        repayBorrowNative(world, from, jToken),
      { namePos: 1 }
    ),
    new Command<{
      borrower: AddressV;
      jToken: GToken;
      collateral: GToken;
      repayAmount: NumberV | NothingV;
    }>(
      `
        #### Liquidate

        * "GToken <jToken> Liquidate borrower:<User> jTokenCollateral:<Address> repayAmount:<Number>" - Liquidates repayAmount of given token seizing collateral token
          * E.g. "GToken cZRX Liquidate Geoff cBAT 1.0e18"
      `,
      "Liquidate",
      [
        new Arg("jToken", getGTokenV),
        new Arg("borrower", getAddressV),
        new Arg("collateral", getGTokenV),
        new Arg("repayAmount", getNumberV, { nullable: true }),
      ],
      (world, from, { borrower, jToken, collateral, repayAmount }) =>
        liquidateBorrow(
          world,
          from,
          jToken,
          borrower.val,
          collateral,
          repayAmount
        ),
      { namePos: 1 }
    ),
    new Command<{
      jToken: GToken;
      liquidator: AddressV;
      borrower: AddressV;
      seizeTokens: NumberV;
    }>(
      `
        #### Seize

        * "GToken <jToken> Seize liquidator:<User> borrower:<User> seizeTokens:<Number>" - Seizes a given number of tokens from a user (to be called from other GToken)
          * E.g. "GToken cZRX Seize Geoff Torrey 1.0e18"
      `,
      "Seize",
      [
        new Arg("jToken", getGTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV),
      ],
      (world, from, { jToken, liquidator, borrower, seizeTokens }) =>
        seize(world, from, jToken, liquidator.val, borrower.val, seizeTokens),
      { namePos: 1 }
    ),
    new Command<{
      jToken: GToken;
      treasure: GToken;
      liquidator: AddressV;
      borrower: AddressV;
      seizeTokens: NumberV;
    }>(
      `
        #### EvilSeize

        * "GToken <jToken> EvilSeize treasure:<Token> liquidator:<User> borrower:<User> seizeTokens:<Number>" - Improperly seizes a given number of tokens from a user
          * E.g. "GToken cEVL EvilSeize cZRX Geoff Torrey 1.0e18"
      `,
      "EvilSeize",
      [
        new Arg("jToken", getGTokenV),
        new Arg("treasure", getGTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV),
      ],
      (world, from, { jToken, treasure, liquidator, borrower, seizeTokens }) =>
        evilSeize(
          world,
          from,
          jToken,
          treasure,
          liquidator.val,
          borrower.val,
          seizeTokens
        ),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; amount: NumberV }>(
      `
        #### ReduceReserves

        * "GToken <jToken> ReduceReserves amount:<Number>" - Reduces the reserves of the jToken
          * E.g. "GToken cZRX ReduceReserves 1.0e18"
      `,
      "ReduceReserves",
      [new Arg("jToken", getGTokenV), new Arg("amount", getNumberV)],
      (world, from, { jToken, amount }) =>
        reduceReserves(world, from, jToken, amount),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; amount: NumberV }>(
      `
    #### AddReserves

    * "GToken <jToken> AddReserves amount:<Number>" - Adds reserves to the jToken
      * E.g. "GToken cZRX AddReserves 1.0e18"
  `,
      "AddReserves",
      [new Arg("jToken", getGTokenV), new Arg("amount", getNumberV)],
      (world, from, { jToken, amount }) =>
        addReserves(world, from, jToken, amount),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; newPendingAdmin: AddressV }>(
      `
        #### SetPendingAdmin

        * "GToken <jToken> SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the jToken
          * E.g. "GToken cZRX SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [new Arg("jToken", getGTokenV), new Arg("newPendingAdmin", getAddressV)],
      (world, from, { jToken, newPendingAdmin }) =>
        setPendingAdmin(world, from, jToken, newPendingAdmin.val),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken }>(
      `
        #### AcceptAdmin

        * "GToken <jToken> AcceptAdmin" - Accepts admin for the jToken
          * E.g. "From Geoff (GToken cZRX AcceptAdmin)"
      `,
      "AcceptAdmin",
      [new Arg("jToken", getGTokenV)],
      (world, from, { jToken }) => acceptAdmin(world, from, jToken),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; reserveFactor: NumberV }>(
      `
        #### SetReserveFactor

        * "GToken <jToken> SetReserveFactor reserveFactor:<Number>" - Sets the reserve factor for the jToken
          * E.g. "GToken cZRX SetReserveFactor 0.1"
      `,
      "SetReserveFactor",
      [new Arg("jToken", getGTokenV), new Arg("reserveFactor", getExpNumberV)],
      (world, from, { jToken, reserveFactor }) =>
        setReserveFactor(world, from, jToken, reserveFactor),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; interestRateModel: AddressV }>(
      `
        #### SetInterestRateModel

        * "GToken <jToken> SetInterestRateModel interestRateModel:<Contract>" - Sets the interest rate model for the given jToken
          * E.g. "GToken cZRX SetInterestRateModel (FixedRate 1.5)"
      `,
      "SetInterestRateModel",
      [
        new Arg("jToken", getGTokenV),
        new Arg("interestRateModel", getAddressV),
      ],
      (world, from, { jToken, interestRateModel }) =>
        setInterestRateModel(world, from, jToken, interestRateModel.val),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; gTroller: AddressV }>(
      `
        #### SetGtroller

        * "GToken <jToken> SetGtroller gTroller:<Contract>" - Sets the gTroller for the given jToken
          * E.g. "GToken cZRX SetGtroller Gtroller"
      `,
      "SetGtroller",
      [new Arg("jToken", getGTokenV), new Arg("gTroller", getAddressV)],
      (world, from, { jToken, gTroller }) =>
        setGtroller(world, from, jToken, gTroller.val),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken }>(
      `
        #### Gulp
        * "GToken <jToken> Gulp" - Gulps for the jToken
          * E.g. "GToken cZRX Gulp"
      `,
      "Gulp",
      [new Arg("jToken", getGTokenV)],
      (world, from, { jToken }) => gulp(world, from, jToken),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; amount: NumberV }>(
      `
        #### SetCollateralCap
        * "GToken <jToken> SetCollateralCap amount:<Number>" - Sets the collateral cap for the given jToken
          * E.g. "GToken cZRX SetCollateralCap 1e10"
      `,
      "SetCollateralCap",
      [new Arg("jToken", getGTokenV), new Arg("amount", getNumberV)],
      (world, from, { jToken, amount }) =>
        setCollateralCap(world, from, jToken, amount),
      { namePos: 1 }
    ),
    new Command<{
      jToken: GToken;
      becomeImplementationData: StringV;
    }>(
      `
        #### BecomeImplementation

        * "GToken <jToken> BecomeImplementation becomeImplementationData:<String>"
          * E.g. "GToken cDAI BecomeImplementation "0x01234anyByTeS56789""
      `,
      "BecomeImplementation",
      [
        new Arg("jToken", getGTokenV),
        new Arg("becomeImplementationData", getStringV),
      ],
      (world, from, { jToken, becomeImplementationData }) =>
        becomeImplementation(world, from, jToken, becomeImplementationData.val),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken }>(
      `
        #### ResignImplementation

        * "GToken <jToken> ResignImplementation"
          * E.g. "GToken cDAI ResignImplementation"
      `,
      "ResignImplementation",
      [new Arg("jToken", getGTokenV)],
      (world, from, { jToken }) => resignImplementation(world, from, jToken),
      { namePos: 1 }
    ),
    new Command<{
      jToken: GXrc20Delegator;
      implementation: AddressV;
      allowResign: BoolV;
      becomeImplementationData: StringV;
    }>(
      `
        #### SetImplementation

        * "GToken <jToken> SetImplementation implementation:<Address> allowResign:<Bool> becomeImplementationData:<String>"
          * E.g. "GToken cDAI SetImplementation (GToken cDAIDelegate Address) True "0x01234anyByTeS56789"
      `,
      "SetImplementation",
      [
        new Arg("jToken", getGXrc20DelegatorV),
        new Arg("implementation", getAddressV),
        new Arg("allowResign", getBoolV),
        new Arg("becomeImplementationData", getStringV),
      ],
      (
        world,
        from,
        { jToken, implementation, allowResign, becomeImplementationData }
      ) =>
        setImplementation(
          world,
          from,
          jToken,
          implementation.val,
          allowResign.val,
          becomeImplementationData.val
        ),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken }>(
      `
        #### Donate

        * "GToken <jToken> Donate" - Calls the donate (payable no-op) function
          * E.g. "(Trx Value 5.0e18 (GToken cETH Donate))"
      `,
      "Donate",
      [new Arg("jToken", getGTokenV)],
      (world, from, { jToken }) => donate(world, from, jToken),
      { namePos: 1 }
    ),
    new Command<{ jToken: GToken; variable: StringV; value: NumberV }>(
      `
        #### Mock

        * "GToken <jToken> Mock variable:<String> value:<Number>" - Mocks a given value on jToken. Note: value must be a supported mock and this will only work on a "GTokenScenario" contract.
          * E.g. "GToken cZRX Mock totalBorrows 5.0e18"
          * E.g. "GToken cZRX Mock totalReserves 0.5e18"
      `,
      "Mock",
      [
        new Arg("jToken", getGTokenV),
        new Arg("variable", getStringV),
        new Arg("value", getNumberV),
      ],
      (world, from, { jToken, variable, value }) =>
        setGTokenMock(world, from, <GTokenScenario>jToken, variable.val, value),
      { namePos: 1 }
    ),
    new View<{ jToken: GToken }>(
      `
        #### Minters

        * "GToken <jToken> Minters" - Print address of all minters
      `,
      "Minters",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => printMinters(world, jToken),
      { namePos: 1 }
    ),
    new View<{ jToken: GToken }>(
      `
        #### Borrowers

        * "GToken <jToken> Borrowers" - Print address of all borrowers
      `,
      "Borrowers",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => printBorrowers(world, jToken),
      { namePos: 1 }
    ),
    new View<{ jToken: GToken }>(
      `
        #### Liquidity

        * "GToken <jToken> Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => printLiquidity(world, jToken),
      { namePos: 1 }
    ),
    new View<{ jToken: GToken; input: StringV }>(
      `
        #### Decode

        * "Decode <jToken> input:<String>" - Prints information about a call to a jToken contract
      `,
      "Decode",
      [new Arg("jToken", getGTokenV), new Arg("input", getStringV)],
      (world, { jToken, input }) => decodeCall(world, jToken, input.val),
      { namePos: 1 }
    ),
  ];
}

export async function processGTokenEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>(
    "GToken",
    jTokenCommands(),
    world,
    event,
    from
  );
}
