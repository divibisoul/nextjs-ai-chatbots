import assert from 'node:assert/strict';
import test from 'node:test';
import { executeOctaCoreN04 } from './OctaCoreN04Adapter';

test('N04 Octacore adapter rejects an undeclared capability without fabricating execution', async () => {
  await assert.rejects(
    executeOctaCoreN04({ capability: 'research.execute', payload: {}, correlation_id: 'corr-test-1' }),
    /OCTACORE_N04_CAPABILITY_NOT_DECLARED:research\.execute/,
  );
});

test('N04 Octacore adapter requires an authenticated runtime context before tool execution', async () => {
  await assert.rejects(
    executeOctaCoreN04({ capability: 'context-orchestration', payload: {}, correlation_id: 'corr-test-2' }),
    /OCTACORE_N04_AUTH_CONTEXT_REQUIRED/,
  );
});
