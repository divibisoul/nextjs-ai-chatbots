import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeArtifact } from './ArtifactAnalyzer';
import { N04WorkerPool } from './N04WorkerPool';
import { Nucleus04Processor } from './Nucleus04Processor';
import { registerN04CompositionHandlers } from './N04CompositionRuntime';

test('N04 worker pool preserves order while enforcing its concurrency ceiling', async () => {
  const pool = new N04WorkerPool(2);
  let active = 0;
  let peak = 0;

  const result = await pool.map([1, 2, 3, 4], async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 2));
    active -= 1;
    return value * 2;
  });

  assert.deepEqual(result, [2, 4, 6, 8]);
  assert.equal(peak <= 2, true);
  assert.equal(pool.getConcurrency(), 2);
});

test('N04 artifact analyzer returns deterministic payload evidence', async () => {
  const evidence = await analyzeArtifact({
    kind: 'text',
    filename: 'example.md',
    mimeType: 'text/markdown',
    content: '# hello\nworld',
  });

  assert.equal(evidence.analyzed, true);
  assert.equal(evidence.bytes, Buffer.byteLength('# hello\nworld'));
  assert.equal(evidence.lines, 2);
  assert.equal(evidence.words, 3);
  assert.match(String(evidence.sha256), /^[0-9a-f]{64}$/);
});

test('N04 standalone artifact analyzer remains behaviorally aligned with resident execution', async () => {
  const standalone = await analyzeArtifact({
    kind: 'text',
    filename: 'parity.md',
    mimeType: 'text/markdown',
    content: 'same payload',
  });

  const processor = new Nucleus04Processor();
  processor.registerHandler('tool.execute', async input => input);
  registerN04CompositionHandlers(processor);

  const resident = await processor.execute({
    capability: 'artifact.analyze',
    input: {
      kind: 'text',
      filename: 'parity.md',
      mimeType: 'text/markdown',
      content: 'same payload',
    },
  });

  assert.deepEqual(resident, standalone);
});
