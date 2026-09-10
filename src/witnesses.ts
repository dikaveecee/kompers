import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export type KompersPrivateState = {
  figure: bigint;
  salt: Uint8Array;
};

export const emptyPrivateState = (): KompersPrivateState => ({
  figure: 0n,
  salt: new Uint8Array(32),
});

type Ledger = unknown;

export const witnesses = {
  secretFigure({
    privateState,
  }: WitnessContext<Ledger, KompersPrivateState>): [KompersPrivateState, bigint] {
    return [privateState, privateState.figure];
  },
  secretSalt({
    privateState,
  }: WitnessContext<Ledger, KompersPrivateState>): [KompersPrivateState, Uint8Array] {
    return [privateState, privateState.salt];
  },
};
