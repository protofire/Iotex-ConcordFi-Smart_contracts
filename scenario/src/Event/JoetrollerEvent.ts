import { Event } from "../Event";
import { addAction, describeUser, World } from "../World";
import { decodeCall, getPastEvents } from "../Contract";
import { Gtroller } from "../Contract/Gtroller";
import { GToken } from "../Contract/GToken";
import { invoke } from "../Invokation";
import {
  getAddressV,
  getBoolV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getPercentV,
  getStringV,
  getCoreValue,
} from "../CoreValue";
import { AddressV, BoolV, EventV, NumberV, StringV } from "../Value";
import { Arg, Command, View, processCommandEvent } from "../Command";
import { buildGtrollerImpl } from "../Builder/GtrollerImplBuilder";
import { GtrollerErrorReporter } from "../ErrorReporter";
import { getGtroller, getGtrollerImpl } from "../ContractLookup";
import { getLiquidity } from "../Value/GtrollerValue";
import { getGTokenV } from "../Value/GTokenValue";
import { encodeABI, rawValues } from "../Utils";

async function genGtroller(
  world: World,
  from: string,
  params: Event
): Promise<World> {
  let {
    world: nextWorld,
    gTrollerImpl: gTroller,
    gTrollerImplData: gTrollerData,
  } = await buildGtrollerImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added Gtroller (${gTrollerData.description}) at address ${gTroller._address}`,
    gTrollerData.invokation
  );

  return world;
}

async function setPaused(
  world: World,
  from: string,
  gTroller: Gtroller,
  actionName: string,
  isPaused: boolean
): Promise<World> {
  const pauseMap = {
    Mint: gTroller.methods._setMintPaused,
  };

  if (!pauseMap[actionName]) {
    throw `Cannot find pause function for action "${actionName}"`;
  }

  let invokation = await invoke(
    world,
    gTroller[actionName]([isPaused]),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Gtroller: set paused for ${actionName} to ${isPaused}`,
    invokation
  );

  return world;
}

async function setLiquidationIncentive(
  world: World,
  from: string,
  gTroller: Gtroller,
  liquidationIncentive: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setLiquidationIncentive(liquidationIncentive.encode()),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Set liquidation incentive to ${liquidationIncentive.show()}`,
    invokation
  );

  return world;
}

async function oldSupportMarket(
  world: World,
  from: string,
  gTroller: Gtroller,
  gToken: GToken
): Promise<World> {
  if (world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world.printer.printLine(
      `Dry run: Supporting market  \`${gToken._address}\``
    );
    return world;
  }

  let invokation = await invoke(
    world,
    gTroller.methods._supportMarket(gToken._address),
    from,
    GtrollerErrorReporter
  );

  world = addAction(world, `Supported market ${gToken.name}`, invokation);

  return world;
}

async function supportMarket(
  world: World,
  from: string,
  gTroller: Gtroller,
  gToken: GToken,
  version: NumberV
): Promise<World> {
  if (world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world.printer.printLine(
      `Dry run: Supporting market  \`${gToken._address}\``
    );
    return world;
  }

  let invokation = await invoke(
    world,
    gTroller.methods._supportMarket(gToken._address, version.encode()),
    from,
    GtrollerErrorReporter
  );

  world = addAction(world, `Supported market ${gToken.name}`, invokation);

  return world;
}

async function unlistMarket(
  world: World,
  from: string,
  gTroller: Gtroller,
  gToken: GToken
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods.unlist(gToken._address),
    from,
    GtrollerErrorReporter
  );

  world = addAction(world, `Unlisted market ${gToken.name}`, invokation);

  return world;
}

async function enterMarkets(
  world: World,
  from: string,
  gTroller: Gtroller,
  assets: string[]
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods.enterMarkets(assets),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Called enter assets ${assets} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function exitMarket(
  world: World,
  from: string,
  gTroller: Gtroller,
  asset: string
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods.exitMarket(asset),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Called exit market ${asset} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function updateGTokenVersion(
  world: World,
  from: string,
  gTroller: Gtroller,
  gToken: GToken,
  version: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods.updateGTokenVersion(gToken._address, version.encode()),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Update market ${gToken.name} version to ${version.show()}`,
    invokation
  );

  return world;
}

async function setPriceOracle(
  world: World,
  from: string,
  gTroller: Gtroller,
  priceOracleAddr: string
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setPriceOracle(priceOracleAddr),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Set price oracle for to ${priceOracleAddr} as ${describeUser(
      world,
      from
    )}`,
    invokation
  );

  return world;
}

async function setCollateralFactor(
  world: World,
  from: string,
  gTroller: Gtroller,
  gToken: GToken,
  collateralFactor: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setCollateralFactor(
      gToken._address,
      collateralFactor.encode()
    ),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Set collateral factor for ${gToken.name} to ${collateralFactor.show()}`,
    invokation
  );

  return world;
}

async function setCloseFactor(
  world: World,
  from: string,
  gTroller: Gtroller,
  closeFactor: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setCloseFactor(closeFactor.encode()),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Set close factor to ${closeFactor.show()}`,
    invokation
  );

  return world;
}

async function fastForward(
  world: World,
  from: string,
  gTroller: Gtroller,
  blocks: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods.fastForward(blocks.encode()),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Fast forward ${blocks.show()} blocks to #${invokation.value}`,
    invokation
  );

  return world;
}

async function printLiquidity(
  world: World,
  gTroller: Gtroller
): Promise<World> {
  let enterEvents = await getPastEvents(
    world,
    gTroller,
    "StdGtroller",
    "MarketEntered"
  );
  let addresses = enterEvents.map((event) => event.returnValues["account"]);
  let uniq = [...new Set(addresses)];

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

async function setPendingAdmin(
  world: World,
  from: string,
  gTroller: Gtroller,
  newPendingAdmin: string
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setPendingAdmin(newPendingAdmin),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Gtroller: ${describeUser(
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
  gTroller: Gtroller
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._acceptAdmin(),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Gtroller: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function setPauseGuardian(
  world: World,
  from: string,
  gTroller: Gtroller,
  newPauseGuardian: string
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setPauseGuardian(newPauseGuardian),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Gtroller: ${describeUser(
      world,
      from
    )} sets pause guardian to ${newPauseGuardian}`,
    invokation
  );

  return world;
}

async function setGuardianPaused(
  world: World,
  from: string,
  gTroller: Gtroller,
  action: string,
  state: boolean
): Promise<World> {
  let fun;
  switch (action) {
    case "Transfer":
      fun = gTroller.methods._setTransferPaused;
      break;
    case "Seize":
      fun = gTroller.methods._setSeizePaused;
      break;
  }
  let invokation = await invoke(world, fun(state), from, GtrollerErrorReporter);

  world = addAction(
    world,
    `Gtroller: ${describeUser(world, from)} sets ${action} paused`,
    invokation
  );

  return world;
}

async function setGuardianMarketPaused(
  world: World,
  from: string,
  gTroller: Gtroller,
  gToken: GToken,
  action: string,
  state: boolean
): Promise<World> {
  let fun;
  switch (action) {
    case "Mint":
      fun = gTroller.methods._setMintPaused;
      break;
    case "Borrow":
      fun = gTroller.methods._setBorrowPaused;
      break;
  }
  let invokation = await invoke(
    world,
    fun(gToken._address, state),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Gtroller: ${describeUser(world, from)} sets ${action} paused`,
    invokation
  );

  return world;
}

async function setMarketSupplyCaps(
  world: World,
  from: string,
  gTroller: Gtroller,
  gTokens: GToken[],
  supplyCaps: NumberV[]
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setMarketSupplyCaps(
      gTokens.map((c) => c._address),
      supplyCaps.map((c) => c.encode())
    ),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Supply caps on ${gTokens} set to ${supplyCaps}`,
    invokation
  );

  return world;
}

async function setSupplyCapGuardian(
  world: World,
  from: string,
  gTroller: Gtroller,
  newSupplyCapGuardian: string
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setSupplyCapGuardian(newSupplyCapGuardian),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Gtroller: ${describeUser(
      world,
      from
    )} sets supply cap guardian to ${newSupplyCapGuardian}`,
    invokation
  );

  return world;
}

async function setMarketBorrowCaps(
  world: World,
  from: string,
  gTroller: Gtroller,
  gTokens: GToken[],
  borrowCaps: NumberV[]
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setMarketBorrowCaps(
      gTokens.map((c) => c._address),
      borrowCaps.map((c) => c.encode())
    ),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Borrow caps on ${gTokens} set to ${borrowCaps}`,
    invokation
  );

  return world;
}

async function setBorrowCapGuardian(
  world: World,
  from: string,
  gTroller: Gtroller,
  newBorrowCapGuardian: string
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setBorrowCapGuardian(newBorrowCapGuardian),
    from,
    GtrollerErrorReporter
  );

  world = addAction(
    world,
    `Gtroller: ${describeUser(
      world,
      from
    )} sets borrow cap guardian to ${newBorrowCapGuardian}`,
    invokation
  );

  return world;
}

async function setBlockTimestamp(
  world: World,
  from: string,
  gTroller: Gtroller,
  blockTimestamp: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods.setBlockTimestamp(blockTimestamp.encode()),
    from,
    GtrollerErrorReporter
  );

  return addAction(
    world,
    `Set Governor blockTimestamp to ${blockTimestamp.show()}`,
    invokation
  );

  return world;
}

async function setCreditLimit(
  world: World,
  from: string,
  gTroller: Gtroller,
  protocol: string,
  creditLimit: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    gTroller.methods._setCreditLimit(protocol, creditLimit.encode()),
    from,
    GtrollerErrorReporter
  );

  return addAction(
    world,
    `Set ${protocol} credit limit to ${creditLimit.show()}`,
    invokation
  );
}

export function gTrollerCommands() {
  return [
    new Command<{ gTrollerParams: EventV }>(
      `
        #### Deploy

        * "Gtroller Deploy ...gTrollerParams" - Generates a new Gtroller (not as Impl)
          * E.g. "Gtroller Deploy YesNo"
      `,
      "Deploy",
      [new Arg("gTrollerParams", getEventV, { variadic: true })],
      (world, from, { gTrollerParams }) =>
        genGtroller(world, from, gTrollerParams.val)
    ),
    new Command<{ gTroller: Gtroller; action: StringV; isPaused: BoolV }>(
      `
        #### SetPaused

        * "Gtroller SetPaused <Action> <Bool>" - Pauses or unpaused given gToken function
          * E.g. "Gtroller SetPaused "Mint" True"
      `,
      "SetPaused",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("action", getStringV),
        new Arg("isPaused", getBoolV),
      ],
      (world, from, { gTroller, action, isPaused }) =>
        setPaused(world, from, gTroller, action.val, isPaused.val)
    ),
    new Command<{ gTroller: Gtroller; gToken: GToken }>(
      `
        #### OldSupportMarket

        * "Gtroller OldSupportMarket <GToken>" - Adds support in the Gtroller for the given gToken
          * E.g. "Gtroller OldSupportMarket cZRX"
      `,
      "OldSupportMarket",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("gToken", getGTokenV),
      ],
      (world, from, { gTroller, gToken }) =>
        oldSupportMarket(world, from, gTroller, gToken)
    ),
    new Command<{ gTroller: Gtroller; gToken: GToken; version: NumberV }>(
      `
        #### SupportMarket

        * "Gtroller SupportMarket <GToken> <Number>" - Adds support in the Gtroller for the given gToken
          * E.g. "Gtroller SupportMarket cZRX 0"
      `,
      "SupportMarket",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("gToken", getGTokenV),
        new Arg("version", getNumberV),
      ],
      (world, from, { gTroller, gToken, version }) =>
        supportMarket(world, from, gTroller, gToken, version)
    ),
    new Command<{ gTroller: Gtroller; gToken: GToken }>(
      `
        #### UnList

        * "Gtroller UnList <GToken>" - Mock unlists a given market in tests
          * E.g. "Gtroller UnList cZRX"
      `,
      "UnList",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("gToken", getGTokenV),
      ],
      (world, from, { gTroller, gToken }) =>
        unlistMarket(world, from, gTroller, gToken)
    ),
    new Command<{ gTroller: Gtroller; gTokens: GToken[] }>(
      `
        #### EnterMarkets

        * "Gtroller EnterMarkets (<GToken> ...)" - User enters the given markets
          * E.g. "Gtroller EnterMarkets (cZRX cETH)"
      `,
      "EnterMarkets",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("gTokens", getGTokenV, { mapped: true }),
      ],
      (world, from, { gTroller, gTokens }) =>
        enterMarkets(
          world,
          from,
          gTroller,
          gTokens.map((c) => c._address)
        )
    ),
    new Command<{ gTroller: Gtroller; gToken: GToken }>(
      `
        #### ExitMarket

        * "Gtroller ExitMarket <GToken>" - User exits the given markets
          * E.g. "Gtroller ExitMarket cZRX"
      `,
      "ExitMarket",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("gToken", getGTokenV),
      ],
      (world, from, { gTroller, gToken }) =>
        exitMarket(world, from, gTroller, gToken._address)
    ),
    new Command<{ gTroller: Gtroller; gToken: GToken; version: NumberV }>(
      `
        #### UpdateGTokenVersion

        * "Gtroller UpdateGTokenVersion <GToken> <Number>" - Update a GToken's version
          * E.g. "Gtroller UpdateGTokenVersion cZRX 1"
      `,
      "UpdateGTokenVersion",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("gToken", getGTokenV),
        new Arg("version", getNumberV),
      ],
      (world, from, { gTroller, gToken, version }) =>
        updateGTokenVersion(world, from, gTroller, gToken, version)
    ),
    new Command<{ gTroller: Gtroller; liquidationIncentive: NumberV }>(
      `
        #### LiquidationIncentive

        * "Gtroller LiquidationIncentive <Number>" - Sets the liquidation incentive
          * E.g. "Gtroller LiquidationIncentive 1.1"
      `,
      "LiquidationIncentive",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("liquidationIncentive", getExpNumberV),
      ],
      (world, from, { gTroller, liquidationIncentive }) =>
        setLiquidationIncentive(world, from, gTroller, liquidationIncentive)
    ),
    new Command<{ gTroller: Gtroller; priceOracle: AddressV }>(
      `
        #### SetPriceOracle

        * "Gtroller SetPriceOracle oracle:<Address>" - Sets the price oracle address
          * E.g. "Gtroller SetPriceOracle 0x..."
      `,
      "SetPriceOracle",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("priceOracle", getAddressV),
      ],
      (world, from, { gTroller, priceOracle }) =>
        setPriceOracle(world, from, gTroller, priceOracle.val)
    ),
    new Command<{
      gTroller: Gtroller;
      gToken: GToken;
      collateralFactor: NumberV;
    }>(
      `
        #### SetCollateralFactor

        * "Gtroller SetCollateralFactor <GToken> <Number>" - Sets the collateral factor for given gToken to number
          * E.g. "Gtroller SetCollateralFactor cZRX 0.1"
      `,
      "SetCollateralFactor",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("gToken", getGTokenV),
        new Arg("collateralFactor", getExpNumberV),
      ],
      (world, from, { gTroller, gToken, collateralFactor }) =>
        setCollateralFactor(world, from, gTroller, gToken, collateralFactor)
    ),
    new Command<{ gTroller: Gtroller; closeFactor: NumberV }>(
      `
        #### SetCloseFactor

        * "Gtroller SetCloseFactor <Number>" - Sets the close factor to given percentage
          * E.g. "Gtroller SetCloseFactor 0.2"
      `,
      "SetCloseFactor",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("closeFactor", getPercentV),
      ],
      (world, from, { gTroller, closeFactor }) =>
        setCloseFactor(world, from, gTroller, closeFactor)
    ),
    new Command<{ gTroller: Gtroller; newPendingAdmin: AddressV }>(
      `
        #### SetPendingAdmin

        * "Gtroller SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the Gtroller
          * E.g. "Gtroller SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("newPendingAdmin", getAddressV),
      ],
      (world, from, { gTroller, newPendingAdmin }) =>
        setPendingAdmin(world, from, gTroller, newPendingAdmin.val)
    ),
    new Command<{ gTroller: Gtroller }>(
      `
        #### AcceptAdmin

        * "Gtroller AcceptAdmin" - Accepts admin for the Gtroller
          * E.g. "From Geoff (Gtroller AcceptAdmin)"
      `,
      "AcceptAdmin",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      (world, from, { gTroller }) => acceptAdmin(world, from, gTroller)
    ),
    new Command<{ gTroller: Gtroller; newPauseGuardian: AddressV }>(
      `
        #### SetPauseGuardian

        * "Gtroller SetPauseGuardian newPauseGuardian:<Address>" - Sets the PauseGuardian for the Gtroller
          * E.g. "Gtroller SetPauseGuardian Geoff"
      `,
      "SetPauseGuardian",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("newPauseGuardian", getAddressV),
      ],
      (world, from, { gTroller, newPauseGuardian }) =>
        setPauseGuardian(world, from, gTroller, newPauseGuardian.val)
    ),

    new Command<{ gTroller: Gtroller; action: StringV; isPaused: BoolV }>(
      `
        #### SetGuardianPaused

        * "Gtroller SetGuardianPaused <Action> <Bool>" - Pauses or unpaused given gToken function
        * E.g. "Gtroller SetGuardianPaused "Transfer" True"
        `,
      "SetGuardianPaused",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("action", getStringV),
        new Arg("isPaused", getBoolV),
      ],
      (world, from, { gTroller, action, isPaused }) =>
        setGuardianPaused(world, from, gTroller, action.val, isPaused.val)
    ),

    new Command<{
      gTroller: Gtroller;
      gToken: GToken;
      action: StringV;
      isPaused: BoolV;
    }>(
      `
        #### SetGuardianMarketPaused

        * "Gtroller SetGuardianMarketPaused <GToken> <Action> <Bool>" - Pauses or unpaused given gToken function
        * E.g. "Gtroller SetGuardianMarketPaused cREP "Mint" True"
        `,
      "SetGuardianMarketPaused",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("gToken", getGTokenV),
        new Arg("action", getStringV),
        new Arg("isPaused", getBoolV),
      ],
      (world, from, { gTroller, gToken, action, isPaused }) =>
        setGuardianMarketPaused(
          world,
          from,
          gTroller,
          gToken,
          action.val,
          isPaused.val
        )
    ),

    new Command<{ gTroller: Gtroller; blocks: NumberV; _keyword: StringV }>(
      `
        #### FastForward

        * "FastForward n:<Number> Blocks" - Moves the block number forward "n" blocks. Note: in "GTokenScenario" and "GtrollerScenario" the current block number is mocked (starting at 100000). This is the only way for the protocol to see a higher block number (for accruing interest).
          * E.g. "Gtroller FastForward 5 Blocks" - Move block number forward 5 blocks.
      `,
      "FastForward",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("blocks", getNumberV),
        new Arg("_keyword", getStringV),
      ],
      (world, from, { gTroller, blocks }) =>
        fastForward(world, from, gTroller, blocks)
    ),
    new View<{ gTroller: Gtroller }>(
      `
        #### Liquidity

        * "Gtroller Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      (world, { gTroller }) => printLiquidity(world, gTroller)
    ),
    new View<{ gTroller: Gtroller; input: StringV }>(
      `
        #### Decode

        * "Decode input:<String>" - Prints information about a call to a Gtroller contract
      `,
      "Decode",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("input", getStringV),
      ],
      (world, { gTroller, input }) => decodeCall(world, gTroller, input.val)
    ),
    new Command<{
      gTroller: Gtroller;
      gTokens: GToken[];
      supplyCaps: NumberV[];
    }>(
      `
      #### SetMarketSupplyCaps

      * "Gtroller SetMarketSupplyCaps (<GToken> ...) (<supplyCap> ...)" - Sets Market Supply Caps
      * E.g. "Gtroller SetMarketSupplyCaps (cZRX cUSDC) (10000.0e18, 1000.0e6)
      `,
      "SetMarketSupplyCaps",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("gTokens", getGTokenV, { mapped: true }),
        new Arg("supplyCaps", getNumberV, { mapped: true }),
      ],
      (world, from, { gTroller, gTokens, supplyCaps }) =>
        setMarketSupplyCaps(world, from, gTroller, gTokens, supplyCaps)
    ),
    new Command<{ gTroller: Gtroller; newSupplyCapGuardian: AddressV }>(
      `
      #### SetSupplyCapGuardian

        * "Gtroller SetSupplyCapGuardian newSupplyCapGuardian:<Address>" - Sets the Supply Cap Guardian for the Gtroller
          * E.g. "Gtroller SetSupplyCapGuardian Geoff"
      `,
      "SetSupplyCapGuardian",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("newSupplyCapGuardian", getAddressV),
      ],
      (world, from, { gTroller, newSupplyCapGuardian }) =>
        setSupplyCapGuardian(world, from, gTroller, newSupplyCapGuardian.val)
    ),
    new Command<{
      gTroller: Gtroller;
      gTokens: GToken[];
      borrowCaps: NumberV[];
    }>(
      `
      #### SetMarketBorrowCaps

      * "Gtroller SetMarketBorrowCaps (<GToken> ...) (<borrowCap> ...)" - Sets Market Borrow Caps
      * E.g "Gtroller SetMarketBorrowCaps (cZRX cUSDC) (10000.0e18, 1000.0e6)
      `,
      "SetMarketBorrowCaps",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("gTokens", getGTokenV, { mapped: true }),
        new Arg("borrowCaps", getNumberV, { mapped: true }),
      ],
      (world, from, { gTroller, gTokens, borrowCaps }) =>
        setMarketBorrowCaps(world, from, gTroller, gTokens, borrowCaps)
    ),
    new Command<{ gTroller: Gtroller; newBorrowCapGuardian: AddressV }>(
      `
        #### SetBorrowCapGuardian

        * "Gtroller SetBorrowCapGuardian newBorrowCapGuardian:<Address>" - Sets the Borrow Cap Guardian for the Gtroller
          * E.g. "Gtroller SetBorrowCapGuardian Geoff"
      `,
      "SetBorrowCapGuardian",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("newBorrowCapGuardian", getAddressV),
      ],
      (world, from, { gTroller, newBorrowCapGuardian }) =>
        setBorrowCapGuardian(world, from, gTroller, newBorrowCapGuardian.val)
    ),
    new Command<{ gTroller: Gtroller; blockTimestamp: NumberV }>(
      `
        #### SetBlockTimestamp

        * "Gtroller SetBlockTimestamp <BlockTimestamp>" - Sets the blockTimestamp of the Gtroller
        * E.g. "Gtroller SetBlockTimestamp 500"
      `,
      "SetBlockTimestamp",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("blockTimestamp", getNumberV),
      ],
      (world, from, { gTroller, blockTimestamp }) =>
        setBlockTimestamp(world, from, gTroller, blockTimestamp)
    ),
    new Command<{
      gTroller: Gtroller;
      protocol: AddressV;
      creditLimit: NumberV;
    }>(
      `
        #### SetCreditLimit

        * "Gtroller SetCreditLimit <Protocol> <CreditLimit>" - Sets the credit limit of a protocol
        * E.g. "Gtroller SetCreditLimit Geoff 100"
      `,
      "SetCreditLimit",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("protocol", getAddressV),
        new Arg("creditLimit", getNumberV),
      ],
      (world, from, { gTroller, protocol, creditLimit }) =>
        setCreditLimit(world, from, gTroller, protocol.val, creditLimit)
    ),
  ];
}

export async function processGtrollerEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>(
    "Gtroller",
    gTrollerCommands(),
    world,
    event,
    from
  );
}
