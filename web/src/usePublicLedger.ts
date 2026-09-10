import { useCallback, useEffect, useState } from 'react';
import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { ledger } from '@contract';

const INDEXER_URL =
  import.meta.env.VITE_INDEXER_URL ?? 'https://indexer.preprod.midnight.network/api/v4/graphql';

const QUERY = `
  query ContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      state
    }
  }
`;

export type PublicLedger = {
  threshold: bigint;
  lastQualified: boolean;
  proofCount: bigint;
  lastCommitmentHex: string;
};

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function usePublicLedger(contractAddress: string | null, refreshMs = 12_000) {
  const [data, setData] = useState<PublicLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contractAddress || !/^[0-9a-fA-F]{64}$/.test(contractAddress)) return;
    setLoading(true);
    try {
      const res = await fetch(INDEXER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: QUERY,
          variables: { address: contractAddress },
        }),
      });
      const gql = await res.json();
      if (gql.errors) throw new Error(gql.errors[0]?.message ?? 'Indexer query failed');
      const stateHex = gql.data?.contractAction?.state;
      if (!stateHex) throw new Error('Contract not found on the Preprod indexer yet');
      const contractState = ContractState.deserialize(hexToBytes(stateHex));
      const publicState = ledger(contractState.data);
      setData({
        threshold: publicState.threshold,
        lastQualified: publicState.lastQualified,
        proofCount: publicState.proofCount,
        lastCommitmentHex: toHex(publicState.lastCommitment),
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [contractAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!contractAddress) return;
    const id = setInterval(() => void refresh(), refreshMs);
    return () => clearInterval(id);
  }, [contractAddress, refresh, refreshMs]);

  return { data, loading, error, refresh };
}
