/**
 * CLI for Kompers: set a public bar, prove a private figure, read public ledger.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { WebSocket } from 'ws';
import { Buffer } from 'buffer';
import { randomBytes } from 'node:crypto';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
  resolveNetwork,
  getOrCreateWallet,
  formatWalletBackupNotice,
  getDeployment,
} from './network';
import { createWallet, persistWalletState, unshieldedToken } from './wallet';
import {
  PRIVATE_STATE_ID,
  emptyPrivateState,
  loadCompiledContract,
  createProviders,
} from './contract';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const { network, config: networkConfig } = resolveNetwork();
const WALLET = getOrCreateWallet(network);
{
  const notice = formatWalletBackupNotice(WALLET, network);
  if (notice) console.log(notice);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║ Kompers CLI — prove the bar, keep the number private         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const rl = createInterface({ input: stdin, output: stdout });
  const deployment = getDeployment(network);
  if (!deployment) {
    console.error(`No deploy on file for ${network}. Run: npm run deploy`);
    process.exit(1);
  }
  console.log(` Contract: ${deployment.address}`);
  console.log(` Network: ${network}\n`);

  const { Kompers, compiledContract } = await loadCompiledContract();
  const walletCtx = await createWallet({ network, networkConfig, seed: WALLET.seed });
  await walletCtx.wallet.waitForSyncedState();
  await persistWalletState(network, walletCtx);

  const providers = await createProviders(walletCtx, networkConfig);
  const deployed = await findDeployedContract(providers, {
    compiledContract: compiledContract as never,
    contractAddress: deployment.address,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: emptyPrivateState(),
  });

  console.log(' ✅ Connected!\n');

  let running = true;
  while (running) {
    console.log('─── Menu ───────────────────────────────────────────────────────');
    console.log(' 1. Set public threshold');
    console.log(' 2. Prove private figure meets the bar');
    console.log(' 3. Read public ledger (never shows the private figure)');
    console.log(' 4. Check wallet balance');
    console.log(' 5. Exit\n');

    const choice = await rl.question(' Your choice: ');
    switch (choice.trim()) {
      case '1': {
        const raw = await rl.question(' New public threshold: ');
        const value = BigInt(raw.trim());
        console.log('\n Submitting setThreshold...');
        const tx = await deployed.callTx.setThreshold(value);
        console.log(` ✅ Threshold set to ${value}`);
        console.log(` Transaction ID: ${tx.public.txId}\n`);
        break;
      }
      case '2': {
        const raw = await rl.question(' Private figure (stays off-chain): ');
        const figure = BigInt(raw.trim());
        const salt = randomBytes(32);
        await providers.privateStateProvider.set(PRIVATE_STATE_ID, { figure, salt });
        console.log('\n Submitting proveMeetsThreshold (ZK proof, figure is not disclosed)...');
        const tx = await deployed.callTx.proveMeetsThreshold();
        console.log(' ✅ Proof submitted');
        console.log(` Transaction ID: ${tx.public.txId}\n`);
        break;
      }
      case '3': {
        const contractState = await providers.publicDataProvider.queryContractState(deployment.address);
        if (!contractState) {
          console.log('\n 📋 No contract state yet\n');
          break;
        }
        const ledgerState = Kompers.ledger(contractState.data);
        console.log('\n Public ledger:');
        console.log(`  threshold:      ${ledgerState.threshold}`);
        console.log(`  lastQualified:  ${ledgerState.lastQualified}`);
        console.log(`  proofCount:     ${ledgerState.proofCount}`);
        console.log(`  lastCommitment: ${Buffer.from(ledgerState.lastCommitment).toString('hex')}`);
        console.log('  (the raw figure is not here — that is the point)\n');
        break;
      }
      case '4': {
        const currentState = await walletCtx.wallet.waitForSyncedState();
        const currentBalance = currentState.unshielded.balances[unshieldedToken().raw] ?? 0n;
        console.log(`\n tNight: ${currentBalance.toLocaleString()}`);
        console.log(` DUST:   ${currentState.dust.balance(new Date()).toLocaleString()}\n`);
        break;
      }
      case '5':
        running = false;
        break;
      default:
        console.log('\n Invalid choice.\n');
    }
  }

  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();
  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
