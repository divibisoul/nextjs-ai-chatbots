export type N04Priority = 'mesh' | 'internal' | 'batch';

type Job<T> = { priority: number; order: number; run: () => Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void; timeoutMs: number };

export class N04PriorityQueue {
  private queue: Job<unknown>[] = [];
  private running = 0;
  private order = 0;
  constructor(
    private readonly concurrency = Math.max(1, Number(process.env.N04_HANDLER_CONCURRENCY ?? 4)),
    private readonly defaultTimeoutMs = Math.max(1000, Number(process.env.N04_HANDLER_TIMEOUT_MS ?? 30000)),
  ) {}
  add<T>(run: () => Promise<T>, priority: N04Priority = 'internal', timeoutMs = this.defaultTimeoutMs): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.reject(new Error('N04_INVALID_TIMEOUT'));
    return new Promise<T>((resolve, reject) => {
      const priorityValue = priority === 'mesh' ? 0 : priority === 'internal' ? 1 : 2;
      this.queue.push({ priority: priorityValue, order: this.order++, run, resolve: resolve as (value: unknown) => void, reject, timeoutMs });
      this.queue.sort((a, b) => a.priority - b.priority || a.order - b.order);
      this.drain();
    });
  }
  get pending() { return this.queue.length; }
  get active() { return this.running; }
  private drain() {
    while (this.running < this.concurrency && this.queue.length) {
      const job = this.queue.shift()!;
      this.running += 1;
      let settled = false;
      const finish = () => { if (settled) return; settled = true; this.running -= 1; this.drain(); };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.running -= 1;
        job.reject(new Error(`N04_HANDLER_TIMEOUT:${job.timeoutMs}`));
        this.drain();
      }, job.timeoutMs);
      Promise.resolve().then(job.run).then((value) => { if (!settled) job.resolve(value); }).catch((error) => { if (!settled) job.reject(error); }).finally(() => { clearTimeout(timer); finish(); });
    }
  }
}
