import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId, type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import {
  Binding,
  Proof,
  SignatureEnabled,
  Transaction,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Contract } from '@contract';
import { inMemoryPrivateStateProvider } from './in-memory-private-state-provider';
import {
  emptyPrivateState,
  PRIVATE_STATE_ID,
  witnesses,
  type KompersPrivateState,
} from './witnesses';

export const NETWORK_ID = (import.meta.env.VITE_NETWORK_ID ?? 'preprod') as NetworkId;

type Providers = Awaited<ReturnType<typeof buildProviders>>;

function compiled() {
  return CompiledContract.make('kompers', Contract).pipe(
    CompiledContract.withWitnesses(witnesses as never),
    CompiledContract.withCompiledFileAssets(window.location.origin),
  );
}

export async function buildProviders(connected: ConnectedAPI) {
  setNetworkId(NETWORK_ID);
  const config = await connected.getConfiguration();
  const proofServerUri = config.proverServerUri || 'http://127.0.0.1:6300';
  const shielded = await connected.getShieldedAddresses();
  const zkConfigProvider = new FetchZkConfigProvider(window.location.origin, fetch.bind(window));
  const privateStateProvider = inMemoryPrivateStateProvider<string, KompersPrivateState>();

  return {
    privateStateProvider,
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
      balanceTx: async (tx: { serialize: () => Uint8Array }) => {
        const received = await connected.balanceUnsealedTransaction(toHex(tx.serialize()));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(received.tx),
        );
      },
    },
    midnightProvider: {
      submitTx: async (tx: { serialize: () => Uint8Array; identifiers: () => string[] }) => {
        await connected.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  };
}

export async function joinKompers(connected: ConnectedAPI, contractAddress: string) {
  const providers = await buildProviders(connected);
  const deployed = await findDeployedContract(providers, {
    compiledContract: compiled() as never,
    contractAddress,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: emptyPrivateState(),
  });
  return { deployed, providers };
}

export async function deployKompers(connected: ConnectedAPI) {
  const providers = await buildProviders(connected);
  const deployed = await deployContract(providers, {
    compiledContract: compiled() as never,
    args: [],
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: emptyPrivateState(),
  });
  return { deployed, providers };
}

export function findLace(): InitialAPI | undefined {
  const midnight = window.midnight;
  if (!midnight) return undefined;
  if (midnight.mnLace) return midnight.mnLace as InitialAPI;
  return Object.values(midnight).find(
    (w): w is InitialAPI => !!w && typeof w === 'object' && 'connect' in w,
  );
}

export type { Providers };
export { PRIVATE_STATE_ID };
