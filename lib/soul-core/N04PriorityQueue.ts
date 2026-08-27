export type N04Priority = 'mesh' | 'internal';

type Job<T> = { priority: number; order: number; run: () => Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void };

export class N04PriorityQueue {
  private queue: Job<unknown>[] = [];
  private running = 0;
  private order = 0;
  constructor(private readonly concurrency = 1) {}
  add<T>(run: () => Promise<T>, priority: N04Priority = 'internal'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ priority: priority === 'mesh' ? 0 : 1, order: this.order++, run, resolve: resolve as (v: unknown) => void, reject });
      this.queue.sort((a, b) => a.priority - b.priority || a.order - b.order);
      this.drain();
    });
  }
  private drain() {
    while (this.running < this.concurrency && this.queue.length) {
      const job = this.queue.shift()!; this.running++;
      job.run().then(job.resolve).catch(job.reject).finally(() => { this.running--; this.drain(); });
    }
  }
}
