/**
 * Standalone N04 bounded worker pool.
 *
 * This is an additive extraction of the concurrency semantics already proven
 * inside N04CompositionRuntime. The existing runtime implementation remains
 * intact; this module makes the worker-pool capability independently reusable
 * and testable without changing the existing N04 API.
 */

export const N04_DEFAULT_CONCURRENCY = 4;
export const N04_MAX_CONCURRENCY = 16;

export function normalizeN04Concurrency(value: unknown): number {
  if (value === undefined) return N04_DEFAULT_CONCURRENCY;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new TypeError('N04_CONCURRENCY_MUST_BE_POSITIVE_INTEGER');
  }
  return Math.min(value, N04_MAX_CONCURRENCY);
}

export async function boundedN04Map<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = normalizeN04Concurrency(concurrency);
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(limit, Math.max(1, items.length)) },
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

export class N04WorkerPool {
  constructor(private readonly concurrency = N04_DEFAULT_CONCURRENCY) {
    normalizeN04Concurrency(concurrency);
  }

  getConcurrency(): number {
    return normalizeN04Concurrency(this.concurrency);
  }

  map<T, R>(
    items: T[],
    worker: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    return boundedN04Map(items, this.getConcurrency(), worker);
  }
}
