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
  jToken: GToken
): Promise<AddressV> {
  return new AddressV(await jToken.methods.interestRateModel().call());
}

async function jTokenAddress(world: World, jToken: GToken): Promise<AddressV> {
  return new AddressV(jToken._address);
}

async function getGTokenAdmin(world: World, jToken: GToken): Promise<AddressV> {
  return new AddressV(await jToken.methods.admin().call());
}

async function getGTokenPendingAdmin(
  world: World,
  jToken: GToken
): Promise<AddressV> {
  return new AddressV(await jToken.methods.pendingAdmin().call());
}

async function balanceOfUnderlying(
  world: World,
  jToken: GToken,
  user: string
): Promise<NumberV> {
  return new NumberV(await jToken.methods.balanceOfUnderlying(user).call());
}

async function getBorrowBalance(
  world: World,
  jToken: GToken,
  user
): Promise<NumberV> {
  return new NumberV(await jToken.methods.borrowBalanceCurrent(user).call());
}

async function getBorrowBalanceStored(
  world: World,
  jToken: GToken,
  user
): Promise<NumberV> {
  return new NumberV(await jToken.methods.borrowBalanceStored(user).call());
}

async function getTotalBorrows(world: World, jToken: GToken): Promise<NumberV> {
  return new NumberV(await jToken.methods.totalBorrows().call());
}

async function getTotalBorrowsCurrent(
  world: World,
  jToken: GToken
): Promise<NumberV> {
  return new NumberV(await jToken.methods.totalBorrowsCurrent().call());
}

async function getReserveFactor(
  world: World,
  jToken: GToken
): Promise<NumberV> {
  return new NumberV(
    await jToken.methods.reserveFactorMantissa().call(),
    1.0e18
  );
}

async function getTotalReserves(
  world: World,
  jToken: GToken
): Promise<NumberV> {
  return new NumberV(await jToken.methods.totalReserves().call());
}

async function getGtroller(world: World, jToken: GToken): Promise<AddressV> {
  return new AddressV(await jToken.methods.gTroller().call());
}

async function getExchangeRateStored(
  world: World,
  jToken: GToken
): Promise<NumberV> {
  return new NumberV(await jToken.methods.exchangeRateStored().call());
}

async function getExchangeRate(world: World, jToken: GToken): Promise<NumberV> {
  return new NumberV(await jToken.methods.exchangeRateCurrent().call(), 1e18);
}

async function getCash(world: World, jToken: GToken): Promise<NumberV> {
  return new NumberV(await jToken.methods.getCash().call());
}

async function getInterestRate(world: World, jToken: GToken): Promise<NumberV> {
  return new NumberV(
    await jToken.methods.borrowRatePerSecond().call(),
    1.0e18 / 31536000
  );
}

async function getImplementation(
  world: World,
  jToken: GToken
): Promise<AddressV> {
  return new AddressV(
    await (jToken as GXrc20Delegator).methods.implementation().call()
  );
}

async function getAccountCollateralToken(
  world: World,
  jToken: GToken,
  user: string
): Promise<NumberV> {
  return new NumberV(await jToken.methods.accountCollateralTokens(user).call());
}

async function getTotalCollateralTokens(
  world: World,
  jToken: GToken
): Promise<NumberV> {
  return new NumberV(await jToken.methods.totalCollateralTokens().call());
}

export function jTokenFetchers() {
  return [
    new Fetcher<{ jToken: GToken }, AddressV>(
      `
        #### Address

        * "GToken <GToken> Address" - Returns address of GToken contract
          * E.g. "GToken cZRX Address" - Returns cZRX's address
      `,
      "Address",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => jTokenAddress(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, AddressV>(
      `
        #### InterestRateModel

        * "GToken <GToken> InterestRateModel" - Returns the interest rate model of GToken contract
          * E.g. "GToken cZRX InterestRateModel" - Returns cZRX's interest rate model
      `,
      "InterestRateModel",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getInterestRateModel(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, AddressV>(
      `
        #### Admin

        * "GToken <GToken> Admin" - Returns the admin of GToken contract
          * E.g. "GToken cZRX Admin" - Returns cZRX's admin
      `,
      "Admin",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getGTokenAdmin(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, AddressV>(
      `
        #### PendingAdmin

        * "GToken <GToken> PendingAdmin" - Returns the pending admin of GToken contract
          * E.g. "GToken cZRX PendingAdmin" - Returns cZRX's pending admin
      `,
      "PendingAdmin",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getGTokenPendingAdmin(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, AddressV>(
      `
        #### Underlying

        * "GToken <GToken> Underlying" - Returns the underlying asset (if applicable)
          * E.g. "GToken cZRX Underlying"
      `,
      "Underlying",
      [new Arg("jToken", getGTokenV)],
      async (world, { jToken }) =>
        new AddressV(await jToken.methods.underlying().call()),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken; address: AddressV }, NumberV>(
      `
        #### UnderlyingBalance

        * "GToken <GToken> UnderlyingBalance <User>" - Returns a user's underlying balance (based on given exchange rate)
          * E.g. "GToken cZRX UnderlyingBalance Geoff"
      `,
      "UnderlyingBalance",
      [
        new Arg("jToken", getGTokenV),
        new Arg<AddressV>("address", getAddressV),
      ],
      (world, { jToken, address }) =>
        balanceOfUnderlying(world, jToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken; address: AddressV }, NumberV>(
      `
        #### BorrowBalance

        * "GToken <GToken> BorrowBalance <User>" - Returns a user's borrow balance (including interest)
          * E.g. "GToken cZRX BorrowBalance Geoff"
      `,
      "BorrowBalance",
      [new Arg("jToken", getGTokenV), new Arg("address", getAddressV)],
      (world, { jToken, address }) =>
        getBorrowBalance(world, jToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken; address: AddressV }, NumberV>(
      `
        #### BorrowBalanceStored

        * "GToken <GToken> BorrowBalanceStored <User>" - Returns a user's borrow balance (without specifically re-accruing interest)
          * E.g. "GToken cZRX BorrowBalanceStored Geoff"
      `,
      "BorrowBalanceStored",
      [new Arg("jToken", getGTokenV), new Arg("address", getAddressV)],
      (world, { jToken, address }) =>
        getBorrowBalanceStored(world, jToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, NumberV>(
      `
        #### TotalBorrows

        * "GToken <GToken> TotalBorrows" - Returns the jToken's total borrow balance
          * E.g. "GToken cZRX TotalBorrows"
      `,
      "TotalBorrows",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getTotalBorrows(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, NumberV>(
      `
        #### TotalBorrowsCurrent

        * "GToken <GToken> TotalBorrowsCurrent" - Returns the jToken's total borrow balance with interest
          * E.g. "GToken cZRX TotalBorrowsCurrent"
      `,
      "TotalBorrowsCurrent",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getTotalBorrowsCurrent(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, NumberV>(
      `
        #### Reserves

        * "GToken <GToken> Reserves" - Returns the jToken's total reserves
          * E.g. "GToken cZRX Reserves"
      `,
      "Reserves",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getTotalReserves(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, NumberV>(
      `
        #### ReserveFactor

        * "GToken <GToken> ReserveFactor" - Returns reserve factor of GToken contract
          * E.g. "GToken cZRX ReserveFactor" - Returns cZRX's reserve factor
      `,
      "ReserveFactor",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getReserveFactor(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, AddressV>(
      `
        #### Gtroller

        * "GToken <GToken> Gtroller" - Returns the jToken's gTroller
          * E.g. "GToken cZRX Gtroller"
      `,
      "Gtroller",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getGtroller(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, NumberV>(
      `
        #### ExchangeRateStored

        * "GToken <GToken> ExchangeRateStored" - Returns the jToken's exchange rate (based on balances stored)
          * E.g. "GToken cZRX ExchangeRateStored"
      `,
      "ExchangeRateStored",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getExchangeRateStored(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, NumberV>(
      `
        #### ExchangeRate

        * "GToken <GToken> ExchangeRate" - Returns the jToken's current exchange rate
          * E.g. "GToken cZRX ExchangeRate"
      `,
      "ExchangeRate",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getExchangeRate(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, NumberV>(
      `
        #### Cash

        * "GToken <GToken> Cash" - Returns the jToken's current cash
          * E.g. "GToken cZRX Cash"
      `,
      "Cash",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getCash(world, jToken),
      { namePos: 1 }
    ),

    new Fetcher<{ jToken: GToken }, NumberV>(
      `
        #### InterestRate

        * "GToken <GToken> InterestRate" - Returns the jToken's current interest rate
          * E.g. "GToken cZRX InterestRate"
      `,
      "InterestRate",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getInterestRate(world, jToken),
      { namePos: 1 }
    ),
    new Fetcher<{ jToken: GToken; signature: StringV }, NumberV>(
      `
        #### CallNum

        * "GToken <GToken> Call <signature>" - Simple direct call method, for now with no parameters
          * E.g. "GToken cZRX Call \"borrowIndex()\""
      `,
      "CallNum",
      [new Arg("jToken", getGTokenV), new Arg("signature", getStringV)],
      async (world, { jToken, signature }) => {
        const res = await world.web3.eth.call({
          to: jToken._address,
          data: world.web3.eth.abi.encodeFunctionSignature(signature.val),
        });
        const resNum: any = world.web3.eth.abi.decodeParameter("uint256", res);
        return new NumberV(resNum);
      },
      { namePos: 1 }
    ),
    new Fetcher<{ jToken: GToken }, AddressV>(
      `
        #### Implementation

        * "GToken <GToken> Implementation" - Returns the jToken's current implementation
          * E.g. "GToken cDAI Implementation"
      `,
      "Implementation",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getImplementation(world, jToken),
      { namePos: 1 }
    ),
    new Fetcher<{ jToken: GToken; address: AddressV }, NumberV>(
      `
        #### CollateralBalance

        * "GToken <GToken> CollateralBalance <User>" - Returns the user's collateral tokens
          * E.g. "GToken cDAI CollateralBalance Geoff"
      `,
      "CollateralBalance",
      [new Arg("jToken", getGTokenV), new Arg("address", getAddressV)],
      (world, { jToken, address }) =>
        getAccountCollateralToken(world, jToken, address.val),
      { namePos: 1 }
    ),
    new Fetcher<{ jToken: GToken }, NumberV>(
      `
        #### TotalCollateralTokens

        * "GToken <GToken> TotalCollateralTokens" - Returns the total collateral tokens
          * E.g. "GToken cDAI TotalCollateralTokens"
      `,
      "TotalCollateralTokens",
      [new Arg("jToken", getGTokenV)],
      (world, { jToken }) => getTotalCollateralTokens(world, jToken),
      { namePos: 1 }
    ),
  ];
}

export async function getGTokenValue(
  world: World,
  event: Event
): Promise<Value> {
  return await getFetcherValue<any, any>(
    "jToken",
    jTokenFetchers(),
    world,
    event
  );
}
