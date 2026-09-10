import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { NETWORK_CONFIGS, isNetworkId } from '../src/network.ts';

test('preview is the public network we deploy to', () => {
  assert.equal(isNetworkId('preview'), true);
  assert.equal(NETWORK_CONFIGS.preview.networkId, 'preview');
  assert.ok(NETWORK_CONFIGS.preview.faucet?.includes('preview'));
  assert.deepEqual(NETWORK_CONFIGS.preview.composeServices, ['proof-server']);
});

test('README states the product problem and public vs private split', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /Initial product idea/i);
  assert.match(readme, /Public state vs private witness/i);
  assert.match(readme, /oversharing/i);
  assert.match(readme, /disclose\(\)/);
});
