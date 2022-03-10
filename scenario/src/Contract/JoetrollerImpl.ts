import { Contract } from "../Contract";
import { Sendable } from "../Invokation";
import { encodedNumber } from "../Encoding";

interface GtrollerImplMethods {
  _become(gTroller: string): Sendable<string>;
}

export interface GtrollerImpl extends Contract {
  methods: GtrollerImplMethods;
}
