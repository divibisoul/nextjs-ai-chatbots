import assert from 'node:assert/strict';
import test from 'node:test';
import { executeOctaCoreN04 } from './OctaCoreN04Adapter';

test('N04 Octacore adapter rejects an undeclared capability before loading the server runtime', async () => {
  await assert.rejects(
    executeOctaCoreN04({
      capability: 'research.execute',
      payload: {},
      correlation_id: 'corr-test-1',
    }),
    /OCTACORE_N04_CAPABILITY_NOT_DECLARED:research\.execute/,
  );
});

test('N04 Octacore adapter requires a concrete capability name', async () => {
  await assert.rejects(
    executeOctaCoreN04({
      capability: '',
      payload: {},
      correlation_id: 'corr-test-2',
    }),
    /OCTACORE_N04_CAPABILITY_NOT_DECLARED:/,
  );
});
