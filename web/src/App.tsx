import { useCallback, useEffect, useState } from 'react';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { usePublicLedger } from './usePublicLedger';
import {
  NETWORK_ID,
  PRIVATE_STATE_ID,
  deployKompers,
  findLace,
  joinKompers,
} from './midnight';

const DEFAULT_CONTRACT = import.meta.env.VITE_DEFAULT_CONTRACT ?? '';

type WalletState = 'detecting' | 'no-wallet' | 'ready' | 'connecting' | 'connected';

function trunc(addr: string): string {
  return addr.length <= 24 ? addr : `${addr.slice(0, 12)}…${addr.slice(-8)}`;
}

function friendlyError(e: unknown): string {
  const msg = extractErrorMessage(e);
  if (msg.includes('User rejected') || msg.includes('user rejected')) return 'Cancelled in Lace.';
  if (msg.includes('Failed to fetch') || msg.includes('Proof Server') || msg.includes('proof server')) {
    return 'Could not reach the proof server. Start it with npm run proof-server:start and retry.';
  }
  if (msg.includes('Could not find Midnight Lace')) {
    return 'Lace Midnight is not installed, or this page is not allowed to see the extension.';
  }
  if (msg.includes('not enough') || msg.includes('Insufficient') || msg.includes('Dust')) {
    return 'Lace needs tDUST on Preprod. Open Lace → Tokens → Generate tDUST, then retry.';
  }
  return msg || 'Unexpected error. Check the browser console.';
}

function extractErrorMessage(e: unknown): string {
  if (!e) return '';
  if (e instanceof Error && e.message) return e.message;
  const anyErr = e as { message?: string; cause?: { message?: string; failure?: { message?: string } } };
  if (anyErr?.cause?.failure?.message) return anyErr.cause.failure.message;
  if (anyErr?.cause?.message) return anyErr.cause.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function randomSalt(): Uint8Array {
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  return salt;
}

export default function App() {
  const [walletState, setWalletState] = useState<WalletState>('detecting');
  const [walletAPI, setWalletAPI] = useState<InitialAPI | undefined>();
  const [wallet, setWallet] = useState<ConnectedAPI | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT);
  const [joinInput, setJoinInput] = useState(DEFAULT_CONTRACT);
  const [figure, setFigure] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: ledger, loading, error: ledgerError, refresh } = usePublicLedger(
    contractAddress || null,
  );

  useEffect(() => {
    const found = findLace();
    if (found) {
      setWalletAPI(found);
      setWalletState('ready');
      return;
    }
    let elapsed = 0;
    const t = setInterval(() => {
      elapsed += 100;
      const w = findLace();
      if (w) {
        setWalletAPI(w);
        setWalletState('ready');
        clearInterval(t);
      } else if (elapsed >= 5_000) {
        setWalletState('no-wallet');
        clearInterval(t);
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  const connect = useCallback(async () => {
    if (!walletAPI) return;
    setWalletState('connecting');
    setError(null);
    try {
      const connected = await walletAPI.connect(NETWORK_ID);
      const { unshieldedAddress } = await connected.getUnshieldedAddress();
      setWallet(connected);
      setAddress(unshieldedAddress);
      setWalletState('connected');
    } catch (e) {
      setError(friendlyError(e));
      setWalletState('ready');
    }
  }, [walletAPI]);

  const disconnect = useCallback(async () => {
    try {
      const maybe = wallet as ConnectedAPI & { disconnect?: () => Promise<void> | void };
      await maybe?.disconnect?.();
    } catch {
      // Clearing local session is enough for the Level 2 disconnect requirement.
    }
    setWallet(null);
    setAddress(null);
    setWalletState(walletAPI ? 'ready' : 'no-wallet');
    setStatus(null);
  }, [wallet, walletAPI]);

  const onJoin = useCallback(() => {
    const addr = joinInput.trim();
    if (!/^[0-9a-fA-F]{64}$/.test(addr)) {
      setError('Contract address must be 64 hex characters.');
      return;
    }
    setError(null);
    setContractAddress(addr);
  }, [joinInput]);

  const onDeploy = useCallback(async () => {
    if (!wallet) return;
    setBusy(true);
    setError(null);
    setStatus('Deploying Kompers on Preprod. Approve in Lace…');
    try {
      const { deployed } = await deployKompers(wallet);
      const addr = deployed.deployTxData.public.contractAddress;
      setContractAddress(addr);
      setJoinInput(addr);
      setStatus(`Deployed. Address: ${addr}`);
    } catch (e) {
      setError(friendlyError(e));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [wallet]);

  const onProve = useCallback(async () => {
    if (!wallet || !contractAddress) return;
    const trimmed = figure.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError('Enter a whole number. It stays in this browser as a private witness.');
      return;
    }
    const value = BigInt(trimmed);
    setBusy(true);
    setError(null);
    setStatus('Joining contract, then proving in-circuit. The figure is not sent to the ledger…');
    try {
      const { deployed, providers } = await joinKompers(wallet, contractAddress);
      await providers.privateStateProvider.set(PRIVATE_STATE_ID, {
        figure: value,
        salt: randomSalt(),
      });
      setStatus('Calling proveMeetsThreshold. Approve the circuit in Lace…');
      const tx = await deployed.callTx.proveMeetsThreshold();
      setFigure('');
      setStatus(`Circuit succeeded. tx ${tx.public.txId}. Public ledger will show yes/no + commitment only.`);
      setTimeout(() => void refresh(), 4000);
    } catch (e) {
      setError(friendlyError(e));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [wallet, contractAddress, figure, refresh]);

  const connected = walletState === 'connected';

  return (
    <>
      <header>
        <div>
          <div className="mark">Kompers · Midnight Preprod</div>
          <h1>Prove the bar. Keep the number.</h1>
          <p className="lede">
            A public threshold sits on-chain. Your private figure never does. Lace signs a
            circuit that discloses only qualified yes/no and a hiding commitment.
          </p>
        </div>
        <div className="wallet">
          {walletState === 'no-wallet' ? (
            <a
              href="https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk"
              target="_blank"
              rel="noreferrer"
            >
              Install Lace Midnight
            </a>
          ) : connected && address ? (
            <>
              <code title={address}>{trunc(address)}</code>
              <button className="ghost" type="button" onClick={() => void disconnect()}>
                Disconnect
              </button>
            </>
          ) : (
            <button type="button" onClick={() => void connect()} disabled={walletState !== 'ready'}>
              {walletState === 'connecting' ? 'Connecting…' : 'Connect Lace'}
            </button>
          )}
        </div>
      </header>

      <section className="panel">
        <h2>Privacy claim</h2>
        <p className="claim">
          Observers can read the posted threshold, whether the last prover qualified, a
          commitment, and a proof count. They cannot read the secret figure. That value is a
          Compact witness: compared in-circuit, never written with <code>disclose()</code>.
        </p>
      </section>

      <section className="panel">
        <h2>Contract on Preprod</h2>
        <p className="hint">
          Join a deployed address, or connect Lace (with tDUST) and deploy a fresh one.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onJoin();
          }}
        >
          <label>
            <span className="label">Contract address</span>
            <input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.trim())}
              placeholder="64 hex characters"
              spellCheck={false}
            />
          </label>
          <div className="row">
            <button type="submit">Use this contract</button>
            <button
              className="ghost"
              type="button"
              onClick={() => void onDeploy()}
              disabled={!connected || busy}
            >
              {busy ? 'Working…' : 'Deploy new on Preprod'}
            </button>
          </div>
        </form>
        {contractAddress ? (
          <p className="hint">
            Active: <span className="value">{contractAddress}</span>
          </p>
        ) : null}
      </section>

      <section className="panel">
        <h2>Public ledger — what the world can see</h2>
        {!contractAddress ? (
          <p className="hint">No contract selected yet.</p>
        ) : loading && !ledger ? (
          <p className="hint">Reading indexer…</p>
        ) : ledgerError && !ledger ? (
          <p className="error">{ledgerError}</p>
        ) : ledger ? (
          <div className="grid">
            <div>
              <span className="label">Threshold</span>
              <div className="value">{ledger.threshold.toString()}</div>
            </div>
            <div>
              <span className="label">Last qualified</span>
              <div className={`value ${ledger.lastQualified ? 'yes' : 'no'}`}>
                {ledger.lastQualified ? 'yes' : 'no'}
              </div>
            </div>
            <div>
              <span className="label">Proof count</span>
              <div className="value">{ledger.proofCount.toString()}</div>
            </div>
            <div>
              <span className="label">Last commitment</span>
              <div className="value">{ledger.lastCommitmentHex}</div>
            </div>
          </div>
        ) : null}
        <p className="hint">The secret figure is not a ledger field. That absence is the product.</p>
      </section>

      <section className="panel">
        <h2>Private witness — prove without showing</h2>
        <p className="hint">
          Type the figure as a password. It is held in local private state, used once as a
          witness for <code>proveMeetsThreshold</code>, then cleared from this form.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onProve();
          }}
        >
          <label>
            <span className="label">Secret figure</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={figure}
              onChange={(e) => setFigure(e.target.value)}
              placeholder="never shown on-chain"
            />
          </label>
          <div className="row">
            <button type="submit" disabled={!connected || !contractAddress || busy}>
              {busy ? 'Proving…' : 'Call proveMeetsThreshold'}
            </button>
          </div>
        </form>
      </section>

      {status ? <p className="status">{status}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </>
  );
}
