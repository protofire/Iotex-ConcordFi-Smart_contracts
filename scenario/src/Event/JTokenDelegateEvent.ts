import { Event } from "../Event";
import { addAction, describeUser, World } from "../World";
import { decodeCall, getPastEvents } from "../Contract";
import { GToken, GTokenScenario } from "../Contract/GToken";
import { GXrc20Delegate } from "../Contract/GXrc20Delegate";
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
import { Arg, Command, View, processCommandEvent } from "../Command";
import { getGTokenDelegateData } from "../ContractLookup";
import { buildGTokenDelegate } from "../Builder/GTokenDelegateBuilder";
import { verify } from "../Verify";

async function genGTokenDelegate(
  world: World,
  from: string,
  event: Event
): Promise<World> {
  let {
    world: nextWorld,
    jTokenDelegate,
    delegateData,
  } = await buildGTokenDelegate(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added jToken ${delegateData.name} (${delegateData.contract}) at address ${jTokenDelegate._address}`,
    delegateData.invokation
  );

  return world;
}

async function verifyGTokenDelegate(
  world: World,
  jTokenDelegate: GXrc20Delegate,
  name: string,
  contract: string,
  apiKey: string
): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(
      `Politely declining to verify on local network: ${world.network}.`
    );
  } else {
    await verify(world, apiKey, name, contract, jTokenDelegate._address);
  }

  return world;
}

export function jTokenDelegateCommands() {
  return [
    new Command<{ jTokenDelegateParams: EventV }>(
      `
        #### Deploy

        * "GTokenDelegate Deploy ...jTokenDelegateParams" - Generates a new GTokenDelegate
          * E.g. "GTokenDelegate Deploy CDaiDelegate cDAIDelegate"
      `,
      "Deploy",
      [new Arg("jTokenDelegateParams", getEventV, { variadic: true })],
      (world, from, { jTokenDelegateParams }) =>
        genGTokenDelegate(world, from, jTokenDelegateParams.val)
    ),
    new View<{ jTokenDelegateArg: StringV; apiKey: StringV }>(
      `
        #### Verify

        * "GTokenDelegate <jTokenDelegate> Verify apiKey:<String>" - Verifies GTokenDelegate in Etherscan
          * E.g. "GTokenDelegate cDaiDelegate Verify "myApiKey"
      `,
      "Verify",
      [new Arg("jTokenDelegateArg", getStringV), new Arg("apiKey", getStringV)],
      async (world, { jTokenDelegateArg, apiKey }) => {
        let [jToken, name, data] = await getGTokenDelegateData(
          world,
          jTokenDelegateArg.val
        );

        return await verifyGTokenDelegate(
          world,
          jToken,
          name,
          data.get("contract")!,
          apiKey.val
        );
      },
      { namePos: 1 }
    ),
  ];
}

export async function processGTokenDelegateEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>(
    "GTokenDelegate",
    jTokenDelegateCommands(),
    world,
    event,
    from
  );
}
