import { Event } from "../Event";
import { World } from "../World";
import { GtrollerImpl } from "../Contract/GtrollerImpl";
import { Invokation, invoke } from "../Invokation";
import { getStringV } from "../CoreValue";
import { StringV } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract, getTestContract } from "../Contract";

const GtrollerScenarioContract = getTestContract("GtrollerScenario");
const GtrollerContract = getContract("Gtroller");

const GtrollerBorkedContract = getTestContract("GtrollerBorked");

export interface GtrollerImplData {
  invokation: Invokation<GtrollerImpl>;
  name: string;
  contract: string;
  description: string;
}

export async function buildGtrollerImpl(
  world: World,
  from: string,
  event: Event
): Promise<{
  world: World;
  gTrollerImpl: GtrollerImpl;
  gTrollerImplData: GtrollerImplData;
}> {
  const fetchers = [
    new Fetcher<{ name: StringV }, GtrollerImplData>(
      `
        #### Scenario

        * "Scenario name:<String>" - The Gtroller Scenario for local testing
          * E.g. "GtrollerImpl Deploy Scenario MyScen"
      `,
      "Scenario",
      [new Arg("name", getStringV)],
      async (world, { name }) => ({
        invokation: await GtrollerScenarioContract.deploy<GtrollerImpl>(
          world,
          from,
          []
        ),
        name: name.val,
        contract: "GtrollerScenario",
        description: "Scenario Gtroller Impl",
      })
    ),

    new Fetcher<{ name: StringV }, GtrollerImplData>(
      `
        #### Standard

        * "Standard name:<String>" - The standard Gtroller contract
          * E.g. "Gtroller Deploy Standard MyStandard"
      `,
      "Standard",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        return {
          invokation: await GtrollerContract.deploy<GtrollerImpl>(
            world,
            from,
            []
          ),
          name: name.val,
          contract: "Gtroller",
          description: "Standard Gtroller Impl",
        };
      }
    ),

    new Fetcher<{ name: StringV }, GtrollerImplData>(
      `
        #### Borked

        * "Borked name:<String>" - A Borked Gtroller for testing
          * E.g. "GtrollerImpl Deploy Borked MyBork"
      `,
      "Borked",
      [new Arg("name", getStringV)],
      async (world, { name }) => ({
        invokation: await GtrollerBorkedContract.deploy<GtrollerImpl>(
          world,
          from,
          []
        ),
        name: name.val,
        contract: "GtrollerBorked",
        description: "Borked Gtroller Impl",
      })
    ),
    new Fetcher<{ name: StringV }, GtrollerImplData>(
      `
        #### Default

        * "name:<String>" - The standard Gtroller contract
          * E.g. "GtrollerImpl Deploy MyDefault"
      `,
      "Default",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        if (world.isLocalNetwork()) {
          // Note: we're going to use the scenario contract as the standard deployment on local networks
          return {
            invokation: await GtrollerScenarioContract.deploy<GtrollerImpl>(
              world,
              from,
              []
            ),
            name: name.val,
            contract: "GtrollerScenario",
            description: "Scenario Gtroller Impl",
          };
        } else {
          return {
            invokation: await GtrollerContract.deploy<GtrollerImpl>(
              world,
              from,
              []
            ),
            name: name.val,
            contract: "Gtroller",
            description: "Standard Gtroller Impl",
          };
        }
      },
      { catchall: true }
    ),
  ];

  let gTrollerImplData = await getFetcherValue<any, GtrollerImplData>(
    "DeployGtrollerImpl",
    fetchers,
    world,
    event
  );
  let invokation = gTrollerImplData.invokation;
  delete gTrollerImplData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const gTrollerImpl = invokation.value!;

  world = await storeAndSaveContract(
    world,
    gTrollerImpl,
    gTrollerImplData.name,
    invokation,
    [
      {
        index: ["Gtroller", gTrollerImplData.name],
        data: {
          address: gTrollerImpl._address,
          contract: gTrollerImplData.contract,
          description: gTrollerImplData.description,
        },
      },
    ]
  );

  return { world, gTrollerImpl, gTrollerImplData };
}
