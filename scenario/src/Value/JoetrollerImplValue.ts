import { Event } from "../Event";
import { World } from "../World";
import { GtrollerImpl } from "../Contract/GtrollerImpl";
import { AddressV, Value } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { getGtrollerImpl } from "../ContractLookup";

export async function getGtrollerImplAddress(
  world: World,
  gTrollerImpl: GtrollerImpl
): Promise<AddressV> {
  return new AddressV(gTrollerImpl._address);
}

export function gTrollerImplFetchers() {
  return [
    new Fetcher<{ gTrollerImpl: GtrollerImpl }, AddressV>(
      `
        #### Address

        * "GtrollerImpl Address" - Returns address of gTroller implementation
      `,
      "Address",
      [new Arg("gTrollerImpl", getGtrollerImpl)],
      (world, { gTrollerImpl }) => getGtrollerImplAddress(world, gTrollerImpl),
      { namePos: 1 }
    ),
  ];
}

export async function getGtrollerImplValue(
  world: World,
  event: Event
): Promise<Value> {
  return await getFetcherValue<any, any>(
    "GtrollerImpl",
    gTrollerImplFetchers(),
    world,
    event
  );
}
