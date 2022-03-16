import { Contract } from "../Contract";
import { Callable, Sendable } from "../Invokation";
import { encodedNumber } from "../Encoding";

interface GtrollerMethods {
  getAccountLiquidity(string): Callable<{ 0: number; 1: number; 2: number }>;
  getHypotheticalAccountLiquidity(
    account: string,
    asset: string,
    redeemTokens: encodedNumber,
    borrowAmount: encodedNumber
  ): Callable<{ 0: number; 1: number; 2: number }>;
  membershipLength(string): Callable<string>;
  checkMembership(user: string, gToken: string): Callable<string>;
  getAssetsIn(string): Callable<string[]>;
  admin(): Callable<string>;
  oracle(): Callable<string>;
  liquidationIncentiveMantissa(): Callable<number>;
  closeFactorMantissa(): Callable<number>;
  getBlockTimestamp(): Callable<number>;
  setBlockTimestamp(encodedNumber): Sendable<number>;
  collateralFactor(string): Callable<string>;
  markets(string): Callable<{ 0: boolean; 1: number; 2?: number }>;
  _setMintPaused(bool): Sendable<number>;
  _setLiquidationIncentive(encodedNumber): Sendable<number>;
  _supportMarket(string): Sendable<number>;
  _supportMarket(string, encodedNumber): Sendable<number>;
  _setPriceOracle(string): Sendable<number>;
  _setCollateralFactor(string, encodedNumber): Sendable<number>;
  _setCloseFactor(encodedNumber): Sendable<number>;
  enterMarkets(markets: string[]): Sendable<number>;
  exitMarket(market: string): Sendable<number>;
  updateGTokenVersion(gToken: string, version: encodedNumber): Sendable<void>;
  fastForward(encodedNumber): Sendable<number>;
  _setPendingImplementation(string): Sendable<number>;
  gTrollerImplementation(): Callable<string>;
  unlist(string): Sendable<void>;
  admin(): Callable<string>;
  pendingAdmin(): Callable<string>;
  _setPendingAdmin(string): Sendable<number>;
  _acceptAdmin(): Sendable<number>;
  _setPauseGuardian(string): Sendable<number>;
  pauseGuardian(): Callable<string>;
  _setMintPaused(market: string, string): Sendable<number>;
  _setBorrowPaused(market: string, string): Sendable<number>;
  _setTransferPaused(string): Sendable<number>;
  _setSeizePaused(string): Sendable<number>;
  _mintGuardianPaused(): Callable<boolean>;
  _borrowGuardianPaused(): Callable<boolean>;
  transferGuardianPaused(): Callable<boolean>;
  seizeGuardianPaused(): Callable<boolean>;
  mintGuardianPaused(market: string): Callable<boolean>;
  borrowGuardianPaused(market: string): Callable<boolean>;
  _setMarketSupplyCaps(
    gTokens: string[],
    supplyCaps: encodedNumber[]
  ): Sendable<void>;
  _setSupplyCapGuardian(string): Sendable<void>;
  supplyCapGuardian(): Callable<string>;
  supplyCaps(string): Callable<string>;
  _setMarketBorrowCaps(
    gTokens: string[],
    borrowCaps: encodedNumber[]
  ): Sendable<void>;
  _setBorrowCapGuardian(string): Sendable<void>;
  borrowCapGuardian(): Callable<string>;
  borrowCaps(string): Callable<string>;
  _setCreditLimit(protocol: string, creditLimit: encodedNumber): Sendable<void>;
}

export interface Gtroller extends Contract {
  methods: GtrollerMethods;
}
