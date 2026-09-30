import { createHash } from 'node:crypto';
import type { Nucleus04Capability, Nucleus04Processor } from './Nucleus04Processor';

type N04RuntimeHandler = (input: unknown) => Promise<unknown>;
type ExecuteCapability = (
  capability: Nucleus04Capability,
  input: unknown,
) => Promise<unknown>;

type ParallelMapInput = {
  capability: Nucleus04Capability;
  items: unknown[];
  concurrency?: number;
};

type BatchOperation = {
  capability: Nucleus04Capability;
  input: unknown;
};

type BatchInput = {
  operations: BatchOperation[];
  concurrency?: number;
};

type WorkflowStep = {
  id: string;
  capability: Nucleus04Capability;
  input: unknown;
  dependsOn?: string[];
};

type WorkflowInput = {
  steps: WorkflowStep[];
  concurrency?: number;
  stopOnError?: boolean;
};

type ScheduleInput = {
  capability: Nucleus04Capability;
  input: unknown;
  delayMs: number;
};

const COMPOSITION_CAPABILITIES = new Set<Nucleus04Capability>([
  'batch.process',
  'parallel.map',
  'workflow.execute',
  'schedule.task',
]);

const DEFAULT_CONCURRENCY = 4;
const MAX_CONCURRENCY = 16;

function assertSafeNestedCapability(capability: Nucleus04Capability): void {
  if (COMPOSITION_CAPABILITIES.has(capability)) {
    throw new Error(`N04_COMPOSITION_RECURSION_NOT_ALLOWED:${capability}`);
  }
}

function normalizeConcurrency(value: unknown): number {
  if (value === undefined) return DEFAULT_CONCURRENCY;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new TypeError('N04_CONCURRENCY_MUST_BE_POSITIVE_INTEGER');
  }
  return Math.min(value, MAX_CONCURRENCY);
}

async function boundedMap<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= items.length) return;
        results[index] = await worker(items[index], index);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

async function analyzeArtifact(input: unknown): Promise<Record<string, unknown>> {
  if (!input || typeof input !== 'object') {
    throw new TypeError('N04_ARTIFACT_ANALYZE_INPUT_REQUIRED');
  }

  const artifact = input as Record<string, unknown>;
  const kind = typeof artifact.kind === 'string' ? artifact.kind.trim() : '';
  const filename = typeof artifact.filename === 'string' ? artifact.filename.trim() : '';
  const mimeType = typeof artifact.mimeType === 'string' ? artifact.mimeType.trim().toLowerCase() : '';
  const content = typeof artifact.content === 'string' ? artifact.content : '';
  const base64 = typeof artifact.base64 === 'string' ? artifact.base64.trim() : '';

  if (!kind && !filename && !mimeType && !content && !base64) {
    throw new Error('N04_ARTIFACT_EMPTY');
  }

  let bytes = 0;
  let encoding = 'none';
  let sha256 = '';

  if (content) {
    const raw = Buffer.from(content, 'utf8');
    bytes = raw.byteLength;
    encoding = 'utf8';
    sha256 = createHash('sha256').update(raw).digest('hex');
  } else if (base64) {
    const normalized = base64.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
      throw new Error('N04_ARTIFACT_INVALID_BASE64');
    }
    const raw = Buffer.from(normalized, 'base64');
    bytes = raw.byteLength;
    encoding = 'base64';
    sha256 = createHash('sha256').update(raw).digest('hex');
  }

  const extension = filename.includes('.') ? filename.slice(filename.lastIndexOf('.') + 1).toLowerCase() : '';
  const textLines = content ? content.split(/\r?\n/).length : 0;
  const words = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  return {
    analyzed: true,
    kind: kind || null,
    filename: filename || null,
    extension: extension || null,
    mimeType: mimeType || null,
    encoding,
    bytes,
    characters: content.length,
    lines: textLines,
    words,
    sha256: sha256 || null,
    hasBinaryPayload: Boolean(base64 && !content),
  };
}

function buildCompositionHandlers(processor: Nucleus04Processor) {
  const execute: ExecuteCapability = (capability, input) => processor.execute({ capability, input });

  const parallelMap = async (input: ParallelMapInput) => {
    if (!input || !Array.isArray(input.items)) {
      throw new TypeError('N04_PARALLEL_MAP_ITEMS_REQUIRED');
    }
    assertSafeNestedCapability(input.capability);
    const concurrency = normalizeConcurrency(input.concurrency);
    const results = await boundedMap(input.items, concurrency, async (item, index) => {
      try {
        return {
          index,
          ok: true,
          output: await execute(input.capability, item),
        };
      } catch (error) {
        return {
          index,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
    return { mode: 'bounded-parallel', capability: input.capability, concurrency, results };
  };

  const batchProcess = async (input: BatchInput) => {
    if (!input || !Array.isArray(input.operations) || input.operations.length === 0) {
      throw new TypeError('N04_BATCH_OPERATIONS_REQUIRED');
    }
    const concurrency = normalizeConcurrency(input.concurrency);
    const results = await boundedMap(input.operations, concurrency, async (operation, index) => {
      assertSafeNestedCapability(operation.capability);
      try {
        return {
          index,
          capability: operation.capability,
          ok: true,
          output: await execute(operation.capability, operation.input),
        };
      } catch (error) {
        return {
          index,
          capability: operation.capability,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
    return { mode: 'bounded-batch', concurrency, results };
  };

  const workflowExecute = async (input: WorkflowInput) => {
    if (!input || !Array.isArray(input.steps) || input.steps.length === 0) {
      throw new TypeError('N04_WORKFLOW_STEPS_REQUIRED');
    }

    const stepMap = new Map<string, WorkflowStep>();
    for (const step of input.steps) {
      if (!step || typeof step.id !== 'string' || !step.id.trim()) {
        throw new Error('N04_WORKFLOW_STEP_ID_REQUIRED');
      }
      if (stepMap.has(step.id)) {
        throw new Error(`N04_WORKFLOW_DUPLICATE_STEP:${step.id}`);
      }
      assertSafeNestedCapability(step.capability);
      stepMap.set(step.id, step);
    }

    const completed = new Map<string, unknown>();
    const failed = new Set<string>();
    const pending = new Set(stepMap.keys());
    const stopOnError = input.stopOnError ?? true;

    while (pending.size > 0) {
      const ready = [...pending].filter(id => {
        const deps = stepMap.get(id)?.dependsOn ?? [];
        for (const dependency of deps) {
          if (!stepMap.has(dependency)) throw new Error(`N04_WORKFLOW_UNKNOWN_DEPENDENCY:${dependency}`);
          if (failed.has(dependency) && stopOnError) return false;
          if (!completed.has(dependency) && !failed.has(dependency)) return false;
        }
        return true;
      });

      if (ready.length === 0) {
        if (pending.size > 0) {
          const unresolved = [...pending].join(',');
          throw new Error(`N04_WORKFLOW_CYCLE_OR_BLOCKED:${unresolved}`);
        }
      }

      const readySteps = ready
        .map((id: string) => stepMap.get(id))
        .filter((step): step is WorkflowStep => step !== undefined);
      const concurrency = normalizeConcurrency(input.concurrency);
      const round = await boundedMap(readySteps, concurrency, async step => {
        const dependencies = Object.fromEntries(
          (step.dependsOn ?? []).map(id => [id, completed.get(id)]),
        );
        try {
          const output = await execute(step.capability, {
            ...(step.input && typeof step.input === 'object' ? step.input as Record<string, unknown> : { value: step.input }),
            __workflow: { stepId: step.id, dependencies },
          });
          return { id: step.id, ok: true, output };
        } catch (error) {
          return { id: step.id, ok: false, error: error instanceof Error ? error.message : String(error) };
        }
      });

      for (const result of round) {
        pending.delete(result.id);
        if (result.ok) {
          completed.set(result.id, result.output);
        } else {
          failed.add(result.id);
        }
      }

      if (stopOnError && failed.size > 0) {
        const blocked = [...pending];
        return {
          mode: 'workflow',
          completed: Object.fromEntries(completed),
          failed: [...failed],
          blocked,
          stopped: true,
        };
      }
    }

    return {
      mode: 'workflow',
      completed: Object.fromEntries(completed),
      failed: [...failed],
      blocked: [],
      stopped: false,
    };
  };

  const scheduleTask = async (input: ScheduleInput) => {
    if (!input || !Number.isInteger(input.delayMs) || input.delayMs < 0) {
      throw new TypeError('N04_SCHEDULE_DELAY_MUST_BE_NON_NEGATIVE_INTEGER');
    }
    assertSafeNestedCapability(input.capability);
    const taskId = crypto.randomUUID();
    const scheduledAt = new Date(Date.now() + input.delayMs).toISOString();

    await new Promise<void>((resolve) => {
      setTimeout(resolve, input.delayMs);
    });

    try {
      const output = await execute(input.capability, input.input);
      return {
        mode: 'process-local-delayed-execution',
        taskId,
        capability: input.capability,
        delayMs: input.delayMs,
        scheduledAt,
        status: 'completed',
        output,
        durability: 'none',
      };
    } catch (error) {
      return {
        mode: 'process-local-delayed-execution',
        taskId,
        capability: input.capability,
        delayMs: input.delayMs,
        scheduledAt,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        durability: 'none',
      };
    }
  };

  return {
    'artifact.analyze': analyzeArtifact as N04RuntimeHandler,
    'parallel.map': parallelMap as N04RuntimeHandler,
    'batch.process': batchProcess as N04RuntimeHandler,
    'workflow.execute': workflowExecute as N04RuntimeHandler,
    'schedule.task': scheduleTask as N04RuntimeHandler,
  } as Partial<Record<Nucleus04Capability, N04RuntimeHandler>>;
}

export function registerN04CompositionHandlers(processor: Nucleus04Processor): void {
  const handlers = buildCompositionHandlers(processor);
  for (const [capability, handler] of Object.entries(handlers) as Array<[Nucleus04Capability, N04RuntimeHandler]>) {
    processor.registerHandler(capability, handler);
  }
}
