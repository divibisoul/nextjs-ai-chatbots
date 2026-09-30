import assert from 'node:assert/strict';
import test from 'node:test';
import { Nucleus04Processor } from './Nucleus04Processor';
import { registerN04CompositionHandlers } from './N04CompositionRuntime';

function createCompositionProcessor() {
  const processor = new Nucleus04Processor();
  processor.registerHandler('tool.execute', async input => ({
    executed: true,
    input,
  }));
  registerN04CompositionHandlers(processor);
  return processor;
}

test('N04 artifact.analyze returns deterministic artifact evidence', async () => {
  const processor = createCompositionProcessor();
  const result = await processor.execute({
    capability: 'artifact.analyze',
    input: {
      kind: 'text',
      filename: 'example.md',
      mimeType: 'text/markdown',
      content: '# hello\nworld',
    },
  });

  const evidence = result as Record<string, unknown>;
  assert.equal(evidence.analyzed, true);
  assert.equal(evidence.bytes, Buffer.byteLength('# hello\nworld'));
  assert.equal(evidence.lines, 2);
  assert.equal(evidence.words, 3);
  assert.match(String(evidence.sha256), /^[0-9a-f]{64}$/);
});

test('N04 parallel.map preserves input order and enforces bounded composition', async () => {
  const processor = createCompositionProcessor();
  const result = await processor.execute({
    capability: 'parallel.map',
    input: {
      capability: 'tool.execute',
      concurrency: 2,
      items: [{ n: 1 }, { n: 2 }, { n: 3 }],
    },
  });

  const report = result as { mode: string; results: Array<{ index: number; ok: boolean }> };
  assert.equal(report.mode, 'bounded-parallel');
  assert.equal(report.results.length, 3);
  assert.deepEqual(report.results.map(item => item.index), [0, 1, 2]);
  assert.equal(report.results.every(item => item.ok), true);
});

test('N04 batch.process executes heterogeneous native capabilities', async () => {
  const processor = createCompositionProcessor();
  const result = await processor.execute({
    capability: 'batch.process',
    input: {
      concurrency: 2,
      operations: [
        { capability: 'tool.execute', input: { action: 'one' } },
        { capability: 'artifact.analyze', input: { kind: 'text', content: 'two' } },
      ],
    },
  });

  const report = result as { mode: string; results: Array<{ ok: boolean }> };
  assert.equal(report.mode, 'bounded-batch');
  assert.equal(report.results.length, 2);
  assert.equal(report.results.every(item => item.ok), true);
});

test('N04 workflow.execute resolves dependencies and rejects cycles', async () => {
  const processor = createCompositionProcessor();
  const result = await processor.execute({
    capability: 'workflow.execute',
    input: {
      steps: [
        { id: 'first', capability: 'tool.execute', input: { value: 1 } },
        { id: 'second', capability: 'tool.execute', input: { value: 2 }, dependsOn: ['first'] },
      ],
    },
  });

  const report = result as {
    stopped: boolean;
    blocked: string[];
    failed: string[];
    completed: Record<string, unknown>;
  };
  assert.equal(report.stopped, false);
  assert.deepEqual(report.blocked, []);
  assert.deepEqual(report.failed, []);
  assert.ok(report.completed.first);
  assert.ok(report.completed.second);

  await assert.rejects(
    processor.execute({
      capability: 'workflow.execute',
      input: {
        steps: [
          { id: 'a', capability: 'tool.execute', input: {}, dependsOn: ['b'] },
          { id: 'b', capability: 'tool.execute', input: {}, dependsOn: ['a'] },
        ],
      },
    }),
    /N04_WORKFLOW_CYCLE_OR_BLOCKED/,
  );
});

test('N04 composition forbids unbounded recursive meta-composition', async () => {
  const processor = createCompositionProcessor();

  await assert.rejects(
    processor.execute({
      capability: 'parallel.map',
      input: {
        capability: 'batch.process',
        items: [{}],
      },
    }),
    /N04_COMPOSITION_RECURSION_NOT_ALLOWED/,
  );
});

test('N04 schedule.task performs real delayed execution and reports ephemeral durability', async () => {
  const processor = createCompositionProcessor();
  const before = Date.now();

  const result = await processor.execute({
    capability: 'schedule.task',
    input: {
      capability: 'tool.execute',
      input: { scheduled: true },
      delayMs: 5,
    },
  });

  const report = result as {
    status: string;
    durability: string;
    output: { executed: boolean };
  };
  assert.equal(report.status, 'completed');
  assert.equal(report.durability, 'none');
  assert.ok(Date.now() - before >= 5);
  assert.equal(report.output.executed, true);
});
