import { WebSocket } from 'ws';
import { resolveNetwork, getOrCreateWallet } from '../src/network.ts';
import { createWallet } from '../src/wallet.ts';

// @ts-expect-error wallet SDK needs WebSocket
globalThis.WebSocket = WebSocket;

const { network, config: networkConfig } = resolveNetwork();
const WALLET = getOrCreateWallet(network);
const walletCtx = await createWallet({
  network,
  networkConfig,
  seed: WALLET.seed,
  restore: false,
});
const address = walletCtx.unshieldedKeystore.getBech32Address().toString();
console.log(address);
if (networkConfig.faucet) {
  console.log(networkConfig.faucet);
}
await walletCtx.wallet.stop();
process.exit(0);
