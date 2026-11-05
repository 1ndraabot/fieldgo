import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toggleJam } from '../lib/selection.ts';

const T = [18, 20, 21, 22, 23]; // jam yang tersedia (19 terisi)

test('memilih dari kosong, memperluas ke kedua sisi', () => {
  assert.deepEqual(toggleJam([], 20, T), [20]);
  assert.deepEqual(toggleJam([20], 21, T), [20, 21]);
  assert.deepEqual(toggleJam([21, 22], 20, T), [20, 21, 22]);
});

test('jam tidak berurutan memulai pilihan baru (BR-03)', () => {
  assert.deepEqual(toggleJam([20], 22, T), [22]);
  assert.deepEqual(toggleJam([20, 21], 23, T), [23]);
});

test('jam yang tidak tersedia diabaikan, termasuk saat bersebelahan', () => {
  assert.deepEqual(toggleJam([18], 19, T), [18]);
  assert.deepEqual(toggleJam([20], 19, T), [20]);
});

test('klik ujung pilihan melepasnya; klik tengah memulai ulang dari jam itu', () => {
  assert.deepEqual(toggleJam([20], 20, T), []);
  assert.deepEqual(toggleJam([20, 21, 22], 22, T), [20, 21]);
  assert.deepEqual(toggleJam([20, 21, 22], 20, T), [21, 22]);
  assert.deepEqual(toggleJam([20, 21, 22], 21, T), [21]);
});
