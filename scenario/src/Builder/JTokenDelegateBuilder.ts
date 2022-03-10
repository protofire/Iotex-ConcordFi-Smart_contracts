import { Event } from "../Event";
import { World } from "../World";
import {
  GXrc20Delegate,
  GXrc20DelegateScenario,
} from "../Contract/GXrc20Delegate";
import { Invokation } from "../Invokation";
import { getStringV } from "../CoreValue";
import { StringV } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract, getTestContract } from "../Contract";

const GXrc20DelegateContract = getContract("GXrc20Delegate");
const GXrc20DelegateScenarioContract = getTestContract(
  "GXrc20DelegateScenario"
);
const GCapableXrc20DelegateContract = getContract("GCapableXrc20Delegate");
const GCollateralCapXrc20DelegateScenarioContract = getContract(
  "GCollateralCapXrc20DelegateScenario"
);
const GWrappedNativeDelegateScenarioContract = getContract(
  "GWrappedNativeDelegateScenario"
);

export interface GTokenDelegateData {
  invokation: Invokation<GXrc20Delegate>;
  name: string;
  contract: string;
  description?: string;
}

export async function buildGTokenDelegate(
  world: World,
  from: string,
  params: Event
): Promise<{
  world: World;
  jTokenDelegate: GXrc20Delegate;
  delegateData: GTokenDelegateData;
}> {
  const fetchers = [
    new Fetcher<{ name: StringV }, GTokenDelegateData>(
      `
        #### GXrc20Delegate

        * "GXrc20Delegate name:<String>"
          * E.g. "GTokenDelegate Deploy GXrc20Delegate cDAIDelegate"
      `,
      "GXrc20Delegate",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        return {
          invokation: await GXrc20DelegateContract.deploy<GXrc20Delegate>(
            world,
            from,
            []
          ),
          name: name.val,
          contract: "GXrc20Delegate",
          description: "Standard GXrc20 Delegate",
        };
      }
    ),

    new Fetcher<{ name: StringV }, GTokenDelegateData>(
      `
        #### GXrc20DelegateScenario

        * "GXrc20DelegateScenario name:<String>" - A GXrc20Delegate Scenario for local testing
          * E.g. "GTokenDelegate Deploy GXrc20DelegateScenario cDAIDelegate"
      `,
      "GXrc20DelegateScenario",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        return {
          invokation:
            await GXrc20DelegateScenarioContract.deploy<GXrc20DelegateScenario>(
              world,
              from,
              []
            ),
          name: name.val,
          contract: "GXrc20DelegateScenario",
          description: "Scenario GXrc20 Delegate",
        };
      }
    ),

    new Fetcher<{ name: StringV }, GTokenDelegateData>(
      `
        #### GCapableXrc20Delegate
        * "GCapableXrc20Delegate name:<String>"
          * E.g. "GTokenDelegate Deploy GCapableXrc20Delegate cLinkDelegate"
      `,
      "GCapableXrc20Delegate",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        return {
          invokation:
            await GCapableXrc20DelegateContract.deploy<GXrc20Delegate>(
              world,
              from,
              []
            ),
          name: name.val,
          contract: "GCapableXrc20Delegate",
          description: "Capable GXrc20 Delegate",
        };
      }
    ),

    new Fetcher<{ name: StringV }, GTokenDelegateData>(
      `
        #### GCollateralCapXrc20DelegateScenario
        * "GCollateralCapXrc20DelegateScenario name:<String>"
          * E.g. "GTokenDelegate Deploy GCollateralCapXrc20DelegateScenario cLinkDelegate"
      `,
      "GCollateralCapXrc20DelegateScenario",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        return {
          invokation:
            await GCollateralCapXrc20DelegateScenarioContract.deploy<GXrc20Delegate>(
              world,
              from,
              []
            ),
          name: name.val,
          contract: "GCollateralCapXrc20DelegateScenario",
          description: "Collateral Cap GXrc20 Delegate",
        };
      }
    ),

    new Fetcher<{ name: StringV }, GTokenDelegateData>(
      `
        #### GWrappedNativeDelegateScenario
        * "GWrappedNativeDelegateScenario name:<String>"
          * E.g. "GTokenDelegate Deploy GWrappedNativeDelegateScenario cLinkDelegate"
      `,
      "GWrappedNativeDelegateScenario",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        return {
          invokation:
            await GWrappedNativeDelegateScenarioContract.deploy<GXrc20Delegate>(
              world,
              from,
              []
            ),
          name: name.val,
          contract: "GWrappedNativeDelegateScenario",
          description: "Wrapped Native GXrc20 Delegate",
        };
      }
    ),
  ];

  let delegateData = await getFetcherValue<any, GTokenDelegateData>(
    "DeployGToken",
    fetchers,
    world,
    params
  );
  let invokation = delegateData.invokation;
  delete delegateData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const jTokenDelegate = invokation.value!;

  world = await storeAndSaveContract(
    world,
    jTokenDelegate,
    delegateData.name,
    invokation,
    [
      {
        index: ["GTokenDelegate", delegateData.name],
        data: {
          address: jTokenDelegate._address,
          contract: delegateData.contract,
          description: delegateData.description,
        },
      },
    ]
  );

  return { world, jTokenDelegate, delegateData };
}
