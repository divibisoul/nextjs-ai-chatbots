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
    if (!payload?.cycle_id || typeof payload?.result?.final_state !== 'string') {
      throw new Error('SARA_INVALID_CYCLE_RESPONSE');
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}
