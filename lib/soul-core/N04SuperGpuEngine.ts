import { availableParallelism } from 'node:os';

export type N04SuperGpuPriority = 'mesh' | 'internal' | 'batch';

export interface N04SuperGpuMetrics {
  submitted: number;
  completed: number;
  failed: number;
  timedOut: number;
  active: number;
  pending: number;
  capacity: number;
}

type Job<T> = {
  run: () => Promise<T>;
  priority: number;
  order: number;
  timeoutMs: number;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

/** N04 software acceleration fabric for bounded parallel orchestration. */
export class N04SuperGpuEngine {
  private readonly queue: Job<unknown>[] = [];
  private active = 0;
  private order = 0;
  private submitted = 0;
  private completed = 0;
  private failed = 0;
  private timedOut = 0;
  readonly capacity: number;
  readonly timeoutMs: number;

  constructor(options: { capacity?: number; timeoutMs?: number } = {}) {
    const detected = availableParallelism();
    const configured = Number(process.env.N04_SUPER_GPU_CAPACITY ?? detected);
    const requested = options.capacity ?? (Number.isFinite(configured) ? configured : detected);
    this.capacity = Math.max(1, Math.min(requested, 64));
    const timeout = options.timeoutMs ?? Number(process.env.N04_SUPER_GPU_TIMEOUT_MS ?? 30000);
    this.timeoutMs = Math.max(1000, Number.isFinite(timeout) ? timeout : 30000);
  }

  submit<T>(run: () => Promise<T>, priority: N04SuperGpuPriority = 'internal', timeoutMs = this.timeoutMs): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.reject(new Error('N04_SUPER_GPU_INVALID_TIMEOUT'));
    this.submitted += 1;
    const priorityValue = priority === 'mesh' ? 0 : priority === 'internal' ? 1 : 2;
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ run, priority: priorityValue, order: this.order++, timeoutMs, resolve: resolve as (value: unknown) => void, reject });
      this.queue.sort((a, b) => a.priority - b.priority || a.order - b.order);
      this.drain();
    });
  }

  map<T>(items: readonly unknown[], run: (item: unknown, index: number) => Promise<T>, priority: N04SuperGpuPriority = 'batch'): Promise<T[]> {
    return Promise.all(items.map((item, index) => this.submit(() => run(item, index), priority)));
  }

  get metrics(): N04SuperGpuMetrics {
    return { submitted: this.submitted, completed: this.completed, failed: this.failed, timedOut: this.timedOut, active: this.active, pending: this.queue.length, capacity: this.capacity };
  }

  private drain() {
    while (this.active < this.capacity && this.queue.length) {
      const job = this.queue.shift()!;
      this.active += 1;
      let callerSettled = false;
      let executionFinished = false;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        this.active = Math.max(0, this.active - 1);
        this.drain();
      };
      const timer = setTimeout(() => {
        if (callerSettled) return;
        callerSettled = true;
        this.timedOut += 1;
        job.reject(new Error(`N04_SUPER_GPU_TIMEOUT:${job.timeoutMs}`));
      }, job.timeoutMs);
      Promise.resolve().then(job.run).then((value) => {
        if (!callerSettled) {
          callerSettled = true;
          this.completed += 1;
          job.resolve(value);
        }
      }).catch((error) => {
        if (!callerSettled) {
          callerSettled = true;
          this.failed += 1;
          job.reject(error);
        }
      }).finally(() => {
        executionFinished = true;
        clearTimeout(timer);
        if (executionFinished) release();
      });
    }
  }
}

export const n04SuperGpu = new N04SuperGpuEngine();
