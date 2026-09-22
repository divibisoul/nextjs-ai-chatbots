import type { SaraCycleContext } from '@/lib/sara/SARAClient';

export type ContextPipelineStatus = 'ok' | 'degraded' | 'failed' | 'skipped';

export type ContextPipelineResult = {
  status: ContextPipelineStatus;
  steps: string[];
  context?: SaraCycleContext;
  errors: string[];
  warnings: string[];
};

function cleanStrings(values: unknown): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const cleaned = values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

export class ContextPipeline {
  run(input: string, context?: SaraCycleContext): ContextPipelineResult {
    const steps = ['load', 'clean', 'normalize', 'validate_gate', 'to_sara_context'];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.trim()) {
      return {
        status: 'failed',
        steps,
        errors: ['INPUT_REQUIRED'],
        warnings,
      };
    }

    let loaded: SaraCycleContext;
    try {
      loaded = { ...(context ?? {}) };
    } catch {
      return {
        status: 'failed',
        steps,
        errors: ['CONTEXT_LOAD_FAILED'],
        warnings,
      };
    }

    const cleaned: SaraCycleContext = {
      ...loaded,
      ...(cleanStrings(loaded.research_snippets)
        ? { research_snippets: cleanStrings(loaded.research_snippets) }
        : {}),
      ...(cleanStrings(loaded.user_feedback_refs)
        ? { user_feedback_refs: cleanStrings(loaded.user_feedback_refs) }
        : {}),
      session_id: loaded.session_id?.trim() || undefined,
    };

    if (loaded.research_snippets !== undefined && !Array.isArray(loaded.research_snippets)) {
      warnings.push('RESEARCH_SNIPPETS_DROPPED_INVALID_SHAPE');
    }
    if (loaded.user_feedback_refs !== undefined && !Array.isArray(loaded.user_feedback_refs)) {
      warnings.push('FEEDBACK_REFS_DROPPED_INVALID_SHAPE');
    }

    const normalized: SaraCycleContext = {
      ...cleaned,
      client: loaded.client?.trim() || 'collaboration',
    };

    const probabilistic = normalized.probabilistic;
    if (probabilistic !== undefined) {
      if (!Array.isArray(probabilistic.nodes)) {
        errors.push('PROBABILISTIC_NODES_REQUIRED');
      } else if (probabilistic.nodes.some((node) => !node || typeof node !== 'object')) {
        errors.push('PROBABILISTIC_NODE_MUST_BE_OBJECT');
      }
      if (probabilistic.structure?.edges !== undefined && !Array.isArray(probabilistic.structure.edges)) {
        errors.push('PROBABILISTIC_EDGES_MUST_BE_ARRAY');
      }
    }

    if (errors.length) {
      return { status: 'failed', steps, errors, warnings };
    }

    const status: ContextPipelineStatus = warnings.length ? 'degraded' : 'ok';
    return {
      status,
      steps,
      context: normalized,
      errors,
      warnings,
    };
  }
}
