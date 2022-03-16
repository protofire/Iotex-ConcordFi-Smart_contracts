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
    gToken,
    tokenData,
  } = await buildGToken(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added gToken ${tokenData.name} (${tokenData.contract}<decimals=${tokenData.decimals}>) at address ${gToken._address}`,
    tokenData.invokation
  );

  return world;
}

async function accrueInterest(
  world: World,
  from: string,
  gToken: GToken
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.accrueInterest(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: Interest accrued`,
    invokation
  );

  return world;
}

async function mint(
  world: World,
  from: string,
  gToken: GToken,
  amount: NumberV | NothingV
): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(
      world,
      gToken.methods.mint(amount.encode()),
      from,
      GTokenErrorReporter
    );
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(
      world,
      gToken.methods.mint(),
      from,
      GTokenErrorReporter
    );
  }

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(world, from)} mints ${showAmount}`,
    invokation
  );

  return world;
}

async function mintNative(
  world: World,
  from: string,
  gToken: GToken
): Promise<World> {
  const showAmount = showTrxValue(world);
  let invokation = await invoke(
    world,
    gToken.methods.mintNative(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(world, from)} mints ${showAmount}`,
    invokation
  );

  return world;
}

async function redeem(
  world: World,
  from: string,
  gToken: GToken,
  tokens: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.redeem(tokens.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  tokens: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.redeemNative(tokens.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.redeemUnderlying(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.redeemUnderlyingNative(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.borrow(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.borrowNative(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  amount: NumberV | NothingV
): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(
      world,
      gToken.methods.repayBorrow(amount.encode()),
      from,
      GTokenErrorReporter
    );
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(
      world,
      gToken.methods.repayBorrow(),
      from,
      GTokenErrorReporter
    );
  }

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken
): Promise<World> {
  const showAmount = showTrxValue(world);
  let invokation = await invoke(
    world,
    gToken.methods.repayBorrowNative(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
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
      gToken.methods.liquidateBorrow(
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
      gToken.methods.liquidateBorrow(borrower, collateral._address),
      from,
      GTokenErrorReporter
    );
  }

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  liquidator: string,
  borrower: string,
  seizeTokens: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.seize(liquidator, borrower, seizeTokens.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  treasure: GToken,
  liquidator: string,
  borrower: string,
  seizeTokens: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.evilSeize(
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
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  newPendingAdmin: string
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods._setPendingAdmin(newPendingAdmin),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods._acceptAdmin(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function addReserves(
  world: World,
  from: string,
  gToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods._addReserves(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  amount: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods._reduceReserves(amount.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  reserveFactor: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods._setReserveFactor(reserveFactor.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken,
  interestRateModel: string
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods._setInterestRateModel(interestRateModel),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `Set interest rate for ${
      gToken.name
    } to ${interestRateModel} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setGtroller(
  world: World,
  from: string,
  gToken: GToken,
  gTroller: string
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods._setGtroller(gTroller),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `Set gTroller for ${gToken.name} to ${gTroller} as ${describeUser(
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
  gToken: GToken
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.gulp(),
    from,
    GTokenErrorReporter
  );

  world = addAction(world, `GToken ${gToken.name}: Gulp`, invokation);

  return world;
}

async function setCollateralCap(
  world: World,
  from: string,
  gToken: GToken,
  cap: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods._setCollateralCap(cap.encode()),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `Set collateral cap for ${gToken.name} to ${cap.show()}`,
    invokation
  );

  return world;
}

async function becomeImplementation(
  world: World,
  from: string,
  gToken: GToken,
  becomeImplementationData: string
): Promise<World> {
  const cErc20Delegate = getContract("GXrc20Delegate");
  const cErc20DelegateContract = await cErc20Delegate.at<GXrc20Delegate>(
    world,
    gToken._address
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
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken
): Promise<World> {
  const cErc20Delegate = getContract("GXrc20Delegate");
  const cErc20DelegateContract = await cErc20Delegate.at<GXrc20Delegate>(
    world,
    gToken._address
  );

  let invokation = await invoke(
    world,
    cErc20DelegateContract.methods._resignImplementation(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GXrc20Delegator,
  implementation: string,
  allowResign: boolean,
  becomeImplementationData: string
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods._setImplementation(
      implementation,
      allowResign,
      becomeImplementationData
    ),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `GToken ${gToken.name}: ${describeUser(
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
  gToken: GToken
): Promise<World> {
  let invokation = await invoke(
    world,
    gToken.methods.donate(),
    from,
    GTokenErrorReporter
  );

  world = addAction(
    world,
    `Donate for ${gToken.name} as ${describeUser(
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
  gToken: GTokenScenario,
  mock: string,
  value: NumberV
): Promise<World> {
  let mockMethod: (number) => Sendable<void>;

  switch (mock.toLowerCase()) {
    case "totalborrows":
      mockMethod = gToken.methods.setTotalBorrows;
      break;
    case "totalreserves":
      mockMethod = gToken.methods.setTotalReserves;
      break;
    default:
      throw new Error(`Mock "${mock}" not defined for gToken`);
  }

  let invokation = await invoke(world, mockMethod(value.encode()), from);

  world = addAction(
    world,
    `Mocked ${mock}=${value.show()} for ${gToken.name}`,
    invokation
  );

  return world;
}

async function verifyGToken(
  world: World,
  gToken: GToken,
  name: string,
  contract: string,
  apiKey: string
): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(
      `Politely declining to verify on local network: ${world.network}.`
    );
  } else {
    await verify(world, apiKey, name, contract, gToken._address);
  }

  return world;
}

async function printMinters(world: World, gToken: GToken): Promise<World> {
  let events = await getPastEvents(world, gToken, gToken.name, "Mint");
  let addresses = events.map((event) => event.returnValues["minter"]);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Minters:");

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`);
  });

  return world;
}

async function printBorrowers(world: World, gToken: GToken): Promise<World> {
  let events = await getPastEvents(world, gToken, gToken.name, "Borrow");
  let addresses = events.map((event) => event.returnValues["borrower"]);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Borrowers:");

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`);
  });

  return world;
}

async function printLiquidity(world: World, gToken: GToken): Promise<World> {
  let mintEvents = await getPastEvents(world, gToken, gToken.name, "Mint");
  let mintAddresses = mintEvents.map((event) => event.returnValues["minter"]);
  let borrowEvents = await getPastEvents(world, gToken, gToken.name, "Borrow");
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

export function gTokenCommands() {
  return [
    new Command<{ gTokenParams: EventV }>(
      `
        #### Deploy

        * "GToken Deploy ...gTokenParams" - Generates a new GToken
          * E.g. "GToken cZRX Deploy"
      `,
      "Deploy",
      [new Arg("gTokenParams", getEventV, { variadic: true })],
      (world, from, { gTokenParams }) =>
        genGToken(world, from, gTokenParams.val)
    ),
    new View<{ gTokenArg: StringV; apiKey: StringV }>(
      `
        #### Verify

        * "GToken <gToken> Verify apiKey:<String>" - Verifies GToken in Etherscan
          * E.g. "GToken cZRX Verify "myApiKey"
      `,
      "Verify",
      [new Arg("gTokenArg", getStringV), new Arg("apiKey", getStringV)],
      async (world, { gTokenArg, apiKey }) => {
        let [gToken, name, data] = await getGTokenData(world, gTokenArg.val);

        return await verifyGToken(
          world,
          gToken,
          name,
          data.get("contract")!,
          apiKey.val
        );
      },
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken }>(
      `
        #### AccrueInterest

        * "GToken <gToken> AccrueInterest" - Accrues interest for given token
          * E.g. "GToken cZRX AccrueInterest"
      `,
      "AccrueInterest",
      [new Arg("gToken", getGTokenV)],
      (world, from, { gToken }) => accrueInterest(world, from, gToken),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; amount: NumberV | NothingV }>(
      `
        #### Mint

        * "GToken <gToken> Mint amount:<Number>" - Mints the given amount of gToken as specified user
          * E.g. "GToken cZRX Mint 1.0e18"
      `,
      "Mint",
      [
        new Arg("gToken", getGTokenV),
        new Arg("amount", getNumberV, { nullable: true }),
      ],
      (world, from, { gToken, amount }) => mint(world, from, gToken, amount),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken }>(
      `
        #### MintNative

        * "GToken <gToken> MintNative" - Mints the given amount of gToken as specified user
          * E.g. "GToken cWETH MintNative"
      `,
      "MintNative",
      [new Arg("gToken", getGTokenV)],
      (world, from, { gToken }) => mintNative(world, from, gToken),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; tokens: NumberV }>(
      `
        #### Redeem

        * "GToken <gToken> Redeem tokens:<Number>" - Redeems the given amount of gTokens as specified user
          * E.g. "GToken cZRX Redeem 1.0e9"
      `,
      "Redeem",
      [new Arg("gToken", getGTokenV), new Arg("tokens", getNumberV)],
      (world, from, { gToken, tokens }) => redeem(world, from, gToken, tokens),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; tokens: NumberV }>(
      `
        #### RedeemNative

        * "GToken <gToken> RedeemNative tokens:<Number>" - Redeems the given amount of gTokens as specified user
          * E.g. "GToken cZRX RedeemNative 1.0e9"
      `,
      "RedeemNative",
      [new Arg("gToken", getGTokenV), new Arg("tokens", getNumberV)],
      (world, from, { gToken, tokens }) =>
        redeemNative(world, from, gToken, tokens),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; amount: NumberV }>(
      `
        #### RedeemUnderlying

        * "GToken <gToken> RedeemUnderlying amount:<Number>" - Redeems the given amount of underlying as specified user
          * E.g. "GToken cZRX RedeemUnderlying 1.0e18"
      `,
      "RedeemUnderlying",
      [new Arg("gToken", getGTokenV), new Arg("amount", getNumberV)],
      (world, from, { gToken, amount }) =>
        redeemUnderlying(world, from, gToken, amount),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; amount: NumberV }>(
      `
        #### RedeemUnderlyingNative

        * "GToken <gToken> RedeemUnderlyingNative amount:<Number>" - Redeems the given amount of underlying as specified user
          * E.g. "GToken cZRX RedeemUnderlyingNative 1.0e18"
      `,
      "RedeemUnderlyingNative",
      [new Arg("gToken", getGTokenV), new Arg("amount", getNumberV)],
      (world, from, { gToken, amount }) =>
        redeemUnderlyingNative(world, from, gToken, amount),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; amount: NumberV }>(
      `
        #### Borrow

        * "GToken <gToken> Borrow amount:<Number>" - Borrows the given amount of this gToken as specified user
          * E.g. "GToken cZRX Borrow 1.0e18"
      `,
      "Borrow",
      [new Arg("gToken", getGTokenV), new Arg("amount", getNumberV)],
      // Note: we override from
      (world, from, { gToken, amount }) => borrow(world, from, gToken, amount),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; amount: NumberV }>(
      `
        #### BorrowNative

        * "GToken <gToken> BorrowNative amount:<Number>" - Borrows the given amount of this gToken as specified user
          * E.g. "GToken cZRX BorrowNative 1.0e18"
      `,
      "BorrowNative",
      [new Arg("gToken", getGTokenV), new Arg("amount", getNumberV)],
      // Note: we override from
      (world, from, { gToken, amount }) =>
        borrowNative(world, from, gToken, amount),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; amount: NumberV | NothingV }>(
      `
        #### RepayBorrow

        * "GToken <gToken> RepayBorrow underlyingAmount:<Number>" - Repays borrow in the given underlying amount as specified user
          * E.g. "GToken cZRX RepayBorrow 1.0e18"
      `,
      "RepayBorrow",
      [
        new Arg("gToken", getGTokenV),
        new Arg("amount", getNumberV, { nullable: true }),
      ],
      (world, from, { gToken, amount }) =>
        repayBorrow(world, from, gToken, amount),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; amount: NumberV | NothingV }>(
      `
        #### RepayBorrowNative

        * "GToken <gToken> RepayBorrowNative" - Repays borrow in the given underlying amount as specified user
          * E.g. "GToken cZRX RepayBorrowNative"
      `,
      "RepayBorrowNative",
      [new Arg("gToken", getGTokenV)],
      (world, from, { gToken, amount }) =>
        repayBorrowNative(world, from, gToken),
      { namePos: 1 }
    ),
    new Command<{
      borrower: AddressV;
      gToken: GToken;
      collateral: GToken;
      repayAmount: NumberV | NothingV;
    }>(
      `
        #### Liquidate

        * "GToken <gToken> Liquidate borrower:<User> gTokenCollateral:<Address> repayAmount:<Number>" - Liquidates repayAmount of given token seizing collateral token
          * E.g. "GToken cZRX Liquidate Geoff cBAT 1.0e18"
      `,
      "Liquidate",
      [
        new Arg("gToken", getGTokenV),
        new Arg("borrower", getAddressV),
        new Arg("collateral", getGTokenV),
        new Arg("repayAmount", getNumberV, { nullable: true }),
      ],
      (world, from, { borrower, gToken, collateral, repayAmount }) =>
        liquidateBorrow(
          world,
          from,
          gToken,
          borrower.val,
          collateral,
          repayAmount
        ),
      { namePos: 1 }
    ),
    new Command<{
      gToken: GToken;
      liquidator: AddressV;
      borrower: AddressV;
      seizeTokens: NumberV;
    }>(
      `
        #### Seize

        * "GToken <gToken> Seize liquidator:<User> borrower:<User> seizeTokens:<Number>" - Seizes a given number of tokens from a user (to be called from other GToken)
          * E.g. "GToken cZRX Seize Geoff Torrey 1.0e18"
      `,
      "Seize",
      [
        new Arg("gToken", getGTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV),
      ],
      (world, from, { gToken, liquidator, borrower, seizeTokens }) =>
        seize(world, from, gToken, liquidator.val, borrower.val, seizeTokens),
      { namePos: 1 }
    ),
    new Command<{
      gToken: GToken;
      treasure: GToken;
      liquidator: AddressV;
      borrower: AddressV;
      seizeTokens: NumberV;
    }>(
      `
        #### EvilSeize

        * "GToken <gToken> EvilSeize treasure:<Token> liquidator:<User> borrower:<User> seizeTokens:<Number>" - Improperly seizes a given number of tokens from a user
          * E.g. "GToken cEVL EvilSeize cZRX Geoff Torrey 1.0e18"
      `,
      "EvilSeize",
      [
        new Arg("gToken", getGTokenV),
        new Arg("treasure", getGTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV),
      ],
      (world, from, { gToken, treasure, liquidator, borrower, seizeTokens }) =>
        evilSeize(
          world,
          from,
          gToken,
          treasure,
          liquidator.val,
          borrower.val,
          seizeTokens
        ),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; amount: NumberV }>(
      `
        #### ReduceReserves

        * "GToken <gToken> ReduceReserves amount:<Number>" - Reduces the reserves of the gToken
          * E.g. "GToken cZRX ReduceReserves 1.0e18"
      `,
      "ReduceReserves",
      [new Arg("gToken", getGTokenV), new Arg("amount", getNumberV)],
      (world, from, { gToken, amount }) =>
        reduceReserves(world, from, gToken, amount),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; amount: NumberV }>(
      `
    #### AddReserves

    * "GToken <gToken> AddReserves amount:<Number>" - Adds reserves to the gToken
      * E.g. "GToken cZRX AddReserves 1.0e18"
  `,
      "AddReserves",
      [new Arg("gToken", getGTokenV), new Arg("amount", getNumberV)],
      (world, from, { gToken, amount }) =>
        addReserves(world, from, gToken, amount),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; newPendingAdmin: AddressV }>(
      `
        #### SetPendingAdmin

        * "GToken <gToken> SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the gToken
          * E.g. "GToken cZRX SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [new Arg("gToken", getGTokenV), new Arg("newPendingAdmin", getAddressV)],
      (world, from, { gToken, newPendingAdmin }) =>
        setPendingAdmin(world, from, gToken, newPendingAdmin.val),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken }>(
      `
        #### AcceptAdmin

        * "GToken <gToken> AcceptAdmin" - Accepts admin for the gToken
          * E.g. "From Geoff (GToken cZRX AcceptAdmin)"
      `,
      "AcceptAdmin",
      [new Arg("gToken", getGTokenV)],
      (world, from, { gToken }) => acceptAdmin(world, from, gToken),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; reserveFactor: NumberV }>(
      `
        #### SetReserveFactor

        * "GToken <gToken> SetReserveFactor reserveFactor:<Number>" - Sets the reserve factor for the gToken
          * E.g. "GToken cZRX SetReserveFactor 0.1"
      `,
      "SetReserveFactor",
      [new Arg("gToken", getGTokenV), new Arg("reserveFactor", getExpNumberV)],
      (world, from, { gToken, reserveFactor }) =>
        setReserveFactor(world, from, gToken, reserveFactor),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; interestRateModel: AddressV }>(
      `
        #### SetInterestRateModel

        * "GToken <gToken> SetInterestRateModel interestRateModel:<Contract>" - Sets the interest rate model for the given gToken
          * E.g. "GToken cZRX SetInterestRateModel (FixedRate 1.5)"
      `,
      "SetInterestRateModel",
      [
        new Arg("gToken", getGTokenV),
        new Arg("interestRateModel", getAddressV),
      ],
      (world, from, { gToken, interestRateModel }) =>
        setInterestRateModel(world, from, gToken, interestRateModel.val),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; gTroller: AddressV }>(
      `
        #### SetGtroller

        * "GToken <gToken> SetGtroller gTroller:<Contract>" - Sets the gTroller for the given gToken
          * E.g. "GToken cZRX SetGtroller Gtroller"
      `,
      "SetGtroller",
      [new Arg("gToken", getGTokenV), new Arg("gTroller", getAddressV)],
      (world, from, { gToken, gTroller }) =>
        setGtroller(world, from, gToken, gTroller.val),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken }>(
      `
        #### Gulp
        * "GToken <gToken> Gulp" - Gulps for the gToken
          * E.g. "GToken cZRX Gulp"
      `,
      "Gulp",
      [new Arg("gToken", getGTokenV)],
      (world, from, { gToken }) => gulp(world, from, gToken),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; amount: NumberV }>(
      `
        #### SetCollateralCap
        * "GToken <gToken> SetCollateralCap amount:<Number>" - Sets the collateral cap for the given gToken
          * E.g. "GToken cZRX SetCollateralCap 1e10"
      `,
      "SetCollateralCap",
      [new Arg("gToken", getGTokenV), new Arg("amount", getNumberV)],
      (world, from, { gToken, amount }) =>
        setCollateralCap(world, from, gToken, amount),
      { namePos: 1 }
    ),
    new Command<{
      gToken: GToken;
      becomeImplementationData: StringV;
    }>(
      `
        #### BecomeImplementation

        * "GToken <gToken> BecomeImplementation becomeImplementationData:<String>"
          * E.g. "GToken cDAI BecomeImplementation "0x01234anyByTeS56789""
      `,
      "BecomeImplementation",
      [
        new Arg("gToken", getGTokenV),
        new Arg("becomeImplementationData", getStringV),
      ],
      (world, from, { gToken, becomeImplementationData }) =>
        becomeImplementation(world, from, gToken, becomeImplementationData.val),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken }>(
      `
        #### ResignImplementation

        * "GToken <gToken> ResignImplementation"
          * E.g. "GToken cDAI ResignImplementation"
      `,
      "ResignImplementation",
      [new Arg("gToken", getGTokenV)],
      (world, from, { gToken }) => resignImplementation(world, from, gToken),
      { namePos: 1 }
    ),
    new Command<{
      gToken: GXrc20Delegator;
      implementation: AddressV;
      allowResign: BoolV;
      becomeImplementationData: StringV;
    }>(
      `
        #### SetImplementation

        * "GToken <gToken> SetImplementation implementation:<Address> allowResign:<Bool> becomeImplementationData:<String>"
          * E.g. "GToken cDAI SetImplementation (GToken cDAIDelegate Address) True "0x01234anyByTeS56789"
      `,
      "SetImplementation",
      [
        new Arg("gToken", getGXrc20DelegatorV),
        new Arg("implementation", getAddressV),
        new Arg("allowResign", getBoolV),
        new Arg("becomeImplementationData", getStringV),
      ],
      (
        world,
        from,
        { gToken, implementation, allowResign, becomeImplementationData }
      ) =>
        setImplementation(
          world,
          from,
          gToken,
          implementation.val,
          allowResign.val,
          becomeImplementationData.val
        ),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken }>(
      `
        #### Donate

        * "GToken <gToken> Donate" - Calls the donate (payable no-op) function
          * E.g. "(Trx Value 5.0e18 (GToken cETH Donate))"
      `,
      "Donate",
      [new Arg("gToken", getGTokenV)],
      (world, from, { gToken }) => donate(world, from, gToken),
      { namePos: 1 }
    ),
    new Command<{ gToken: GToken; variable: StringV; value: NumberV }>(
      `
        #### Mock

        * "GToken <gToken> Mock variable:<String> value:<Number>" - Mocks a given value on gToken. Note: value must be a supported mock and this will only work on a "GTokenScenario" contract.
          * E.g. "GToken cZRX Mock totalBorrows 5.0e18"
          * E.g. "GToken cZRX Mock totalReserves 0.5e18"
      `,
      "Mock",
      [
        new Arg("gToken", getGTokenV),
        new Arg("variable", getStringV),
        new Arg("value", getNumberV),
      ],
      (world, from, { gToken, variable, value }) =>
        setGTokenMock(world, from, <GTokenScenario>gToken, variable.val, value),
      { namePos: 1 }
    ),
    new View<{ gToken: GToken }>(
      `
        #### Minters

        * "GToken <gToken> Minters" - Print address of all minters
      `,
      "Minters",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => printMinters(world, gToken),
      { namePos: 1 }
    ),
    new View<{ gToken: GToken }>(
      `
        #### Borrowers

        * "GToken <gToken> Borrowers" - Print address of all borrowers
      `,
      "Borrowers",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => printBorrowers(world, gToken),
      { namePos: 1 }
    ),
    new View<{ gToken: GToken }>(
      `
        #### Liquidity

        * "GToken <gToken> Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => printLiquidity(world, gToken),
      { namePos: 1 }
    ),
    new View<{ gToken: GToken; input: StringV }>(
      `
        #### Decode

        * "Decode <gToken> input:<String>" - Prints information about a call to a gToken contract
      `,
      "Decode",
      [new Arg("gToken", getGTokenV), new Arg("input", getStringV)],
      (world, { gToken, input }) => decodeCall(world, gToken, input.val),
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
    gTokenCommands(),
    world,
    event,
    from
  );
}
