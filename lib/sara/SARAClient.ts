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
  const parts = Array.isArray((message as any)?.parts) ? (message as any).parts : [];
  return parts
    .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
    .map((part: any) => part.text)
    .join('\n')
    .trim();
}

export async function saraCycle(input: string, cycleId?: string) {
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
      body: JSON.stringify({ input, cycle_id: cycleId }),
      signal: controller.signal,
      cache: 'no-store',
    });

    let payload: any = null;
    try { payload = await response.json(); } catch { payload = null; }

    if (!response.ok) {
      const detail = payload?.error?.message ?? payload?.error ?? ('HTTP_' + response.status);
      throw new Error('SARA_HTTP_' + response.status + ':' + detail);
    }
    if (!payload?.cycle_id || typeof payload?.final_state !== 'string') {
      throw new Error('SARA_INVALID_CYCLE_RESPONSE');
    }
    return payload;
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

export async function saraAudit(input: string, correlationId?: string): Promise<Record<string, unknown>> {
  if (!input.trim()) throw new Error('SARA_INPUT_REQUIRED');
  return (await saraRequest('/v1/audit', {
    method: 'POST',
    body: { input },
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
