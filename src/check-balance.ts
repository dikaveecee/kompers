import { WebSocket } from 'ws';
import { resolveNetwork, getOrCreateWallet, formatWalletBackupNotice } from './network';
import { createWallet, persistWalletState, unshieldedToken } from './wallet';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const { network, config: networkConfig } = resolveNetwork();
const WALLET = getOrCreateWallet(network);
{
  const notice = formatWalletBackupNotice(WALLET, network);
  if (notice) console.log(notice);
}

async function main() {
  console.log('\n─── Wallet Balance ─────────────────────────────────────────────\n');
  const walletCtx = await createWallet({ network, networkConfig, seed: WALLET.seed });
  const state = await walletCtx.wallet.waitForSyncedState();
  const address = walletCtx.unshieldedKeystore.getBech32Address();
  const tNight = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(` Address: ${address}`);
  console.log(` Network: ${network}`);
  console.log(` tNight:  ${tNight.toLocaleString()}`);
  console.log(` DUST:    ${state.dust.balance(new Date()).toLocaleString()}\n`);
  if (tNight === 0n && networkConfig.faucet) {
    console.log(` Fund this wallet: ${networkConfig.faucet}\n`);
  }
  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
