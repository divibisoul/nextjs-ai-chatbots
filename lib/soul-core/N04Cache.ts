type Entry = { value: unknown; expires: number };

export class N04TtlCache {
  private readonly store = new Map<string, Entry>();
  constructor(private readonly ttlMs = Number(process.env.N04_CACHE_TTL_MS ?? 300000)) {}
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) { this.store.delete(key); return undefined; }
    return entry.value as T;
  }
  set(key: string, value: unknown) { this.store.set(key, { value, expires: Date.now() + this.ttlMs }); return value; }
  async getOrSet<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key); if (cached !== undefined) return cached;
    return this.set(key, await factory()) as T;
  }
  clear() { this.store.clear(); }
}

export const n04Cache = new N04TtlCache();
