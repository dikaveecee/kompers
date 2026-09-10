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

const THEME_KEY = 'kompers-theme';
const DEFAULT_CONTRACT = import.meta.env.VITE_DEFAULT_CONTRACT ?? '';

type Theme = 'light' | 'dark';

function readTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') {
    return 'dark';
  }
  return 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private browsing can block storage; the session theme still applies.
  }
}

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

function formatFigure(n: bigint): string {
  return n.toLocaleString('en-US');
}

function CrescentMark() {
  return (
    <svg className="crescent" viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.2 4.2a12 12 0 1 0 9.1 19.3 14.5 14.5 0 1 1-9.1-19.3z"
      />
    </svg>
  );
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
  const [theme, setTheme] = useState<Theme>(readTheme);

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
    <div className="app">
      <nav className="nav">
        <div className="brand">
          <CrescentMark />
          <div className="wordmark">
            Kompers
            <small>Private eligibility</small>
          </div>
        </div>
        <div className="nav-actions">
          <button
            className="icon-btn"
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Light' : 'Dark'}
            onClick={() => {
              const next: Theme = theme === 'dark' ? 'light' : 'dark';
              applyTheme(next);
              setTheme(next);
            }}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 4.5a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1Zm0 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5-2.5a1 1 0 1 1 0-2h1.5a1 1 0 1 1 0 2H19.5ZM4 12a1 1 0 0 1-1-1 1 1 0 0 1 1-1h1.5a1 1 0 1 1 0 2H4Zm12.95 5.45a1 1 0 0 1 1.4 1.4l-1.05 1.05a1 1 0 1 1-1.4-1.4l1.05-1.05Zm-11.3-11.3 1.05-1.05a1 1 0 0 1 1.4 1.4L6.05 7.55a1 1 0 0 1-1.4-1.4Zm11.3 0a1 1 0 0 1 1.4-1.4l1.05 1.05a1 1 0 1 1-1.4 1.4l-1.05-1.05Zm-11.3 11.3 1.05 1.05a1 1 0 1 1-1.4 1.4L4.65 17.45a1 1 0 0 1 1.4-1.4ZM12 17a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1Z"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M16.5 13.1A7 7 0 0 1 10.9 7.5 6.2 6.2 0 0 1 11 6a8 8 0 1 0 7 11.1 6.2 6.2 0 0 1-1.5-3.99Z"
                />
              </svg>
            )}
          </button>
          <span className="chip">Midnight Preprod</span>
          {walletState === 'no-wallet' ? (
            <a
              href="https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk"
              target="_blank"
              rel="noreferrer"
            >
              Install Lace
            </a>
          ) : connected && address ? (
            <div className="session">
              <code title={address}>{trunc(address)}</code>
              <button className="ghost" type="button" onClick={() => void disconnect()}>
                Disconnect
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => void connect()} disabled={walletState !== 'ready'}>
              {walletState === 'connecting' ? 'Connecting…' : 'Connect Lace'}
            </button>
          )}
        </div>
      </nav>

      <main>
        <section className="hero">
          <p className="kicker">Compact comparison</p>
          <h1>Meet the bar. Keep the figure.</h1>
          <p className="lede">
            A hiring desk, lender, or DAO only needs yes or no. Your number stays on this
            device. The chain records a stamp and a hiding commitment.
          </p>
        </section>

        <ul className="trust">
          <li>
            <strong>Private by default</strong>
            <span>The figure is a Compact witness. It is never a ledger field.</span>
          </li>
          <li>
            <strong>Public bar only</strong>
            <span>Observers see the threshold, qualified yes/no, and a commitment.</span>
          </li>
          <li>
            <strong>You stay in control</strong>
            <span>Connect Lace, prove, disconnect. Session state is local.</span>
          </li>
        </ul>

        <section className="workspace">
          <article className="card">
            <header>
              <h2>Your figure</h2>
              <span className="side">Never disclosed</span>
            </header>
            <p className="note">
              Typed as a password, used once to prove you clear the public bar, then cleared
              from this form.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onProve();
              }}
            >
              <div className="well">
                <label>
                  <span className="label">Secret figure</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={figure}
                    onChange={(e) => setFigure(e.target.value)}
                    placeholder="stays on this device"
                  />
                </label>
              </div>
              <div className="row">
                <button className="grow" type="submit" disabled={!connected || !contractAddress || busy}>
                  {busy ? 'Proving…' : 'Prove I meet the bar'}
                </button>
              </div>
            </form>
            <p className="fine">
              Circuit <code>proveMeetsThreshold</code> compares in-circuit. Only the outcome is
              disclosed.
            </p>
          </article>

          <article className="card">
            <header>
              <h2>Public record</h2>
              <span className="side">What the chain shows</span>
            </header>
            {!contractAddress ? (
              <p className="empty">Join or deploy a contract to read the public slip.</p>
            ) : loading && !ledger ? (
              <p className="empty">Reading the Preprod indexer…</p>
            ) : ledgerError && !ledger ? (
              <p className="empty">{ledgerError}</p>
            ) : ledger ? (
              <div className="ledger">
                <div className="row-line">
                  <span className="label">Bar</span>
                  <div className="value">{formatFigure(ledger.threshold)}</div>
                </div>
                <div className="row-line">
                  <span className="label">Last result</span>
                  <span className={`stamp ${ledger.lastQualified ? 'yes' : 'no'}`}>
                    {ledger.lastQualified ? 'Qualified' : 'Not qualified'}
                  </span>
                </div>
                <div className="row-line">
                  <span className="label">Proofs</span>
                  <div className="value">{ledger.proofCount.toString()}</div>
                </div>
                <div className="row-line">
                  <span className="label">Commitment</span>
                  <div className="value" title={ledger.lastCommitmentHex}>
                    {trunc(ledger.lastCommitmentHex)}
                  </div>
                </div>
              </div>
            ) : null}
            <p className="fine">There is no figure on this slip. That omission is the product.</p>
          </article>
        </section>

        <section className="card contract">
          <header>
            <h2>Contract</h2>
            <span className="side">Preprod</span>
          </header>
          <p className="note">
            Paste a deployed address, or connect Lace with tDUST and open a new desk.
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
            <div className="row" style={{ marginTop: 12 }}>
              <button type="submit">Use this contract</button>
              <button
                className="ghost"
                type="button"
                onClick={() => void onDeploy()}
                disabled={!connected || busy}
              >
                {busy ? 'Working…' : 'Deploy new'}
              </button>
            </div>
          </form>
          {contractAddress ? (
            <p className="fine">
              Active <span className="value">{contractAddress}</span>
            </p>
          ) : (
            <p className="fine">Lace → Tokens → Generate tDUST if deploy fails on fees.</p>
          )}
        </section>

        {status ? (
          <p className="flash ok" role="status">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className="flash bad" role="alert">
            {error}
          </p>
        ) : null}
      </main>

      <footer>
        <span>
          <em>kompers</em> — compact comparisons on Midnight
        </span>
        <span>Witness compared in-circuit. Outcome disclosed. Number never is.</span>
      </footer>
    </div>
  );
}
