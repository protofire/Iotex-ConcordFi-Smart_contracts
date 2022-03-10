import { Event } from "../Event";
import { addAction, World } from "../World";
import { GtrollerImpl } from "../Contract/GtrollerImpl";
import { Unitroller } from "../Contract/Unitroller";
import { invoke } from "../Invokation";
import {
  getAddressV,
  getArrayV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getStringV,
} from "../CoreValue";
import { ArrayV, AddressV, EventV, NumberV, StringV } from "../Value";
import { Arg, Command, View, processCommandEvent } from "../Command";
import { buildGtrollerImpl } from "../Builder/GtrollerImplBuilder";
import { GtrollerErrorReporter } from "../ErrorReporter";
import {
  getGtrollerImpl,
  getGtrollerImplData,
  getUnitroller,
} from "../ContractLookup";
import { verify } from "../Verify";
import { mergeContractABI } from "../Networks";

async function genGtrollerImpl(
  world: World,
  from: string,
  params: Event
): Promise<World> {
  let {
    world: nextWorld,
    gTrollerImpl,
    gTrollerImplData,
  } = await buildGtrollerImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added Gtroller Implementation (${gTrollerImplData.description}) at address ${gTrollerImpl._address}`,
    gTrollerImplData.invokation
  );

  return world;
}

async function mergeABI(
  world: World,
  from: string,
  gTrollerImpl: GtrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(
      world,
      "Gtroller",
      unitroller,
      unitroller.name,
      gTrollerImpl.name
    );
  }

  return world;
}

async function become(
  world: World,
  from: string,
  gTrollerImpl: GtrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    gTrollerImpl.methods._become(unitroller._address),
    from,
    GtrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(
      world,
      "Gtroller",
      unitroller,
      unitroller.name,
      gTrollerImpl.name
    );
  }

  world = addAction(
    world,
    `Become ${unitroller._address}'s Gtroller Impl`,
    invokation
  );

  return world;
}

async function verifyGtrollerImpl(
  world: World,
  gTrollerImpl: GtrollerImpl,
  name: string,
  contract: string,
  apiKey: string
): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(
      `Politely declining to verify on local network: ${world.network}.`
    );
  } else {
    await verify(world, apiKey, name, contract, gTrollerImpl._address);
  }

  return world;
}

export function gTrollerImplCommands() {
  return [
    new Command<{ gTrollerImplParams: EventV }>(
      `
        #### Deploy

        * "GtrollerImpl Deploy ...gTrollerImplParams" - Generates a new Gtroller Implementation
          * E.g. "GtrollerImpl Deploy MyScen Scenario"
      `,
      "Deploy",
      [new Arg("gTrollerImplParams", getEventV, { variadic: true })],
      (world, from, { gTrollerImplParams }) =>
        genGtrollerImpl(world, from, gTrollerImplParams.val)
    ),
    new View<{ gTrollerImplArg: StringV; apiKey: StringV }>(
      `
        #### Verify

        * "GtrollerImpl <Impl> Verify apiKey:<String>" - Verifies Gtroller Implemetation in Etherscan
          * E.g. "GtrollerImpl Verify "myApiKey"
      `,
      "Verify",
      [new Arg("gTrollerImplArg", getStringV), new Arg("apiKey", getStringV)],
      async (world, { gTrollerImplArg, apiKey }) => {
        let [gTrollerImpl, name, data] = await getGtrollerImplData(
          world,
          gTrollerImplArg.val
        );

        return await verifyGtrollerImpl(
          world,
          gTrollerImpl,
          name,
          data.get("contract")!,
          apiKey.val
        );
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      gTrollerImpl: GtrollerImpl;
    }>(
      `
        #### Become

        * "GtrollerImpl <Impl> Become <Rate> <JoeMarkets> <OtherMarkets>" - Become the gTroller, if possible.
          * E.g. "GtrollerImpl MyImpl Become 0.1e18 [cDAI, cETH, cUSDC]
      `,
      "Become",
      [
        new Arg("unitroller", getUnitroller, { implicit: true }),
        new Arg("gTrollerImpl", getGtrollerImpl),
      ],
      (world, from, { unitroller, gTrollerImpl }) => {
        return become(world, from, gTrollerImpl, unitroller);
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      gTrollerImpl: GtrollerImpl;
    }>(
      `
        #### MergeABI

        * "GtrollerImpl <Impl> MergeABI" - Merges the ABI, as if it was a become.
          * E.g. "GtrollerImpl MyImpl MergeABI
      `,
      "MergeABI",
      [
        new Arg("unitroller", getUnitroller, { implicit: true }),
        new Arg("gTrollerImpl", getGtrollerImpl),
      ],
      (world, from, { unitroller, gTrollerImpl }) =>
        mergeABI(world, from, gTrollerImpl, unitroller),
      { namePos: 1 }
    ),
  ];
}

export async function processGtrollerImplEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>(
    "GtrollerImpl",
    gTrollerImplCommands(),
    world,
    event,
    from
  );
}
