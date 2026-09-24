import type { ChatMessage } from '@/lib/types';

const BASE_URL = () => (process.env.SARA_BASE_URL ?? '').trim().replace(/\/$/, '');
const TOKEN = () => (process.env.SARA_API_TOKEN ?? '').trim();

export function saraConfigured(): boolean {
  return Boolean(BASE_URL() && TOKEN());
}

export function saraChatEnabled(): boolean {
  return (process.env.SARA_ENABLE_CHAT ?? '').trim().toLowerCase() === 'true';
}

export function extractMessageText(message: ChatMessage): string {
  return message.parts
    .flatMap((part) => {
      if (part.type === 'text' && 'text' in part && typeof part.text === 'string') {
        return [part.text];
      }
      return [];
    })
    .join('\n')
    .trim();
}

export type SaraProbabilisticNode = {
  name: string;
  states: string[];
  prior: Record<string, number>;
  prior_type?: 'dirichlet' | 'uniform' | 'empirical';
  pseudo_counts?: number;
  evidence?: Record<string, number> | null;
  posterior?: Record<string, number> | null;
  confidence?: number;
  entropy?: number;
  source?: 'dirichlet' | 'neural' | 'fused';
  provenance?: 'HISTORICAL' | 'INFERRED' | 'USER' | 'TOOL';
} & Record<string, unknown>;

export type SaraProbabilisticContext = {
  structure?: {
    edges: [string, string][];
    valid?: boolean;
    validation_errors?: string[];
  };
  nodes: SaraProbabilisticNode[];
  interventions?: Array<{
    name: string;
    do: Record<string, string>;
    evidence: Record<string, string>;
    query: string[];
  }>;
  fusion?: {
    alpha_dirichlet?: number;
    beta_neural?: number;
    temperature?: number;
  };
} & Record<string, unknown>;

export type SaraCycleContext = {
  session_id?: string;
  client?: 'n04' | 'n06' | 'n07' | 'android' | 'collaboration' | 'web' | 'app' | 'ios' | 'desktop' | 'pwa' | string;
  research_snippets?: string[];
  user_feedback_refs?: string[];
  pipeline?: Record<string, unknown>;
  probabilistic?: SaraProbabilisticContext;
  scenarios?: Array<{ name: string; note: string }>;
} & Record<string, unknown>;

export type SaraCycleExecutionReport = { evidence_hash?: string } & Record<string, unknown>;

export type SaraCycleResponse = {
  cycle_id: string;
  final_state: string;
  converged?: boolean;
  rollback_performed?: boolean;
  trace_hash?: string;
  execution_report?: SaraCycleExecutionReport;
} & Record<string, unknown>;

export async function saraCycle(input: string, cycleId?: string, context?: SaraCycleContext): Promise<SaraCycleResponse> {
  if (!saraConfigured()) throw new Error('SARA_NOT_CONFIGURED');
  if (!input.trim()) throw new Error('SARA_INPUT_REQUIRED');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(BASE_URL() + '/v1/cycle', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + TOKEN(),
        'content-type': 'application/json',
        accept: 'application/json',
        ...(cycleId ? { 'X-Correlation-ID': cycleId } : {}),
      },
      body: JSON.stringify({
        input,
        cycle_id: cycleId,
        ...(context ? { context } : {}),
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = payload && typeof payload === 'object' && payload !== null && 'error' in payload
        ? JSON.stringify((payload as { error: unknown }).error)
        : 'HTTP_' + response.status;
      throw new Error('SARA_HTTP_' + response.status + ':' + detail);
    }
    if (!payload || typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      throw new Error('SARA_INVALID_CYCLE_RESPONSE');
    }
    const record = payload as Record<string, unknown>;
    const cycleIdValue = record.cycle_id;
    const finalStateValue = record.final_state;
    if (typeof cycleIdValue !== 'string' || typeof finalStateValue !== 'string') {
      throw new Error('SARA_INVALID_CYCLE_RESPONSE');
    }
    const executionReport = record.execution_report;
    if (executionReport !== undefined && (typeof executionReport !== 'object' || executionReport === null || Array.isArray(executionReport))) {
      throw new Error('SARA_INVALID_CYCLE_EXECUTION_REPORT');
    }
    return record as SaraCycleResponse;
  } finally {
    clearTimeout(timer);
  }
}


type SaraRequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  correlationId?: string;
  auth?: boolean;
};

async function saraRequest(path: string, options: SaraRequestOptions = {}): Promise<unknown> {
  const baseUrl = BASE_URL();
  const token = TOKEN();
  const requiresAuth = options.auth !== false;
  if (!baseUrl || (requiresAuth && !token)) throw new Error('SARA_NOT_CONFIGURED');

  const correlationId = options.correlationId?.trim() || crypto.randomUUID();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'X-Correlation-ID': correlationId,
    };
    if (requiresAuth) headers.authorization = 'Bearer ' + token;
    if (options.method === 'POST') headers['content-type'] = 'application/json';

    const response = await fetch(baseUrl + path, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: controller.signal,
      cache: 'no-store',
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = payload && typeof payload === 'object' && 'error' in payload
        ? JSON.stringify((payload as { error: unknown }).error)
        : 'request failed';
      throw new Error('SARA_HTTP_' + response.status + ':' + detail);
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('SARA_INVALID_RESPONSE');
    }
    const echoed = response.headers.get('X-Correlation-ID');
    if (echoed && echoed !== correlationId) throw new Error('SARA_CORRELATION_ID_MISMATCH');
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export async function saraHealth(): Promise<Record<string, unknown>> {
  return (await saraRequest('/health', { auth: false })) as Record<string, unknown>;
}

export async function saraCapabilities(): Promise<Record<string, unknown>> {
  return (await saraRequest('/v1/capabilities', { correlationId: crypto.randomUUID() })) as Record<string, unknown>;
}

export async function saraState(): Promise<Record<string, unknown>> {
  return (await saraRequest('/v1/state', { correlationId: crypto.randomUUID() })) as Record<string, unknown>;
}

export async function saraAudit(
  input: string,
  correlationId?: string,
  context?: SaraCycleContext,
): Promise<Record<string, unknown>> {
  if (!input.trim()) throw new Error('SARA_INPUT_REQUIRED');
  return (await saraRequest('/v1/audit', {
    method: 'POST',
    body: { input, ...(context ? { context } : {}) },
    correlationId,
  })) as Record<string, unknown>;
}

export async function saraRegenerate(input: string, correlationId?: string): Promise<Record<string, unknown>> {
  if (!input.trim()) throw new Error('SARA_INPUT_REQUIRED');
  return (await saraRequest('/v1/regenerate', {
    method: 'POST',
    body: { input },
    correlationId,
  })) as Record<string, unknown>;
}

export async function saraTrace(cycleId: string): Promise<Record<string, unknown>> {
  const id = cycleId.trim();
  if (!id) throw new Error('SARA_CYCLE_ID_REQUIRED');
  return (await saraRequest('/v1/trace/' + encodeURIComponent(id), {
    correlationId: id,
  })) as Record<string, unknown>;
}

export type SaraHortaCoreProposal = {
  name?: string;
  description: string;
  license?: string;
} & Record<string, unknown>;

export type SaraHortaCoreAssessment = {
  request_id: string;
  correlation_id: string;
  operation: 'hortacore_assess';
  authority: 'AeternumChimeraBridge';
  assessment: Record<string, unknown>;
} & Record<string, unknown>;

export async function saraHortaCoreAssess(
  proposal: SaraHortaCoreProposal,
  correlationId?: string,
): Promise<SaraHortaCoreAssessment> {
  if (!proposal || typeof proposal.description !== 'string' || !proposal.description.trim()) {
    throw new Error('SARA_HORTACORE_PROPOSAL_REQUIRED');
  }
  return (await saraRequest('/v1/hortacore/assess', {
    method: 'POST',
    body: { proposal },
    correlationId,
  })) as SaraHortaCoreAssessment;
}