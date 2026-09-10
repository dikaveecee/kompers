import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as RT from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger } from '../contracts/managed/kompers/contract/index.js';
import { witnesses, type KompersPrivateState } from '../src/witnesses.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const managed = path.join(root, 'contracts', 'managed', 'kompers');
const COIN = '0'.repeat(64);
const ADDR = RT.sampleContractAddress();

const salt = (n: number) => {
  const a = new Uint8Array(32);
  a[31] = n;
  return a;
};

const setup = (figure: bigint, saltByte = 7) => {
  const privateState: KompersPrivateState = { figure, salt: salt(saltByte) };
  const contract = new Contract(witnesses);
  const ctor = contract.initialState(RT.createConstructorContext(privateState, COIN));
  const ctx = RT.createCircuitContext(ADDR, COIN, ctor.currentContractState, privateState);
  return { contract, ctx };
};

test('managed/ contains compiled circuits and proving keys', () => {
  assert.equal(existsSync(path.join(managed, 'zkir', 'proveMeetsThreshold.zkir')), true);
  assert.equal(existsSync(path.join(managed, 'zkir', 'setThreshold.zkir')), true);
  assert.equal(existsSync(path.join(managed, 'keys', 'proveMeetsThreshold.prover')), true);
  assert.equal(existsSync(path.join(managed, 'keys', 'proveMeetsThreshold.verifier')), true);
  assert.equal(existsSync(path.join(managed, 'keys', 'setThreshold.prover')), true);
  assert.equal(existsSync(path.join(managed, 'keys', 'setThreshold.verifier')), true);
  const info = JSON.parse(
    readFileSync(path.join(managed, 'compiler', 'contract-info.json'), 'utf8'),
  );
  assert.deepEqual(
    info.circuits.map((c: { name: string }) => c.name).sort(),
    ['proveMeetsThreshold', 'setThreshold'],
  );
  assert.ok(readdirSync(path.join(managed, 'keys')).length >= 4);
});

test('constructor posts a public threshold and empty private outcome', () => {
  const { ctx } = setup(0n);
  const publicState = ledger(ctx.currentQueryContext.state);
  assert.equal(publicState.threshold, 80000n);
  assert.equal(publicState.lastQualified, false);
  assert.equal(publicState.proofCount, 0n);
  assert.equal('figure' in publicState, false);
});

test('a figure at or above the bar discloses qualified=true, never the figure', () => {
  const { contract, ctx } = setup(90000n);
  const call = contract.impureCircuits.proveMeetsThreshold(ctx);
  const publicState = ledger(call.context.currentQueryContext.state);
  assert.equal(publicState.lastQualified, true);
  assert.equal(publicState.proofCount, 1n);
  assert.ok(publicState.lastCommitment.some((b: number) => b !== 0));
  assert.equal('figure' in publicState, false);
  assert.notEqual(publicState.lastCommitment.length, 0);
});

test('a figure below the bar discloses qualified=false', () => {
  const { contract, ctx } = setup(1000n);
  const call = contract.impureCircuits.proveMeetsThreshold(ctx);
  const publicState = ledger(call.context.currentQueryContext.state);
  assert.equal(publicState.lastQualified, false);
  assert.equal(publicState.proofCount, 1n);
});

test('setThreshold updates only the public bar', () => {
  const { contract, ctx } = setup(0n);
  const call = contract.impureCircuits.setThreshold(ctx, 120000n);
  const publicState = ledger(call.context.currentQueryContext.state);
  assert.equal(publicState.threshold, 120000n);
});
