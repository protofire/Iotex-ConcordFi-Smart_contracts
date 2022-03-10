import { Map } from "immutable";

import { Event } from "./Event";
import { World } from "./World";
import { accountMap } from "./Accounts";
import { Contract } from "./Contract";
import { mustString } from "./Utils";

import { GXrc20Delegate } from "./Contract/GXrc20Delegate";
import { Joe } from "./Contract/Joe";
import { Gtroller } from "./Contract/Gtroller";
import { GtrollerImpl } from "./Contract/GtrollerImpl";
import { GToken } from "./Contract/GToken";
import { Erc20 } from "./Contract/Erc20";
import { InterestRateModel } from "./Contract/InterestRateModel";
import { PriceOracle } from "./Contract/PriceOracle";

type ContractDataEl = string | Map<string, object> | undefined;

function getContractData(world: World, indices: string[][]): ContractDataEl {
  return indices.reduce((value: ContractDataEl, index) => {
    if (value) {
      return value;
    } else {
      return index.reduce((data: ContractDataEl, el) => {
        let lowerEl = el.toLowerCase();

        if (!data) {
          return;
        } else if (typeof data === "string") {
          return data;
        } else {
          return (data as Map<string, ContractDataEl>).find(
            (_v, key) => key.toLowerCase().trim() === lowerEl.trim()
          );
        }
      }, world.contractData);
    }
  }, undefined);
}

function getContractDataString(world: World, indices: string[][]): string {
  const value: ContractDataEl = getContractData(world, indices);

  if (!value || typeof value !== "string") {
    throw new Error(
      `Failed to find string value by index (got ${value}): ${JSON.stringify(
        indices
      )}, index contains: ${JSON.stringify(world.contractData.toJSON())}`
    );
  }

  return value;
}

export function getWorldContract<T>(world: World, indices: string[][]): T {
  const address = getContractDataString(world, indices);

  return getWorldContractByAddress<T>(world, address);
}

export function getWorldContractByAddress<T>(world: World, address: string): T {
  const contract = world.contractIndex[address.toLowerCase()];

  if (!contract) {
    throw new Error(
      `Failed to find world contract by address: ${address}, index contains: ${JSON.stringify(
        Object.keys(world.contractIndex)
      )}`
    );
  }

  return <T>(<unknown>contract);
}

export async function getUnitroller(world: World): Promise<Gtroller> {
  return getWorldContract(world, [["Contracts", "Unitroller"]]);
}

export async function getGtroller(world: World): Promise<Gtroller> {
  return getWorldContract(world, [["Contracts", "Gtroller"]]);
}

export async function getGtrollerImpl(
  world: World,
  comptrollerImplArg: Event
): Promise<GtrollerImpl> {
  return getWorldContract(world, [
    ["Gtroller", mustString(comptrollerImplArg), "address"],
  ]);
}

export function getGTokenAddress(world: World, jTokenArg: string): string {
  return getContractDataString(world, [["jTokens", jTokenArg, "address"]]);
}

export function getGTokenDelegateAddress(
  world: World,
  jTokenDelegateArg: string
): string {
  return getContractDataString(world, [
    ["GTokenDelegate", jTokenDelegateArg, "address"],
  ]);
}

export function getErc20Address(world: World, erc20Arg: string): string {
  return getContractDataString(world, [["Tokens", erc20Arg, "address"]]);
}

export async function getPriceOracleProxy(world: World): Promise<PriceOracle> {
  return getWorldContract(world, [["Contracts", "PriceOracleProxy"]]);
}

export async function getPriceOracle(world: World): Promise<PriceOracle> {
  return getWorldContract(world, [["Contracts", "PriceOracle"]]);
}

export async function getJoe(world: World, compArg: Event): Promise<Joe> {
  return getWorldContract(world, [["Joe", "address"]]);
}

export async function getJoeData(
  world: World,
  compArg: string
): Promise<[Joe, string, Map<string, string>]> {
  let contract = await getJoe(world, <Event>(<any>compArg));
  let data = getContractData(world, [["Joe", compArg]]);

  return [contract, compArg, <Map<string, string>>(<any>data)];
}

export async function getInterestRateModel(
  world: World,
  interestRateModelArg: Event
): Promise<InterestRateModel> {
  return getWorldContract(world, [
    ["InterestRateModel", mustString(interestRateModelArg), "address"],
  ]);
}

export async function getInterestRateModelData(
  world: World,
  interestRateModelArg: string
): Promise<[InterestRateModel, string, Map<string, string>]> {
  let contract = await getInterestRateModel(
    world,
    <Event>(<any>interestRateModelArg)
  );
  let data = getContractData(world, [
    ["InterestRateModel", interestRateModelArg],
  ]);

  return [contract, interestRateModelArg, <Map<string, string>>(<any>data)];
}

export async function getErc20Data(
  world: World,
  erc20Arg: string
): Promise<[Erc20, string, Map<string, string>]> {
  let contract = getWorldContract<Erc20>(world, [
    ["Tokens", erc20Arg, "address"],
  ]);
  let data = getContractData(world, [["Tokens", erc20Arg]]);

  return [contract, erc20Arg, <Map<string, string>>(<any>data)];
}

export async function getGTokenData(
  world: World,
  jTokenArg: string
): Promise<[GToken, string, Map<string, string>]> {
  let contract = getWorldContract<GToken>(world, [
    ["jTokens", jTokenArg, "address"],
  ]);
  let data = getContractData(world, [["GTokens", jTokenArg]]);

  return [contract, jTokenArg, <Map<string, string>>(<any>data)];
}

export async function getGTokenDelegateData(
  world: World,
  jTokenDelegateArg: string
): Promise<[GXrc20Delegate, string, Map<string, string>]> {
  let contract = getWorldContract<GXrc20Delegate>(world, [
    ["GTokenDelegate", jTokenDelegateArg, "address"],
  ]);
  let data = getContractData(world, [["GTokenDelegate", jTokenDelegateArg]]);

  return [contract, jTokenDelegateArg, <Map<string, string>>(<any>data)];
}

export async function getGtrollerImplData(
  world: World,
  comptrollerImplArg: string
): Promise<[GtrollerImpl, string, Map<string, string>]> {
  let contract = await getGtrollerImpl(world, <Event>(<any>comptrollerImplArg));
  let data = getContractData(world, [["Gtroller", comptrollerImplArg]]);

  return [contract, comptrollerImplArg, <Map<string, string>>(<any>data)];
}

export function getAddress(world: World, addressArg: string): string {
  if (addressArg.toLowerCase() === "zero") {
    return "0x0000000000000000000000000000000000000000";
  }

  if (addressArg.startsWith("0x")) {
    return addressArg;
  }

  let alias = Object.entries(world.settings.aliases).find(
    ([alias, addr]) => alias.toLowerCase() === addressArg.toLowerCase()
  );
  if (alias) {
    return alias[1];
  }

  let account = world.accounts.find(
    (account) => account.name.toLowerCase() === addressArg.toLowerCase()
  );
  if (account) {
    return account.address;
  }

  return getContractDataString(world, [
    ["Contracts", addressArg],
    ["jTokens", addressArg, "address"],
    ["GTokenDelegate", addressArg, "address"],
    ["Tokens", addressArg, "address"],
    ["Gtroller", addressArg, "address"],
  ]);
}

export function getContractByName(world: World, name: string): Contract {
  return getWorldContract(world, [["Contracts", name]]);
}
