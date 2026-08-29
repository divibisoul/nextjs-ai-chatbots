export type N04Priority = 'mesh' | 'internal' | 'batch';

type Job<T> = { priority: number; order: number; run: () => Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

/** Stable bounded scheduler used by N04 before work enters the acceleration fabric. */
export class N04PriorityQueue {
  private readonly queue: Job<unknown>[] = [];
  private running = 0;
  private order = 0;

  constructor(private readonly concurrency = Math.max(1, Math.min(64, Number(process.env.N04_HANDLER_CONCURRENCY ?? 8)))) {}

  add<T>(run: () => Promise<T>, priority: N04Priority = 'internal'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const priorityValue = priority === 'mesh' ? 0 : priority === 'internal' ? 1 : 2;
      this.queue.push({ priority: priorityValue, order: this.order++, run, resolve: resolve as (value: unknown) => void, reject });
      this.queue.sort((a, b) => a.priority - b.priority || a.order - b.order);
      this.drain();
    });
  }

  get pending(): number { return this.queue.length; }
  get active(): number { return this.running; }

  private drain() {
    while (this.running < this.concurrency && this.queue.length) {
      const job = this.queue.shift()!;
      this.running += 1;
      Promise.resolve().then(job.run).then(job.resolve).catch(job.reject).finally(() => { this.running -= 1; this.drain(); });
    }
  }
}
