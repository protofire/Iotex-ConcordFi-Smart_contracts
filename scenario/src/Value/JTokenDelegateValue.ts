import { Event } from "../Event";
import { World } from "../World";
import { GXrc20Delegate } from "../Contract/GXrc20Delegate";
import { getCoreValue, mapValue } from "../CoreValue";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { AddressV, Value } from "../Value";
import {
  getWorldContractByAddress,
  getGTokenDelegateAddress,
} from "../ContractLookup";

export async function getGTokenDelegateV(
  world: World,
  event: Event
): Promise<GXrc20Delegate> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getGTokenDelegateAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<GXrc20Delegate>(world, address.val);
}

async function gTokenDelegateAddress(
  world: World,
  gTokenDelegate: GXrc20Delegate
): Promise<AddressV> {
  return new AddressV(gTokenDelegate._address);
}

export function gTokenDelegateFetchers() {
  return [
    new Fetcher<{ gTokenDelegate: GXrc20Delegate }, AddressV>(
      `
        #### Address

        * "GTokenDelegate <GTokenDelegate> Address" - Returns address of GTokenDelegate contract
          * E.g. "GTokenDelegate cDaiDelegate Address" - Returns cDaiDelegate's address
      `,
      "Address",
      [new Arg("gTokenDelegate", getGTokenDelegateV)],
      (world, { gTokenDelegate }) =>
        gTokenDelegateAddress(world, gTokenDelegate),
      { namePos: 1 }
    ),
  ];
}

export async function getGTokenDelegateValue(
  world: World,
  event: Event
): Promise<Value> {
  return await getFetcherValue<any, any>(
    "GTokenDelegate",
    gTokenDelegateFetchers(),
    world,
    event
  );
}
