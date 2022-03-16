import { Event } from "../Event";
import { World } from "../World";
import { GToken } from "../Contract/GToken";
import { GXrc20Delegator } from "../Contract/GXrc20Delegator";
import { Erc20 } from "../Contract/Erc20";
import { getAddressV, getCoreValue, getStringV, mapValue } from "../CoreValue";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { AddressV, NumberV, Value, StringV } from "../Value";
import { getWorldContractByAddress, getGTokenAddress } from "../ContractLookup";

export async function getGTokenV(world: World, event: Event): Promise<GToken> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getGTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<GToken>(world, address.val);
}

export async function getGXrc20DelegatorV(
  world: World,
  event: Event
): Promise<GXrc20Delegator> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getGTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<GXrc20Delegator>(world, address.val);
}

async function getInterestRateModel(
  world: World,
  gToken: GToken
): Promise<AddressV> {
  return new AddressV(await gToken.methods.interestRateModel().call());
}

async function gTokenAddress(world: World, gToken: GToken): Promise<AddressV> {
  return new AddressV(gToken._address);
}

async function getGTokenAdmin(world: World, gToken: GToken): Promise<AddressV> {
  return new AddressV(await gToken.methods.admin().call());
}

async function getGTokenPendingAdmin(
  world: World,
  gToken: GToken
): Promise<AddressV> {
  return new AddressV(await gToken.methods.pendingAdmin().call());
}

async function balanceOfUnderlying(
  world: World,
  gToken: GToken,
  user: string
): Promise<NumberV> {
  return new NumberV(await gToken.methods.balanceOfUnderlying(user).call());
}

async function getBorrowBalance(
  world: World,
  gToken: GToken,
  user
): Promise<NumberV> {
  return new NumberV(await gToken.methods.borrowBalanceCurrent(user).call());
}

async function getBorrowBalanceStored(
  world: World,
  gToken: GToken,
  user
): Promise<NumberV> {
  return new NumberV(await gToken.methods.borrowBalanceStored(user).call());
}

async function getTotalBorrows(world: World, gToken: GToken): Promise<NumberV> {
  return new NumberV(await gToken.methods.totalBorrows().call());
}

async function getTotalBorrowsCurrent(
  world: World,
  gToken: GToken
): Promise<NumberV> {
  return new NumberV(await gToken.methods.totalBorrowsCurrent().call());
}

async function getReserveFactor(
  world: World,
  gToken: GToken
): Promise<NumberV> {
  return new NumberV(
    await gToken.methods.reserveFactorMantissa().call(),
    1.0e18
  );
}

async function getTotalReserves(
  world: World,
  gToken: GToken
): Promise<NumberV> {
  return new NumberV(await gToken.methods.totalReserves().call());
}

async function getGtroller(world: World, gToken: GToken): Promise<AddressV> {
  return new AddressV(await gToken.methods.gTroller().call());
}

async function getExchangeRateStored(
  world: World,
  gToken: GToken
): Promise<NumberV> {
  return new NumberV(await gToken.methods.exchangeRateStored().call());
}

async function getExchangeRate(world: World, gToken: GToken): Promise<NumberV> {
  return new NumberV(await gToken.methods.exchangeRateCurrent().call(), 1e18);
}

async function getCash(world: World, gToken: GToken): Promise<NumberV> {
  return new NumberV(await gToken.methods.getCash().call());
}

async function getInterestRate(world: World, gToken: GToken): Promise<NumberV> {
  return new NumberV(
    await gToken.methods.borrowRatePerSecond().call(),
    1.0e18 / 31536000
  );
}

async function getImplementation(
  world: World,
  gToken: GToken
): Promise<AddressV> {
  return new AddressV(
    await (gToken as GXrc20Delegator).methods.implementation().call()
  );
}

async function getAccountCollateralToken(
  world: World,
  gToken: GToken,
  user: string
): Promise<NumberV> {
  return new NumberV(await gToken.methods.accountCollateralTokens(user).call());
}

async function getTotalCollateralTokens(
  world: World,
  gToken: GToken
): Promise<NumberV> {
  return new NumberV(await gToken.methods.totalCollateralTokens().call());
}

export function gTokenFetchers() {
  return [
    new Fetcher<{ gToken: GToken }, AddressV>(
      `
        #### Address

        * "GToken <GToken> Address" - Returns address of GToken contract
          * E.g. "GToken cZRX Address" - Returns cZRX's address
      `,
      "Address",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => gTokenAddress(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, AddressV>(
      `
        #### InterestRateModel

        * "GToken <GToken> InterestRateModel" - Returns the interest rate model of GToken contract
          * E.g. "GToken cZRX InterestRateModel" - Returns cZRX's interest rate model
      `,
      "InterestRateModel",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getInterestRateModel(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, AddressV>(
      `
        #### Admin

        * "GToken <GToken> Admin" - Returns the admin of GToken contract
          * E.g. "GToken cZRX Admin" - Returns cZRX's admin
      `,
      "Admin",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getGTokenAdmin(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, AddressV>(
      `
        #### PendingAdmin

        * "GToken <GToken> PendingAdmin" - Returns the pending admin of GToken contract
          * E.g. "GToken cZRX PendingAdmin" - Returns cZRX's pending admin
      `,
      "PendingAdmin",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getGTokenPendingAdmin(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, AddressV>(
      `
        #### Underlying

        * "GToken <GToken> Underlying" - Returns the underlying asset (if applicable)
          * E.g. "GToken cZRX Underlying"
      `,
      "Underlying",
      [new Arg("gToken", getGTokenV)],
      async (world, { gToken }) =>
        new AddressV(await gToken.methods.underlying().call()),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken; address: AddressV }, NumberV>(
      `
        #### UnderlyingBalance

        * "GToken <GToken> UnderlyingBalance <User>" - Returns a user's underlying balance (based on given exchange rate)
          * E.g. "GToken cZRX UnderlyingBalance Geoff"
      `,
      "UnderlyingBalance",
      [
        new Arg("gToken", getGTokenV),
        new Arg<AddressV>("address", getAddressV),
      ],
      (world, { gToken, address }) =>
        balanceOfUnderlying(world, gToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken; address: AddressV }, NumberV>(
      `
        #### BorrowBalance

        * "GToken <GToken> BorrowBalance <User>" - Returns a user's borrow balance (including interest)
          * E.g. "GToken cZRX BorrowBalance Geoff"
      `,
      "BorrowBalance",
      [new Arg("gToken", getGTokenV), new Arg("address", getAddressV)],
      (world, { gToken, address }) =>
        getBorrowBalance(world, gToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken; address: AddressV }, NumberV>(
      `
        #### BorrowBalanceStored

        * "GToken <GToken> BorrowBalanceStored <User>" - Returns a user's borrow balance (without specifically re-accruing interest)
          * E.g. "GToken cZRX BorrowBalanceStored Geoff"
      `,
      "BorrowBalanceStored",
      [new Arg("gToken", getGTokenV), new Arg("address", getAddressV)],
      (world, { gToken, address }) =>
        getBorrowBalanceStored(world, gToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, NumberV>(
      `
        #### TotalBorrows

        * "GToken <GToken> TotalBorrows" - Returns the gToken's total borrow balance
          * E.g. "GToken cZRX TotalBorrows"
      `,
      "TotalBorrows",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getTotalBorrows(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, NumberV>(
      `
        #### TotalBorrowsCurrent

        * "GToken <GToken> TotalBorrowsCurrent" - Returns the gToken's total borrow balance with interest
          * E.g. "GToken cZRX TotalBorrowsCurrent"
      `,
      "TotalBorrowsCurrent",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getTotalBorrowsCurrent(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, NumberV>(
      `
        #### Reserves

        * "GToken <GToken> Reserves" - Returns the gToken's total reserves
          * E.g. "GToken cZRX Reserves"
      `,
      "Reserves",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getTotalReserves(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, NumberV>(
      `
        #### ReserveFactor

        * "GToken <GToken> ReserveFactor" - Returns reserve factor of GToken contract
          * E.g. "GToken cZRX ReserveFactor" - Returns cZRX's reserve factor
      `,
      "ReserveFactor",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getReserveFactor(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, AddressV>(
      `
        #### Gtroller

        * "GToken <GToken> Gtroller" - Returns the gToken's gTroller
          * E.g. "GToken cZRX Gtroller"
      `,
      "Gtroller",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getGtroller(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, NumberV>(
      `
        #### ExchangeRateStored

        * "GToken <GToken> ExchangeRateStored" - Returns the gToken's exchange rate (based on balances stored)
          * E.g. "GToken cZRX ExchangeRateStored"
      `,
      "ExchangeRateStored",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getExchangeRateStored(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, NumberV>(
      `
        #### ExchangeRate

        * "GToken <GToken> ExchangeRate" - Returns the gToken's current exchange rate
          * E.g. "GToken cZRX ExchangeRate"
      `,
      "ExchangeRate",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getExchangeRate(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, NumberV>(
      `
        #### Cash

        * "GToken <GToken> Cash" - Returns the gToken's current cash
          * E.g. "GToken cZRX Cash"
      `,
      "Cash",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getCash(world, gToken),
      { namePos: 1 }
    ),

    new Fetcher<{ gToken: GToken }, NumberV>(
      `
        #### InterestRate

        * "GToken <GToken> InterestRate" - Returns the gToken's current interest rate
          * E.g. "GToken cZRX InterestRate"
      `,
      "InterestRate",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getInterestRate(world, gToken),
      { namePos: 1 }
    ),
    new Fetcher<{ gToken: GToken; signature: StringV }, NumberV>(
      `
        #### CallNum

        * "GToken <GToken> Call <signature>" - Simple direct call method, for now with no parameters
          * E.g. "GToken cZRX Call \"borrowIndex()\""
      `,
      "CallNum",
      [new Arg("gToken", getGTokenV), new Arg("signature", getStringV)],
      async (world, { gToken, signature }) => {
        const res = await world.web3.eth.call({
          to: gToken._address,
          data: world.web3.eth.abi.encodeFunctionSignature(signature.val),
        });
        const resNum: any = world.web3.eth.abi.decodeParameter("uint256", res);
        return new NumberV(resNum);
      },
      { namePos: 1 }
    ),
    new Fetcher<{ gToken: GToken }, AddressV>(
      `
        #### Implementation

        * "GToken <GToken> Implementation" - Returns the gToken's current implementation
          * E.g. "GToken cDAI Implementation"
      `,
      "Implementation",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getImplementation(world, gToken),
      { namePos: 1 }
    ),
    new Fetcher<{ gToken: GToken; address: AddressV }, NumberV>(
      `
        #### CollateralBalance

        * "GToken <GToken> CollateralBalance <User>" - Returns the user's collateral tokens
          * E.g. "GToken cDAI CollateralBalance Geoff"
      `,
      "CollateralBalance",
      [new Arg("gToken", getGTokenV), new Arg("address", getAddressV)],
      (world, { gToken, address }) =>
        getAccountCollateralToken(world, gToken, address.val),
      { namePos: 1 }
    ),
    new Fetcher<{ gToken: GToken }, NumberV>(
      `
        #### TotalCollateralTokens

        * "GToken <GToken> TotalCollateralTokens" - Returns the total collateral tokens
          * E.g. "GToken cDAI TotalCollateralTokens"
      `,
      "TotalCollateralTokens",
      [new Arg("gToken", getGTokenV)],
      (world, { gToken }) => getTotalCollateralTokens(world, gToken),
      { namePos: 1 }
    ),
  ];
}

export async function getGTokenValue(
  world: World,
  event: Event
): Promise<Value> {
  return await getFetcherValue<any, any>(
    "gToken",
    gTokenFetchers(),
    world,
    event
  );
}
