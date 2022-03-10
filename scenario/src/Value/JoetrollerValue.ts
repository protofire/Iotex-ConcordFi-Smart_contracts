import { Event } from "../Event";
import { World } from "../World";
import { Gtroller } from "../Contract/Gtroller";
import { GToken } from "../Contract/GToken";
import {
  getAddressV,
  getCoreValue,
  getStringV,
  getNumberV,
} from "../CoreValue";
import { AddressV, BoolV, ListV, NumberV, StringV, Value } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { getGtroller } from "../ContractLookup";
import { encodedNumber } from "../Encoding";
import { getGTokenV } from "../Value/GTokenValue";
import { encodeABI } from "../Utils";

export async function getGtrollerAddress(
  world: World,
  gTroller: Gtroller
): Promise<AddressV> {
  return new AddressV(gTroller._address);
}

export async function getLiquidity(
  world: World,
  gTroller: Gtroller,
  user: string
): Promise<NumberV> {
  let {
    0: error,
    1: liquidity,
    2: shortfall,
  } = await gTroller.methods.getAccountLiquidity(user).call();
  if (Number(error) != 0) {
    throw new Error(
      `Failed to joeute account liquidity: error code = ${error}`
    );
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

export async function getHypotheticalLiquidity(
  world: World,
  gTroller: Gtroller,
  account: string,
  asset: string,
  redeemTokens: encodedNumber,
  borrowAmount: encodedNumber
): Promise<NumberV> {
  let {
    0: error,
    1: liquidity,
    2: shortfall,
  } = await gTroller.methods
    .getHypotheticalAccountLiquidity(account, asset, redeemTokens, borrowAmount)
    .call();
  if (Number(error) != 0) {
    throw new Error(
      `Failed to joeute account hypothetical liquidity: error code = ${error}`
    );
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

async function getPriceOracle(
  world: World,
  gTroller: Gtroller
): Promise<AddressV> {
  return new AddressV(await gTroller.methods.oracle().call());
}

async function getCloseFactor(
  world: World,
  gTroller: Gtroller
): Promise<NumberV> {
  return new NumberV(await gTroller.methods.closeFactorMantissa().call(), 1e18);
}

async function getLiquidationIncentive(
  world: World,
  gTroller: Gtroller
): Promise<NumberV> {
  return new NumberV(
    await gTroller.methods.liquidationIncentiveMantissa().call(),
    1e18
  );
}

async function getImplementation(
  world: World,
  gTroller: Gtroller
): Promise<AddressV> {
  return new AddressV(await gTroller.methods.gTrollerImplementation().call());
}

async function getBlockTimestamp(
  world: World,
  gTroller: Gtroller
): Promise<NumberV> {
  return new NumberV(await gTroller.methods.getBlockTimestamp().call());
}

async function getAdmin(world: World, gTroller: Gtroller): Promise<AddressV> {
  return new AddressV(await gTroller.methods.admin().call());
}

async function getPendingAdmin(
  world: World,
  gTroller: Gtroller
): Promise<AddressV> {
  return new AddressV(await gTroller.methods.pendingAdmin().call());
}

async function getCollateralFactor(
  world: World,
  gTroller: Gtroller,
  jToken: GToken
): Promise<NumberV> {
  let { 0: _isListed, 1: collateralFactorMantissa } = await gTroller.methods
    .markets(jToken._address)
    .call();
  return new NumberV(collateralFactorMantissa, 1e18);
}

async function membershipLength(
  world: World,
  gTroller: Gtroller,
  user: string
): Promise<NumberV> {
  return new NumberV(await gTroller.methods.membershipLength(user).call());
}

async function checkMembership(
  world: World,
  gTroller: Gtroller,
  user: string,
  jToken: GToken
): Promise<BoolV> {
  return new BoolV(
    await gTroller.methods.checkMembership(user, jToken._address).call()
  );
}

async function getAssetsIn(
  world: World,
  gTroller: Gtroller,
  user: string
): Promise<ListV> {
  let assetsList = await gTroller.methods.getAssetsIn(user).call();

  return new ListV(assetsList.map((a) => new AddressV(a)));
}

async function checkListed(
  world: World,
  gTroller: Gtroller,
  jToken: GToken
): Promise<BoolV> {
  let { 0: isListed, 1: _collateralFactorMantissa } = await gTroller.methods
    .markets(jToken._address)
    .call();

  return new BoolV(isListed);
}

async function checkGTokenVersion(
  world: World,
  gTroller: Gtroller,
  jToken: GToken
): Promise<NumberV> {
  let {
    0: isListed,
    1: _collateralFactorMantissa,
    2: version,
  } = await gTroller.methods.markets(jToken._address).call();
  return new NumberV(version);
}

export function gTrollerFetchers() {
  return [
    new Fetcher<{ gTroller: Gtroller }, AddressV>(
      `
        #### Address

        * "Gtroller Address" - Returns address of gTroller
      `,
      "Address",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      (world, { gTroller }) => getGtrollerAddress(world, gTroller)
    ),
    new Fetcher<{ gTroller: Gtroller; account: AddressV }, NumberV>(
      `
        #### Liquidity

        * "Gtroller Liquidity <User>" - Returns a given user's trued up liquidity
          * E.g. "Gtroller Liquidity Geoff"
      `,
      "Liquidity",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      (world, { gTroller, account }) =>
        getLiquidity(world, gTroller, account.val)
    ),
    new Fetcher<
      {
        gTroller: Gtroller;
        account: AddressV;
        action: StringV;
        amount: NumberV;
        jToken: GToken;
      },
      NumberV
    >(
      `
        #### Hypothetical

        * "Gtroller Hypothetical <User> <Action> <Asset> <Number>" - Returns a given user's trued up liquidity given a hypothetical change in asset with redeeming a certain number of tokens and/or borrowing a given amount.
          * E.g. "Gtroller Hypothetical Geoff Redeems 6.0 cZRX"
          * E.g. "Gtroller Hypothetical Geoff Borrows 5.0 cZRX"
      `,
      "Hypothetical",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("account", getAddressV),
        new Arg("action", getStringV),
        new Arg("amount", getNumberV),
        new Arg("jToken", getGTokenV),
      ],
      async (world, { gTroller, account, action, jToken, amount }) => {
        let redeemTokens: NumberV;
        let borrowAmount: NumberV;

        switch (action.val.toLowerCase()) {
          case "borrows":
            redeemTokens = new NumberV(0);
            borrowAmount = amount;
            break;
          case "redeems":
            redeemTokens = amount;
            borrowAmount = new NumberV(0);
            break;
          default:
            throw new Error(`Unknown hypothetical: ${action.val}`);
        }

        return await getHypotheticalLiquidity(
          world,
          gTroller,
          account.val,
          jToken._address,
          redeemTokens.encode(),
          borrowAmount.encode()
        );
      }
    ),
    new Fetcher<{ gTroller: Gtroller }, AddressV>(
      `
        #### Admin

        * "Gtroller Admin" - Returns the Gtrollers's admin
          * E.g. "Gtroller Admin"
      `,
      "Admin",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      (world, { gTroller }) => getAdmin(world, gTroller)
    ),
    new Fetcher<{ gTroller: Gtroller }, AddressV>(
      `
        #### PendingAdmin

        * "Gtroller PendingAdmin" - Returns the pending admin of the Gtroller
          * E.g. "Gtroller PendingAdmin" - Returns Gtroller's pending admin
      `,
      "PendingAdmin",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      (world, { gTroller }) => getPendingAdmin(world, gTroller)
    ),
    new Fetcher<{ gTroller: Gtroller }, AddressV>(
      `
        #### PriceOracle

        * "Gtroller PriceOracle" - Returns the Gtrollers's price oracle
          * E.g. "Gtroller PriceOracle"
      `,
      "PriceOracle",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      (world, { gTroller }) => getPriceOracle(world, gTroller)
    ),
    new Fetcher<{ gTroller: Gtroller }, NumberV>(
      `
        #### CloseFactor

        * "Gtroller CloseFactor" - Returns the Gtrollers's price oracle
          * E.g. "Gtroller CloseFactor"
      `,
      "CloseFactor",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      (world, { gTroller }) => getCloseFactor(world, gTroller)
    ),
    new Fetcher<{ gTroller: Gtroller }, NumberV>(
      `
        #### LiquidationIncentive

        * "Gtroller LiquidationIncentive" - Returns the Gtrollers's liquidation incentive
          * E.g. "Gtroller LiquidationIncentive"
      `,
      "LiquidationIncentive",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      (world, { gTroller }) => getLiquidationIncentive(world, gTroller)
    ),
    new Fetcher<{ gTroller: Gtroller }, AddressV>(
      `
        #### Implementation

        * "Gtroller Implementation" - Returns the Gtrollers's implementation
          * E.g. "Gtroller Implementation"
      `,
      "Implementation",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      (world, { gTroller }) => getImplementation(world, gTroller)
    ),
    new Fetcher<{ gTroller: Gtroller }, NumberV>(
      `
        #### BlockTimestamp

        * "Gtroller BlockTimestamp" - Returns the Gtrollers's mocked block timestamp (for scenario runner)
          * E.g. "Gtroller BlockTimestamp"
      `,
      "BlockTimestamp",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      (world, { gTroller }) => getBlockTimestamp(world, gTroller)
    ),
    new Fetcher<{ gTroller: Gtroller; jToken: GToken }, NumberV>(
      `
        #### CollateralFactor

        * "Gtroller CollateralFactor <GToken>" - Returns the collateralFactor associated with a given asset
          * E.g. "Gtroller CollateralFactor cZRX"
      `,
      "CollateralFactor",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("jToken", getGTokenV),
      ],
      (world, { gTroller, jToken }) =>
        getCollateralFactor(world, gTroller, jToken)
    ),
    new Fetcher<{ gTroller: Gtroller; account: AddressV }, NumberV>(
      `
        #### MembershipLength

        * "Gtroller MembershipLength <User>" - Returns a given user's length of membership
          * E.g. "Gtroller MembershipLength Geoff"
      `,
      "MembershipLength",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      (world, { gTroller, account }) =>
        membershipLength(world, gTroller, account.val)
    ),
    new Fetcher<
      { gTroller: Gtroller; account: AddressV; jToken: GToken },
      BoolV
    >(
      `
        #### CheckMembership

        * "Gtroller CheckMembership <User> <GToken>" - Returns one if user is in asset, zero otherwise.
          * E.g. "Gtroller CheckMembership Geoff cZRX"
      `,
      "CheckMembership",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("account", getAddressV),
        new Arg("jToken", getGTokenV),
      ],
      (world, { gTroller, account, jToken }) =>
        checkMembership(world, gTroller, account.val, jToken)
    ),
    new Fetcher<{ gTroller: Gtroller; account: AddressV }, ListV>(
      `
        #### AssetsIn

        * "Gtroller AssetsIn <User>" - Returns the assets a user is in
          * E.g. "Gtroller AssetsIn Geoff"
      `,
      "AssetsIn",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      (world, { gTroller, account }) =>
        getAssetsIn(world, gTroller, account.val)
    ),
    new Fetcher<{ gTroller: Gtroller; jToken: GToken }, BoolV>(
      `
        #### CheckListed

        * "Gtroller CheckListed <GToken>" - Returns true if market is listed, false otherwise.
          * E.g. "Gtroller CheckListed cZRX"
      `,
      "CheckListed",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("jToken", getGTokenV),
      ],
      (world, { gTroller, jToken }) => checkListed(world, gTroller, jToken)
    ),
    new Fetcher<{ gTroller: Gtroller; jToken: GToken }, NumberV>(
      `
        #### CheckGTokenVersion

        * "Gtroller CheckGTokenVersion <GToken>" - Returns the version of given GToken.
          * E.g. "Gtroller CheckGTokenVersion cZRX"
      `,
      "CheckGTokenVersion",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("jToken", getGTokenV),
      ],
      (world, { gTroller, jToken }) =>
        checkGTokenVersion(world, gTroller, jToken)
    ),
    new Fetcher<{ gTroller: Gtroller }, AddressV>(
      `
        #### PauseGuardian

        * "PauseGuardian" - Returns the Gtrollers's PauseGuardian
        * E.g. "Gtroller PauseGuardian"
        `,
      "PauseGuardian",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      async (world, { gTroller }) =>
        new AddressV(await gTroller.methods.pauseGuardian().call())
    ),

    new Fetcher<{ gTroller: Gtroller }, BoolV>(
      `
        #### _MintGuardianPaused

        * "_MintGuardianPaused" - Returns the Gtrollers's original global Mint paused status
        * E.g. "Gtroller _MintGuardianPaused"
        `,
      "_MintGuardianPaused",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      async (world, { gTroller }) =>
        new BoolV(await gTroller.methods._mintGuardianPaused().call())
    ),
    new Fetcher<{ gTroller: Gtroller }, BoolV>(
      `
        #### _BorrowGuardianPaused

        * "_BorrowGuardianPaused" - Returns the Gtrollers's original global Borrow paused status
        * E.g. "Gtroller _BorrowGuardianPaused"
        `,
      "_BorrowGuardianPaused",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      async (world, { gTroller }) =>
        new BoolV(await gTroller.methods._borrowGuardianPaused().call())
    ),

    new Fetcher<{ gTroller: Gtroller }, BoolV>(
      `
        #### TransferGuardianPaused

        * "TransferGuardianPaused" - Returns the Gtrollers's Transfer paused status
        * E.g. "Gtroller TransferGuardianPaused"
        `,
      "TransferGuardianPaused",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      async (world, { gTroller }) =>
        new BoolV(await gTroller.methods.transferGuardianPaused().call())
    ),
    new Fetcher<{ gTroller: Gtroller }, BoolV>(
      `
        #### SeizeGuardianPaused

        * "SeizeGuardianPaused" - Returns the Gtrollers's Seize paused status
        * E.g. "Gtroller SeizeGuardianPaused"
        `,
      "SeizeGuardianPaused",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      async (world, { gTroller }) =>
        new BoolV(await gTroller.methods.seizeGuardianPaused().call())
    ),

    new Fetcher<{ gTroller: Gtroller; jToken: GToken }, BoolV>(
      `
        #### MintGuardianMarketPaused

        * "MintGuardianMarketPaused" - Returns the Gtrollers's Mint paused status in market
        * E.g. "Gtroller MintGuardianMarketPaused cREP"
        `,
      "MintGuardianMarketPaused",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("jToken", getGTokenV),
      ],
      async (world, { gTroller, jToken }) =>
        new BoolV(
          await gTroller.methods.mintGuardianPaused(jToken._address).call()
        )
    ),
    new Fetcher<{ gTroller: Gtroller; jToken: GToken }, BoolV>(
      `
        #### BorrowGuardianMarketPaused

        * "BorrowGuardianMarketPaused" - Returns the Gtrollers's Borrow paused status in market
        * E.g. "Gtroller BorrowGuardianMarketPaused cREP"
        `,
      "BorrowGuardianMarketPaused",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("jToken", getGTokenV),
      ],
      async (world, { gTroller, jToken }) =>
        new BoolV(
          await gTroller.methods.borrowGuardianPaused(jToken._address).call()
        )
    ),
    new Fetcher<
      { gTroller: Gtroller; signature: StringV; callArgs: StringV[] },
      NumberV
    >(
      `
        #### CallNum

        * "CallNum signature:<String> ...callArgs<CoreValue>" - Simple direct call method
          * E.g. "Gtroller CallNum \"joeSpeeds(address)\" (Address Coburn)"
      `,
      "CallNum",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, { variadic: true, mapped: true }),
      ],
      async (world, { gTroller, signature, callArgs }) => {
        const fnData = encodeABI(
          world,
          signature.val,
          callArgs.map((a) => a.val)
        );
        const res = await world.web3.eth.call({
          to: gTroller._address,
          data: fnData,
        });
        const resNum: any = world.web3.eth.abi.decodeParameter("uint256", res);
        return new NumberV(resNum);
      }
    ),
    new Fetcher<{ gTroller: Gtroller }, AddressV>(
      `
        #### SupplyCapGuardian

        * "SupplyCapGuardian" - Returns the Gtrollers's SupplyCapGuardian
        * E.g. "Gtroller SupplyCapGuardian"
        `,
      "SupplyCapGuardian",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      async (world, { gTroller }) =>
        new AddressV(await gTroller.methods.supplyCapGuardian().call())
    ),
    new Fetcher<{ gTroller: Gtroller; GToken: GToken }, NumberV>(
      `
        #### SupplyCaps

        * "Gtroller SupplyCaps cZRX
      `,
      "SupplyCaps",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("GToken", getGTokenV),
      ],
      async (world, { gTroller, GToken }) => {
        return new NumberV(
          await gTroller.methods.supplyCaps(GToken._address).call()
        );
      }
    ),
    new Fetcher<{ gTroller: Gtroller }, AddressV>(
      `
        #### BorrowCapGuardian

        * "BorrowCapGuardian" - Returns the Gtrollers's BorrowCapGuardian
        * E.g. "Gtroller BorrowCapGuardian"
        `,
      "BorrowCapGuardian",
      [new Arg("gTroller", getGtroller, { implicit: true })],
      async (world, { gTroller }) =>
        new AddressV(await gTroller.methods.borrowCapGuardian().call())
    ),
    new Fetcher<{ gTroller: Gtroller; GToken: GToken }, NumberV>(
      `
        #### BorrowCaps

        * "Gtroller BorrowCaps cZRX
      `,
      "BorrowCaps",
      [
        new Arg("gTroller", getGtroller, { implicit: true }),
        new Arg("GToken", getGTokenV),
      ],
      async (world, { gTroller, GToken }) => {
        return new NumberV(
          await gTroller.methods.borrowCaps(GToken._address).call()
        );
      }
    ),
  ];
}

export async function getGtrollerValue(
  world: World,
  event: Event
): Promise<Value> {
  return await getFetcherValue<any, any>(
    "Gtroller",
    gTrollerFetchers(),
    world,
    event
  );
}
