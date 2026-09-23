import assert from 'node:assert/strict';
import test from 'node:test';
import { executeOctaCoreN04 } from './OctaCoreN04Adapter';

const authenticatedContext = { session: { user: { id: 'octacore-test-user' } } };

test('N04 Octacore adapter executes a declared local capability and preserves correlation', async () => {
  const result = await executeOctaCoreN04({
    capability: 'context-orchestration',
    payload: { source: 'G7', barrier: 'pre' },
    job_id: 'octa-test-1',
    correlation_id: 'corr-test-1',
  }, authenticatedContext);
  assert.equal(result.ok, true);
  assert.equal(result.nucleus, 'N04');
  assert.equal(result.capability, 'context-orchestration');
  assert.equal(result.correlationId, 'corr-test-1');
});

test('N04 Octacore adapter rejects undeclared capability without fabricating success', async () => {
  await assert.rejects(
    executeOctaCoreN04({ capability: 'research.execute', payload: {}, correlation_id: 'corr-test-2' }),
    /OCTACORE_N04_CAPABILITY_NOT_DECLARED:/,
  );
});

test('N04 Octacore adapter makes runtime gaps explicit', async () => {
  await assert.rejects(
    executeOctaCoreN04({ capability: 'batch.process', payload: {}, correlation_id: 'corr-test-3' }, authenticatedContext),
    /OCTACORE_N04_CAPABILITY_PENDING_RUNTIME:batch\.process/,
  );
});
