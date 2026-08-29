import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

export type N04WorkerTask = { kind: 'document' | 'artifact' | 'tool'; input: unknown };
export type N04WorkerPriority = 'high' | 'normal' | 'low';

type QueueItem<T> = {
  task: N04WorkerTask;
  priority: number;
  order: number;
  timeoutMs: number;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

/** Bounded CPU worker pool for isolated CPU-oriented transformations. */
export class N04WorkerPool {
  readonly maxThreads: number;
  private active = 0;
  private order = 0;
  private readonly queue: QueueItem<unknown>[] = [];
  private readonly defaultTimeoutMs: number;

  constructor(maxThreads = availableParallelism(), defaultTimeoutMs = Number(process.env.N04_WORKER_TIMEOUT_MS ?? 30000)) {
    this.maxThreads = Math.max(1, Math.floor(maxThreads));
    this.defaultTimeoutMs = Math.max(100, Number.isFinite(defaultTimeoutMs) ? defaultTimeoutMs : 30000);
  }

  run<T = unknown>(task: N04WorkerTask, options: { priority?: N04WorkerPriority; timeoutMs?: number } = {}): Promise<T> {
    const priority = options.priority === 'high' ? 0 : options.priority === 'low' ? 2 : 1;
    const timeoutMs = Math.max(100, options.timeoutMs ?? this.defaultTimeoutMs);
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, priority, order: this.order++, timeoutMs, resolve: resolve as (value: unknown) => void, reject });
      this.queue.sort((a, b) => a.priority - b.priority || a.order - b.order);
      this.drain();
    });
  }

  async map<T = unknown>(kind: N04WorkerTask['kind'], inputs: unknown[], options: { priority?: N04WorkerPriority; timeoutMs?: number } = {}): Promise<T[]> {
    return Promise.all(inputs.map((input) => this.run<T>({ kind, input }, options)));
  }

  pending(): number { return this.queue.length; }

  private drain() {
    while (this.active < this.maxThreads && this.queue.length) {
      const job = this.queue.shift()!;
      this.active += 1;
      const worker = new Worker(join(process.cwd(), 'src/workers', `${job.task.kind}-worker.js`));
      let settled = false;
      const timer = setTimeout(() => finish(new Error(`N04_WORKER_TIMEOUT:${job.task.kind}:${job.timeoutMs}`)), job.timeoutMs);
      const finish = (error?: unknown, value?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.terminate().catch(() => undefined);
        this.active -= 1;
        if (error) job.reject(error); else job.resolve(value);
        this.drain();
      };
      worker.once('message', (value) => {
        if (value && typeof value === 'object' && 'ok' in value && (value as { ok?: unknown }).ok === false) {
          finish(new Error(`N04_WORKER_FAILED:${job.task.kind}`));
        } else finish(undefined, value);
      });
      worker.once('error', (error) => finish(error));
      worker.once('exit', (code) => { if (code !== 0 && !settled) finish(new Error(`N04_WORKER_EXIT:${job.task.kind}:${code}`)); });
      worker.postMessage(job.task.input);
    }
  }
}

export const n04WorkerPool = new N04WorkerPool();
