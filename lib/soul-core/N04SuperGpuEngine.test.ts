import assert from 'node:assert/strict';
import test from 'node:test';
import { N04SuperGpuEngine } from './N04SuperGpuEngine';

test('Super GPU timeout does not falsely free an active execution slot', async () => {
  const gpu = new N04SuperGpuEngine({ capacity: 1, timeoutMs: 1000 });
  const slow = gpu.submit(() => new Promise<string>((resolve) => setTimeout(() => resolve('done'), 1100)));
  await assert.rejects(slow, /N04_SUPER_GPU_TIMEOUT/);
  assert.equal(gpu.metrics.timedOut, 1);
  assert.equal(gpu.metrics.active, 1);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(gpu.metrics.active, 0);
});
