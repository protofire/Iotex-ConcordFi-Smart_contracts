import { Contract } from "../Contract";
import { Callable, Sendable } from "../Invokation";
import { GTokenMethods } from "./GToken";
import { encodedNumber } from "../Encoding";

interface GXrc20DelegatorMethods extends GTokenMethods {
  implementation(): Callable<string>;
  _setImplementation(
    implementation_: string,
    allowResign: boolean,
    becomImplementationData: string
  ): Sendable<void>;
}

interface GXrc20DelegatorScenarioMethods extends GXrc20DelegatorMethods {
  setTotalBorrows(amount: encodedNumber): Sendable<void>;
  setTotalReserves(amount: encodedNumber): Sendable<void>;
}

export interface GXrc20Delegator extends Contract {
  methods: GXrc20DelegatorMethods;
  name: string;
}

export interface GXrc20DelegatorScenario extends Contract {
  methods: GXrc20DelegatorMethods;
  name: string;
}

export interface GCollateralCapXrc20DelegatorScenario extends Contract {
  methods: GXrc20DelegatorMethods;
  name: string;
}

export interface GWrappedNativeDelegatorScenario extends Contract {
  methods: GXrc20DelegatorMethods;
  name: string;
}
