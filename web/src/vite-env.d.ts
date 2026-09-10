/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK_ID: string;
  readonly VITE_INDEXER_URL: string;
  readonly VITE_INDEXER_WS_URL: string;
  readonly VITE_DEFAULT_CONTRACT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@contract' {
  export class Contract {
    constructor(witnesses: unknown);
    circuits: Record<string, unknown>;
  }
  export function ledger(stateOrChargedState: unknown): {
    threshold: bigint;
    lastQualified: boolean;
    proofCount: bigint;
    lastCommitment: Uint8Array;
  };
}
