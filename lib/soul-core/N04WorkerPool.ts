import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

export type N04WorkerTask = { kind: 'document'|'artifact'|'tool'; input: unknown };
export type N04WorkerPriority = 'high' | 'normal' | 'low';

type Job = {
  task: N04WorkerTask;
  priority: number;
  order: number;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

/** CPU worker pool for isolated, CPU-bound transforms. Tool/business side effects stay in the main runtime. */
export class N04WorkerPool {
  readonly maxThreads: number;
  private active = 0;
  private order = 0;
  private readonly queue: Job[] = [];
  private readonly timeoutMs = Math.max(1000, Number(process.env.N04_WORKER_TIMEOUT_MS ?? 30000));

  constructor(maxThreads = availableParallelism()) { this.maxThreads = Math.max(1, maxThreads); }

  run<T = unknown>(task: N04WorkerTask, priority: N04WorkerPriority = 'normal'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const weight = priority === 'high' ? 0 : priority === 'normal' ? 1 : 2;
      this.queue.push({ task, priority: weight, order: this.order++, resolve: resolve as (value: unknown) => void, reject });
      this.queue.sort((a, b) => a.priority - b.priority || a.order - b.order);
      this.drain();
    });
  }

  async map<T = unknown>(kind: N04WorkerTask['kind'], inputs: unknown[], priority: N04WorkerPriority = 'low'): Promise<T[]> {
    return Promise.all(inputs.map((input) => this.run<T>({ kind, input }, priority)));
  }

  private drain() {
    while (this.active < this.maxThreads && this.queue.length) {
      const job = this.queue.shift()!;
      this.active++;
      const worker = new Worker(join(process.cwd(), 'src/workers', `${job.task.kind}-worker.js`));
      let settled = false;
      const timer = setTimeout(() => finish(new Error(`N04_WORKER_TIMEOUT:${job.task.kind}`)), this.timeoutMs);
      const finish = (error?: unknown, value?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.removeAllListeners();
        worker.terminate().catch(() => undefined).finally(() => {
          this.active--;
          if (error) job.reject(error); else job.resolve(value);
          this.drain();
        });
      };
      worker.once('message', (value) => finish(undefined, value));
      worker.once('error', (error) => finish(error));
      worker.once('exit', (code) => { if (code !== 0) finish(new Error(`N04_WORKER_EXIT:${code}`)); });
      worker.postMessage(job.task.input);
    }
  }
}

export const n04WorkerPool = new N04WorkerPool();
