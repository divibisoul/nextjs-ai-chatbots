/**
 * L6 — SYNTHESIS LOADER MODULE
 * Host: N04
 *
 * State coordinator only. Progress is accepted from a real host operation;
 * the module never invents completion or throughput.
 */
export type LoaderStatus = "active" | "complete" | "failed";

export interface SynthesisLoaderState {
  id: string;
  label: string;
  total?: number;
  progress?: number;
  status: LoaderStatus;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export type LoaderObserver = (state: SynthesisLoaderState) => void;

export class SynthesisLoaderModule {
  readonly id = "synthesis-loader" as const;
  private readonly loaders = new Map<string, SynthesisLoaderState>();
  private readonly observers = new Set<LoaderObserver>();
  private sequence = 0;

  subscribe(observer: LoaderObserver): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  start(data: { id?: string; label: string; total?: number }): string {
    const label = data.label.trim();
    if (!label) throw new Error("LOADER_LABEL_REQUIRED");
    if (data.total !== undefined && (!Number.isFinite(data.total) || data.total <= 0)) {
      throw new Error("LOADER_TOTAL_INVALID");
    }

    const id = data.id?.trim() || `loader-${Date.now()}-${this.sequence++}`;
    const state: SynthesisLoaderState = {
      id,
      label,
      total: data.total,
      progress: data.total === undefined ? undefined : 0,
      status: "active",
      startedAt: Date.now(),
    };
    this.loaders.set(id, state);
    this.publish(state);
    return id;
  }

  update(data: { id: string; progress?: number }): void {
    const state = this.loaders.get(data.id);
    if (!state || state.status !== "active") return;
    if (data.progress !== undefined) {
      if (!Number.isFinite(data.progress) || data.progress < 0) {
        throw new Error("LOADER_PROGRESS_INVALID");
      }
      if (state.total !== undefined && data.progress > state.total) {
        throw new Error("LOADER_PROGRESS_EXCEEDS_TOTAL");
      }
      state.progress = data.progress;
    }
    this.publish(state);
  }

  end(data: { id: string; error?: string }): void {
    const state = this.loaders.get(data.id);
    if (!state || state.status !== "active") return;
    state.status = data.error ? "failed" : "complete";
    state.error = data.error;
    state.completedAt = Date.now();
    this.publish(state);
  }

  getActive(): SynthesisLoaderState[] {
    return [...this.loaders.values()]
      .filter(state => state.status === "active")
      .map(state => ({ ...state }));
  }

  get(id: string): SynthesisLoaderState | undefined {
    const state = this.loaders.get(id);
    return state ? { ...state } : undefined;
  }

  private publish(state: SynthesisLoaderState): void {
    const snapshot = { ...state };
    for (const observer of this.observers) observer(snapshot);
  }
}

export const synthesisLoaderModule = new SynthesisLoaderModule();
