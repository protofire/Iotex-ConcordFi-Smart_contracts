import { Contract } from '../Contract';
import { Sendable } from '../Invokation';
import { GTokenMethods, GTokenScenarioMethods } from './GToken';

interface GXrc20DelegateMethods extends GTokenMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface GXrc20DelegateScenarioMethods extends GTokenScenarioMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

export interface GXrc20Delegate extends Contract {
  methods: GXrc20DelegateMethods;
  name: string;
}

export interface GXrc20DelegateScenario extends Contract {
  methods: GXrc20DelegateScenarioMethods;
  name: string;
}
