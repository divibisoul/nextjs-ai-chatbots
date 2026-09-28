import assert from 'node:assert/strict';
import test from 'node:test';
import { N04WorkerPool } from './N04WorkerPool';

test('N04 worker pool runs tasks concurrently up to configured bound', async () => {
  const pool = new N04WorkerPool(3);
  let active = 0;
  let peak = 0;

  const started = Date.now();
  const result = await pool.execute(
    [0, 1, 2, 3, 4, 5].map((value) => ({ id: String(value), input: value })),
    async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 40));
      active -= 1;
      return value * 2;
    },
  );

  const elapsed = Date.now() - started;
  assert.deepEqual(result, [0, 2, 4, 6, 8, 10]);
  assert.equal(peak, 3);
  assert.ok(elapsed >= 70 && elapsed < 180, `unexpected execution time: ${elapsed}ms`);
  assert.equal(pool.stats().completed, 6);
  assert.equal(pool.stats().failed, 0);
});

test('N04 worker pool preserves input order despite priority scheduling', async () => {
  const pool = new N04WorkerPool(2);
  const result = await pool.execute(
    [
      { id: 'a', input: 'A', priority: 1 },
      { id: 'b', input: 'B', priority: 100 },
      { id: 'c', input: 'C', priority: 50 },
    ],
    async (value) => {
      await new Promise((resolve) => setTimeout(resolve, value === 'B' ? 10 : 5));
      return value;
    },
  );

  assert.deepEqual(result, ['A', 'B', 'C']);
});
