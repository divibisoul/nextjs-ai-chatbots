import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

export type N04WorkerTask = { kind: 'document'|'artifact'|'tool'; input: unknown };

/** Dependency-free worker pool using Node's stable worker_threads API. */
export class N04WorkerPool {
  readonly maxThreads: number;
  private active = 0;
  private readonly queue: Array<{ task: N04WorkerTask; resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

  constructor(maxThreads = availableParallelism()) { this.maxThreads = Math.max(1, maxThreads); }

  run<T = unknown>(task: N04WorkerTask): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve: resolve as (v: unknown) => void, reject });
      this.drain();
    });
  }

  async map<T = unknown>(kind: N04WorkerTask['kind'], inputs: unknown[]): Promise<T[]> {
    return Promise.all(inputs.map((input) => this.run<T>({ kind, input })));
  }

  private drain() {
    while (this.active < this.maxThreads && this.queue.length) {
      const job = this.queue.shift()!; this.active++;
      const worker = new Worker(join(process.cwd(), 'src/workers', `${job.task.kind}-worker.js`));
      const finish = (error?: unknown, value?: unknown) => { worker.terminate().catch(() => undefined); this.active--; if (error) job.reject(error); else job.resolve(value); this.drain(); };
      worker.once('message', (value) => finish(undefined, value));
      worker.once('error', (error) => finish(error));
      worker.postMessage(job.task.input);
    }
  }
}

export const n04WorkerPool = new N04WorkerPool();
