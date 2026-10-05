import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextPipeline } from './ContextPipeline';

test('context pipeline normalizes collaboration context without inventing evidence', () => {
  const result = new ContextPipeline().run('entrada válida', {
    session_id: '  session-001  ',
    client: 'web',
    research_snippets: [' evidence A ', ''],
    user_feedback_refs: [' feedback-1 '],
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.context?.session_id, 'session-001');
  assert.equal(result.context?.client, 'web');
  assert.deepEqual(result.context?.research_snippets, ['evidence A']);
  assert.deepEqual(result.context?.user_feedback_refs, ['feedback-1']);
  assert.equal(result.context?.probabilistic, undefined);
});

test('invalid probabilistic envelope fails at the context gate', () => {
  const result = new ContextPipeline().run('entrada válida', {
    probabilistic: { nodes: 'invalid' as unknown as [] },
  });
  assert.equal(result.status, 'failed');
  assert.ok(result.errors.includes('PROBABILISTIC_NODES_REQUIRED'));
});