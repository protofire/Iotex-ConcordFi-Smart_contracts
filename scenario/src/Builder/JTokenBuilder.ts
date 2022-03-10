import { Event } from "../Event";
import { World } from "../World";
import {
  GXrc20Delegator,
  GXrc20DelegatorScenario,
  GCollateralCapXrc20DelegatorScenario,
  GWrappedNativeDelegatorScenario,
} from "../Contract/GXrc20Delegator";
import { GToken } from "../Contract/GToken";
import { Invokation, invoke } from "../Invokation";
import {
  getAddressV,
  getExpNumberV,
  getNumberV,
  getStringV,
} from "../CoreValue";
import { AddressV, NumberV, StringV } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract, getTestContract } from "../Contract";

const GXrc20Contract = getContract("GXrc20Immutable");
const GXrc20Delegator = getContract("GXrc20Delegator");
const GXrc20DelegatorScenario = getTestContract("GXrc20DelegatorScenario");
const GCollateralCapXrc20DelegatorScenario = getContract(
  "GCollateralCapXrc20DelegatorScenario"
);
const GWrappedNativeDelegatorScenario = getContract(
  "GWrappedNativeDelegatorScenario"
);
const GIotxContract = getContract("GIotx");
const GXrc20ScenarioContract = getTestContract("GXrc20Scenario");
const GIotxScenarioContract = getTestContract("GIotxScenario");
const JEvilContract = getTestContract("JEvil");

export interface TokenData {
  invokation: Invokation<GToken>;
  name: string;
  symbol: string;
  decimals?: number;
  underlying?: string;
  address?: string;
  contract: string;
  initial_exchange_rate_mantissa?: string;
  admin?: string;
}

export async function buildGToken(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; jToken: GToken; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        gTroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
      `
      #### GXrc20Delegator

      * "GXrc20Delegator symbol:<String> name:<String> underlying:<Address> gTroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - The real deal GToken
        * E.g. "GToken Deploy GXrc20Delegator cDAI \"Banker Joe DAI\" (Erc20 DAI Address) (Gtroller Address) (InterestRateModel Address) 1.0 8 Geoff (GToken CDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      "GXrc20Delegator",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("gTroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
        new Arg("implementation", getAddressV),
        new Arg("becomeImplementationData", getStringV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          gTroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData,
        }
      ) => {
        return {
          invokation: await GXrc20Delegator.deploy<GXrc20Delegator>(
            world,
            from,
            [
              underlying.val,
              gTroller.val,
              interestRateModel.val,
              initialExchangeRate.val,
              name.val,
              symbol.val,
              decimals.val,
              admin.val,
              implementation.val,
              becomeImplementationData.val,
            ]
          ),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "GXrc20Delegator",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        gTroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
      `
      #### GXrc20DelegatorScenario

      * "GXrc20DelegatorScenario symbol:<String> name:<String> underlying:<Address> gTroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - A GToken Scenario for local testing
        * E.g. "GToken Deploy GXrc20DelegatorScenario cDAI \"Banker Joe DAI\" (Erc20 DAI Address) (Gtroller Address) (InterestRateModel Address) 1.0 8 Geoff (GToken CDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      "GXrc20DelegatorScenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("gTroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
        new Arg("implementation", getAddressV),
        new Arg("becomeImplementationData", getStringV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          gTroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData,
        }
      ) => {
        return {
          invokation:
            await GXrc20DelegatorScenario.deploy<GXrc20DelegatorScenario>(
              world,
              from,
              [
                underlying.val,
                gTroller.val,
                interestRateModel.val,
                initialExchangeRate.val,
                name.val,
                symbol.val,
                decimals.val,
                admin.val,
                implementation.val,
                becomeImplementationData.val,
              ]
            ),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "GXrc20DelegatorScenario",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        gTroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
      `
      #### GCollateralCapXrc20DelegatorScenario

      * "GCollateralCapXrc20DelegatorScenario symbol:<String> name:<String> underlying:<Address> gTroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - A GToken Scenario for local testing
        * E.g. "GToken Deploy GCollateralCapXrc20DelegatorScenario cDAI \"Banker Joe DAI\" (Erc20 DAI Address) (Gtroller Address) (InterestRateModel Address) 1.0 8 Geoff (GToken CDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      "GCollateralCapXrc20DelegatorScenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("gTroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
        new Arg("implementation", getAddressV),
        new Arg("becomeImplementationData", getStringV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          gTroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData,
        }
      ) => {
        return {
          invokation:
            await GCollateralCapXrc20DelegatorScenario.deploy<GCollateralCapXrc20DelegatorScenario>(
              world,
              from,
              [
                underlying.val,
                gTroller.val,
                interestRateModel.val,
                initialExchangeRate.val,
                name.val,
                symbol.val,
                decimals.val,
                admin.val,
                implementation.val,
                becomeImplementationData.val,
              ]
            ),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "GCollateralCapXrc20DelegatorScenario",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        gTroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
      `
      #### GWrappedNativeDelegatorScenario

      * "GWrappedNativeDelegatorScenario symbol:<String> name:<String> underlying:<Address> gTroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - A GToken Scenario for local testing
        * E.g. "GToken Deploy GWrappedNativeDelegatorScenario cDAI \"Banker Joe DAI\" (Erc20 DAI Address) (Gtroller Address) (InterestRateModel Address) 1.0 8 Geoff (GToken CDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      "GWrappedNativeDelegatorScenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("gTroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
        new Arg("implementation", getAddressV),
        new Arg("becomeImplementationData", getStringV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          gTroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData,
        }
      ) => {
        return {
          invokation:
            await GWrappedNativeDelegatorScenario.deploy<GWrappedNativeDelegatorScenario>(
              world,
              from,
              [
                underlying.val,
                gTroller.val,
                interestRateModel.val,
                initialExchangeRate.val,
                name.val,
                symbol.val,
                decimals.val,
                admin.val,
                implementation.val,
                becomeImplementationData.val,
              ]
            ),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "GWrappedNativeDelegatorScenario",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        gTroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
      },
      TokenData
    >(
      `
        #### Scenario

        * "Scenario symbol:<String> name:<String> underlying:<Address> gTroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A GToken Scenario for local testing
          * E.g. "GToken Deploy Scenario cZRX \"Banker Joe ZRX\" (Erc20 ZRX Address) (Gtroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "Scenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("gTroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          gTroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        return {
          invokation: await GXrc20ScenarioContract.deploy<GToken>(world, from, [
            underlying.val,
            gTroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "GXrc20Scenario",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        admin: AddressV;
        gTroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
      },
      TokenData
    >(
      `
        #### GIotxScenario

        * "GIotxScenario symbol:<String> name:<String> gTroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A GToken Scenario for local testing
          * E.g. "GToken Deploy GIotxScenario cETH \"Banker Joe Ether\" (Gtroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "GIotxScenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("gTroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          gTroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        return {
          invokation: await GIotxScenarioContract.deploy<GToken>(world, from, [
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            gTroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: "",
          contract: "GIotxScenario",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        admin: AddressV;
        gTroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
      },
      TokenData
    >(
      `
        #### GIotx

        * "GIotx symbol:<String> name:<String> gTroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A GToken Scenario for local testing
          * E.g. "GToken Deploy GIotx cETH \"Banker Joe Ether\" (Gtroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "GIotx",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("gTroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          gTroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        return {
          invokation: await GIotxContract.deploy<GToken>(world, from, [
            gTroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: "",
          contract: "GIotx",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        admin: AddressV;
        underlying: AddressV;
        gTroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
      },
      TokenData
    >(
      `
        #### GXrc20

        * "GXrc20 symbol:<String> name:<String> underlying:<Address> gTroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A official GToken contract
          * E.g. "GToken Deploy GXrc20 cZRX \"Banker Joe ZRX\" (Erc20 ZRX Address) (Gtroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "GXrc20",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("gTroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          gTroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        return {
          invokation: await GXrc20Contract.deploy<GToken>(world, from, [
            underlying.val,
            gTroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "GXrc20",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        admin: AddressV;
        underlying: AddressV;
        gTroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
      },
      TokenData
    >(
      `
        #### JEvil

        * "JEvil symbol:<String> name:<String> underlying:<Address> gTroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A malicious GToken contract
          * E.g. "GToken Deploy JEvil cEVL \"Banker Joe EVL\" (Erc20 ZRX Address) (Gtroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "JEvil",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("gTroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          gTroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        return {
          invokation: await JEvilContract.deploy<GToken>(world, from, [
            underlying.val,
            gTroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "JEvil",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        admin: AddressV;
        underlying: AddressV;
        gTroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
      },
      TokenData
    >(
      `
        #### Standard

        * "symbol:<String> name:<String> underlying:<Address> gTroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A official GToken contract
          * E.g. "GToken Deploy Standard cZRX \"Banker Joe ZRX\" (Erc20 ZRX Address) (Gtroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "Standard",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("gTroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          gTroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        // Note: we're going to use the scenario contract as the standard deployment on local networks
        if (world.isLocalNetwork()) {
          return {
            invokation: await GXrc20ScenarioContract.deploy<GToken>(
              world,
              from,
              [
                underlying.val,
                gTroller.val,
                interestRateModel.val,
                initialExchangeRate.val,
                name.val,
                symbol.val,
                decimals.val,
                admin.val,
              ]
            ),
            name: name.val,
            symbol: symbol.val,
            decimals: decimals.toNumber(),
            underlying: underlying.val,
            contract: "GXrc20Scenario",
            initial_exchange_rate_mantissa: initialExchangeRate
              .encode()
              .toString(),
            admin: admin.val,
          };
        } else {
          return {
            invokation: await GXrc20Contract.deploy<GToken>(world, from, [
              underlying.val,
              gTroller.val,
              interestRateModel.val,
              initialExchangeRate.val,
              name.val,
              symbol.val,
              decimals.val,
              admin.val,
            ]),
            name: name.val,
            symbol: symbol.val,
            decimals: decimals.toNumber(),
            underlying: underlying.val,
            contract: "GXrc20Immutable",
            initial_exchange_rate_mantissa: initialExchangeRate
              .encode()
              .toString(),
            admin: admin.val,
          };
        }
      },
      { catchall: true }
    ),
  ];

  let tokenData = await getFetcherValue<any, TokenData>(
    "DeployGToken",
    fetchers,
    world,
    params
  );
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const jToken = invokation.value!;
  tokenData.address = jToken._address;

  world = await storeAndSaveContract(
    world,
    jToken,
    tokenData.symbol,
    invokation,
    [
      { index: ["jTokens", tokenData.symbol], data: tokenData },
      { index: ["Tokens", tokenData.symbol], data: tokenData },
    ]
  );

  return { world, jToken, tokenData };
}
