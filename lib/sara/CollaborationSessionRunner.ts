import {
  saraAudit,
  saraCycle,
  type SaraCycleContext,
  type SaraCycleResponse,
} from '@/lib/sara/SARAClient';
import { ContextPipeline } from '@/lib/sara/ContextPipeline';

export type CollaborationStage = 'COORDINATE' | 'RESEARCH' | 'VALIDATE' | 'EXECUTE' | 'REPORT';
export type CollaborationStageState = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

export type CollaborationStageResult = {
  stage: CollaborationStage;
  state: CollaborationStageState;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  error?: string;
  detail?: Record<string, unknown>;
};

export type SearchAdapter = {
  search: (
    query: string,
    options?: { signal?: AbortSignal; timeoutMs?: number; sessionId?: string },
  ) => Promise<string[]>;
};

export type CollaborationSessionRequest = {
  input: string;
  sessionId?: string;
  cycleId?: string;
  context?: SaraCycleContext;
  researchQuery?: string;
  allowReducedContextRetry?: boolean;
};

export type CollaborationSessionReport = {
  session_id: string;
  cycle_id: string;
  status: 'completed' | 'error';
  final_response?: SaraCycleResponse;
  research_snippets: string[];
  stages: CollaborationStageResult[];
};

const nowIso = () => new Date().toISOString();
const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export class CollaborationSessionRunner {
  private readonly searchAdapter?: SearchAdapter;
  private readonly researchTimeoutMs: number;
  private readonly searchLocks = new Map<string, Promise<void>>();
  private readonly contextPipeline = new ContextPipeline();

  constructor(options: { searchAdapter?: SearchAdapter; researchTimeoutMs?: number } = {}) {
    this.searchAdapter = options.searchAdapter;
    this.researchTimeoutMs = Math.max(100, options.researchTimeoutMs ?? 2_500);
  }

  private async searchWithSessionLock(
    sessionId: string,
    query: string,
  ): Promise<string[]> {
    const previous = this.searchLocks.get(sessionId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.searchLocks.set(sessionId, current);
    try {
      await previous;
      return await withTimeout(
        (signal) => this.searchAdapter!.search(query, {
          signal,
          timeoutMs: this.researchTimeoutMs,
          sessionId,
        }),
        this.researchTimeoutMs,
      );
    } finally {
      release();
      if (this.searchLocks.get(sessionId) === current) {
        this.searchLocks.delete(sessionId);
      }
    }
  }

  async run(request: CollaborationSessionRequest): Promise<CollaborationSessionReport> {
    if (!request.input.trim()) throw new Error('SARA_INPUT_REQUIRED');

    const stages: CollaborationStageResult[] = [];
    const sessionId = request.sessionId?.trim() || crypto.randomUUID();
    const cycleId = request.cycleId?.trim() || (sessionId + ':cycle');

    let context: SaraCycleContext = {
      ...(request.context ?? {}),
      session_id: sessionId,
      client: 'collaboration',
    };

    const coordinateStart = Date.now();
    const coordinateAt = nowIso();
    stages.push({
      stage: 'COORDINATE',
      state: 'completed',
      durationMs: Date.now() - coordinateStart,
      startedAt: coordinateAt,
      finishedAt: nowIso(),
      detail: { session_id: sessionId, cycle_id: cycleId, correlation_strategy: 'session_id/cycle_id' },
    });

    let researchSnippets: string[] = [];
    const researchStart = Date.now();
    const researchAt = nowIso();

    if (!this.searchAdapter || !request.researchQuery?.trim()) {
      stages.push({
        stage: 'RESEARCH',
        state: 'skipped',
        durationMs: Date.now() - researchStart,
        startedAt: researchAt,
        finishedAt: nowIso(),
        detail: {
          reason: this.searchAdapter ? 'NO_RESEARCH_QUERY' : 'SEARCH_ADAPTER_UNAVAILABLE',
        },
      });
    } else {
      try {
        researchSnippets = await this.searchWithSessionLock(
          sessionId,
          request.researchQuery!.trim(),
        );
        researchSnippets = researchSnippets
          .filter((item) => typeof item === 'string' && item.trim())
          .slice(0, 8)
          .map((item) => item.slice(0, 4_000));
        context = { ...context, research_snippets: researchSnippets };
        stages.push({
          stage: 'RESEARCH',
          state: 'completed',
          durationMs: Date.now() - researchStart,
          startedAt: researchAt,
          finishedAt: nowIso(),
          detail: { snippet_count: researchSnippets.length },
        });
      } catch (error) {
        researchSnippets = [];
        stages.push({
          stage: 'RESEARCH',
          state: 'skipped',
          durationMs: Date.now() - researchStart,
          startedAt: researchAt,
          finishedAt: nowIso(),
          error: errorMessage(error),
          detail: { reason: 'RESEARCH_UNAVAILABLE' },
        });
      }
    }

    const contextPipeline = this.contextPipeline.run(request.input, context);
    if (contextPipeline.status === 'failed' || !contextPipeline.context) {
      const validateStart = Date.now();
      const validateAt = nowIso();
      stages.push({
        stage: 'VALIDATE',
        state: 'error',
        durationMs: Date.now() - validateStart,
        startedAt: validateAt,
        finishedAt: nowIso(),
        error: contextPipeline.errors.join('|') || 'CONTEXT_PIPELINE_FAILED',
        detail: {
          operation: 'context_pipeline',
          pipeline: contextPipeline,
          fallback_used: false,
        },
      });
      const reportStart = Date.now();
      const reportAt = nowIso();
      stages.push({
        stage: 'REPORT',
        state: 'completed',
        durationMs: Date.now() - reportStart,
        startedAt: reportAt,
        finishedAt: nowIso(),
        detail: { final_response_present: false, fabricated_response: false },
      });
      return {
        session_id: sessionId,
        cycle_id: cycleId,
        status: 'error',
        research_snippets: researchSnippets,
        stages,
      };
    }
    context = contextPipeline.context;

    const validateStart = Date.now();
    const validateAt = nowIso();
    try {
      const validation = await saraAudit(request.input, cycleId, context);
      stages.push({
        stage: 'VALIDATE',
        state: 'completed',
        durationMs: Date.now() - validateStart,
        startedAt: validateAt,
        finishedAt: nowIso(),
        detail: {
          operation: 'sara.audit',
          response_keys: Object.keys(validation).sort(),
          context_pipeline: contextPipeline,
        },
      });
    } catch (error) {
      stages.push({
        stage: 'VALIDATE',
        state: 'error',
        durationMs: Date.now() - validateStart,
        startedAt: validateAt,
        finishedAt: nowIso(),
        error: errorMessage(error),
        detail: { operation: 'sara.audit' },
      });
      const reportStart = Date.now();
      const reportAt = nowIso();
      stages.push({
        stage: 'REPORT',
        state: 'completed',
        durationMs: Date.now() - reportStart,
        startedAt: reportAt,
        finishedAt: nowIso(),
        detail: { final_response_present: false, fabricated_response: false },
      });
      return {
        session_id: sessionId,
        cycle_id: cycleId,
        status: 'error',
        research_snippets: researchSnippets,
        stages,
      };
    }

    const executeStart = Date.now();
    const executeAt = nowIso();
    try {
      const finalResponse = await saraCycle(request.input, cycleId, context);
      stages.push({
        stage: 'EXECUTE',
        state: 'completed',
        durationMs: Date.now() - executeStart,
        startedAt: executeAt,
        finishedAt: nowIso(),
        detail: {
          operation: 'sara.cycle',
          fallback_used: false,
          cycle_id: finalResponse.cycle_id,
          trace_hash: finalResponse.trace_hash ?? null,
        },
      });
      const reportStart = Date.now();
      const reportAt = nowIso();
      stages.push({
        stage: 'REPORT',
        state: 'completed',
        durationMs: Date.now() - reportStart,
        startedAt: reportAt,
        finishedAt: nowIso(),
        detail: { final_response_present: true, fabricated_response: false },
      });
      return {
        session_id: sessionId,
        cycle_id: finalResponse.cycle_id,
        status: 'completed',
        final_response: finalResponse,
        research_snippets: researchSnippets,
        stages,
      };
    } catch (error) {
      if (!request.allowReducedContextRetry) {
        stages.push({
          stage: 'EXECUTE',
          state: 'error',
          durationMs: Date.now() - executeStart,
          startedAt: executeAt,
          finishedAt: nowIso(),
          error: errorMessage(error),
          detail: { operation: 'sara.cycle', fallback_used: false },
        });
        const reportStart = Date.now();
        const reportAt = nowIso();
        stages.push({
          stage: 'REPORT',
          state: 'completed',
          durationMs: Date.now() - reportStart,
          startedAt: reportAt,
          finishedAt: nowIso(),
          detail: { final_response_present: false, fabricated_response: false },
        });
        return {
          session_id: sessionId,
          cycle_id: cycleId,
          status: 'error',
          research_snippets: researchSnippets,
          stages,
        };
      }

      const fallbackContext: SaraCycleContext = {
        session_id: sessionId,
        client: 'collaboration',
        scenarios: context.scenarios,
      };
      const fallbackCycleId = cycleId + ':fallback';
      try {
        const fallbackResponse = await saraCycle(request.input, fallbackCycleId, fallbackContext);
        stages.push({
          stage: 'EXECUTE',
          state: 'completed',
          durationMs: Date.now() - executeStart,
          startedAt: executeAt,
          finishedAt: nowIso(),
          detail: {
            operation: 'sara.cycle',
            fallback_used: true,
            original_error: errorMessage(error),
            cycle_id: fallbackResponse.cycle_id,
            trace_hash: fallbackResponse.trace_hash ?? null,
          },
        });
        const reportStart = Date.now();
        const reportAt = nowIso();
        stages.push({
          stage: 'REPORT',
          state: 'completed',
          durationMs: Date.now() - reportStart,
          startedAt: reportAt,
          finishedAt: nowIso(),
          detail: { final_response_present: true, fabricated_response: false, fallback_used: true },
        });
        return {
          session_id: sessionId,
          cycle_id: fallbackResponse.cycle_id,
          status: 'completed',
          final_response: fallbackResponse,
          research_snippets: researchSnippets,
          stages,
        };
      } catch (fallbackError) {
        stages.push({
          stage: 'EXECUTE',
          state: 'error',
          durationMs: Date.now() - executeStart,
          startedAt: executeAt,
          finishedAt: nowIso(),
          error: errorMessage(fallbackError),
          detail: {
            operation: 'sara.cycle',
            fallback_used: true,
            original_error: errorMessage(error),
          },
        });
        const reportStart = Date.now();
        const reportAt = nowIso();
        stages.push({
          stage: 'REPORT',
          state: 'completed',
          durationMs: Date.now() - reportStart,
          startedAt: reportAt,
          finishedAt: nowIso(),
          detail: { final_response_present: false, fabricated_response: false, fallback_used: true },
        });
        return {
          session_id: sessionId,
          cycle_id: cycleId,
          status: 'error',
          research_snippets: researchSnippets,
          stages,
        };
      }
    }
  }
}