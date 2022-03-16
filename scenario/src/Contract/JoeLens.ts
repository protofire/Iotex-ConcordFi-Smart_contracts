import { Contract } from "../Contract";
import { Sendable } from "../Invokation";

export interface JoeLensMethods {
  gTokenBalances(
    gToken: string,
    account: string
  ): Sendable<[string, number, number, number, number, number]>;
  gTokenBalancesAll(
    gTokens: string[],
    account: string
  ): Sendable<[string, number, number, number, number, number][]>;
  gTokenMetadata(
    gToken: string
  ): Sendable<
    [
      string,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      boolean,
      number,
      string,
      number,
      number
    ]
  >;
  gTokenMetadataAll(
    gTokens: string[]
  ): Sendable<
    [
      string,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      boolean,
      number,
      string,
      number,
      number
    ][]
  >;
  getAccountLimits(
    comptroller: string,
    account: string
  ): Sendable<[string[], number, number]>;
}

export interface JoeLens extends Contract {
  methods: JoeLensMethods;
  name: string;
}
