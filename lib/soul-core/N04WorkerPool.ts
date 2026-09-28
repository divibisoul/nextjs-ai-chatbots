export type N04WorkerTask<T> = {
  id: string;
  input: T;
  priority?: number;
};

export type N04WorkerPoolStats = {
  maxConcurrency: number;
  queueDepth: number;
  active: number;
  completed: number;
  failed: number;
};

export type N04WorkerPoolExecutor<T, R> = (
  input: T,
  index: number,
) => Promise<R>;

export class N04WorkerPool {
  private readonly maxConcurrency: number;
  private queue: Array<{
    task: N04WorkerTask<unknown>;
    index: number;
    run: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];
  private active = 0;
  private completed = 0;
  private failed = 0;

  constructor(maxConcurrency = 8) {
    if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1 || maxConcurrency > 64) {
      throw new Error('N04_WORKER_POOL_INVALID_CONCURRENCY');
    }
    this.maxConcurrency = maxConcurrency;
  }

  async execute<T, R>(
    tasks: readonly N04WorkerTask<T>[],
    executor: N04WorkerPoolExecutor<T, R>,
  ): Promise<R[]> {
    if (!Array.isArray(tasks)) throw new Error('N04_WORKER_POOL_TASKS_REQUIRED');
    if (tasks.length === 0) return [];
    if (typeof executor !== 'function') throw new Error('N04_WORKER_POOL_EXECUTOR_REQUIRED');

    const sorted = tasks
      .map((task, index) => ({ task, index }))
      .sort((a, b) => (b.task.priority ?? 0) - (a.task.priority ?? 0));

    const results = new Array<R>(tasks.length);
    const promises = sorted.map(({ task, index }) =>
      new Promise<void>((resolve, reject) => {
        this.queue.push({
          task: task as N04WorkerTask<unknown>,
          index,
          run: async () => {
            results[index] = await executor(task.input, index);
          },
          resolve: (value) => {
            void value;
            resolve();
          },
          reject,
        });
      }),
    );

    this.pump();

    await Promise.all(promises);
    return results;
  }

  stats(): N04WorkerPoolStats {
    return {
      maxConcurrency: this.maxConcurrency,
      queueDepth: this.queue.length,
      active: this.active,
      completed: this.completed,
      failed: this.failed,
    };
  }

  private pump(): void {
    while (this.active < this.maxConcurrency && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) return;
      this.active += 1;
      void item.run()
        .then(() => {
          this.completed += 1;
          item.resolve(undefined);
        })
        .catch((error) => {
          this.failed += 1;
          item.reject(error);
        })
        .finally(() => {
          this.active -= 1;
          this.pump();
        });
    }
  }
}
