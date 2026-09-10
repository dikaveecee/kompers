import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  secretFigure(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  secretSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  setThreshold(context: __compactRuntime.CircuitContext<PS>,
               newThreshold_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveMeetsThreshold(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  setThreshold(context: __compactRuntime.CircuitContext<PS>,
               newThreshold_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveMeetsThreshold(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  setThreshold(context: __compactRuntime.CircuitContext<PS>,
               newThreshold_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveMeetsThreshold(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly threshold: bigint;
  readonly lastCommitment: Uint8Array;
  readonly lastQualified: boolean;
  readonly proofCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
