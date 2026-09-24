import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import type { SoulMeshMessage } from './SoulMeshProtocol';

export const NUCLEUS_ID = 'N04' as const;
export const PEERS = ['N01', 'N02', 'N03', 'N05', 'N06', 'N07'] as const;
export type N04Peer = (typeof PEERS)[number];
export type SuperGPUTask = { id?: string; capability: string; payload: Record<string, unknown>; required?: boolean; timeout_ms?: number };
const urls: Record<N04Peer, string | undefined> = { N01: process.env.SOUL_MESH_N01_URL, N02: process.env.SOUL_MESH_N02_URL, N03: process.env.SOUL_MESH_N03_URL, N05: process.env.SOUL_MESH_N05_URL, N06: process.env.SOUL_MESH_N06_URL, N07: process.env.SOUL_MESH_N07_URL };
function isRetryableStatus(status: number): boolean { return status === 408 || status === 425 || status === 429 || status >= 500; }
function retryableError(error: unknown): boolean { return (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') || error instanceof TypeError; }
function assertResponse(request: SoulMeshMessage, response: unknown): asserts response is SoulMeshMessage { if (!response || typeof response !== 'object') throw new Error('SOUL_MESH_INVALID_RESPONSE'); const candidate = response as SoulMeshMessage; if (candidate.protocol !== request.protocol) throw new Error('SOUL_MESH_PROTOCOL_MISMATCH'); if (candidate.contractVersion !== request.contractVersion) throw new Error('SOUL_MESH_CONTRACT_MISMATCH'); if (candidate.correlationId !== request.correlationId) throw new Error('SOUL_MESH_CORRELATION_MISMATCH'); if (candidate.source !== request.target || candidate.target !== request.source) throw new Error('SOUL_MESH_ROUTE_MISMATCH'); if (candidate.kind !== 'response' && candidate.kind !== 'error') throw new Error('SOUL_MESH_INVALID_RESPONSE_KIND'); }
function headerCanonical(message: SoulMeshMessage, nonce: string) { return JSON.stringify({ protocol: message.protocol, contractVersion: message.contractVersion, id: message.id, correlationId: message.correlationId, source: message.source, target: message.target, kind: message.kind, capability: message.capability ?? null, payload: message.payload, timestamp: message.timestamp, transport: message.meta?.transport ?? null, meta: message.meta ?? null, nonce }); }
function hmacFor(message: SoulMeshMessage, nonce: string, secret: string) { return createHmac('sha256', secret).update(headerCanonical(message, nonce), 'utf8').digest('hex'); }
async function attempt(url: string, message: SoulMeshMessage, timeoutMs: number): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim();
    const headers: Record<string, string> = { 'content-type': 'application/json', ...(process.env.SOUL_MESH_TOKEN?.trim() ? { authorization: `Bearer ${process.env.SOUL_MESH_TOKEN.trim()}` } : {}) };
    if (secret) {
      const nonce = message.meta?.nonce?.trim();
      if (!nonce) throw new Error('SOUL_MESH_NONCE_REQUIRED');
      headers['x-soul-mesh-nonce'] = nonce;
      headers['x-soul-mesh-hmac'] = hmacFor(message, nonce, secret);
    }
    const response = await fetch(`${url.replace(/\/$/, '')}/api/soul-mesh`, { method: 'POST', headers, body: JSON.stringify(message), signal: controller.signal, cache: 'no-store' });
    let body: unknown;
    try { body = await response.json(); } catch { body = undefined; }
    return { response, body };
  } finally { clearTimeout(timer); }
}
export async function sendTo(target: N04Peer, capability: string, payload: unknown, timeoutMs = 15000, maxAttempts = 2): Promise<SoulMeshMessage> {
  const url = urls[target]; if (!url) throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);
  if (!capability.trim()) throw new Error('SOUL_MESH_CAPABILITY_REQUIRED');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('SOUL_MESH_INVALID_TIMEOUT');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw new Error('SOUL_MESH_INVALID_ATTEMPTS');
  const correlationId = randomUUID();
  const message: SoulMeshMessage = { protocol: 'soul-mesh/1', contractVersion: '1.1.0', id: randomUUID(), correlationId, source: NUCLEUS_ID, target, kind: 'request', capability, payload, timestamp: Date.now(), meta: { runtime: 'nextjs-ai-chatbots', transport: 'HTTP', encoding: 'json', version: '1.1.0', nonce: randomUUID().replaceAll('-', '').padEnd(32, '0').slice(0, 32), traceId: correlationId } };
  let lastError: unknown;
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    try {
      const { response, body } = await attempt(url, message, timeoutMs);
      if (!response.ok) {
        if (attemptNumber < maxAttempts && isRetryableStatus(response.status)) { await new Promise(resolve => setTimeout(resolve, 150 * 2 ** (attemptNumber - 1))); continue; }
        throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}:${response.status}`);
      }
      assertResponse(message, body);
      if (body.kind === 'error') throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}`);
      return body;
    } catch (error) {
      lastError = error;
      if (attemptNumber < maxAttempts && retryableError(error)) await new Promise(resolve => setTimeout(resolve, 150 * 2 ** (attemptNumber - 1)));
      else break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`SOUL_MESH_REQUEST_FAILED:${target}`);
}
export async function superGPUExecute(values: number[], operation = 'identity', device?: string, timeoutMs = 15000) {
  if (!Array.isArray(values) || values.length === 0 || values.some(value => !Number.isFinite(value))) throw new Error('SUPERGPU_VALUES_INVALID');
  const metadata: Record<string, string> = { operation, nucleus: NUCLEUS_ID };
  if (device?.trim()) metadata.device = device.trim();
  return (await sendTo('N07', 'supergpu.execute', { payload: { values }, metadata }, timeoutMs, 2)).payload;
}
export async function superGPUParallel(tasks: SuperGPUTask[], timeoutMs = 30000) {
  if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('SUPERGPU_TASKS_REQUIRED');
  return (await sendTo('N07', 'supergpu.parallel', { payload: { tasks } }, timeoutMs, 2)).payload;
}
export const N04_OUT_CHANNELS = PEERS.map(peer => `N04.OUT.${peer}`);
export const N04_IN_CHANNELS = PEERS.map(peer => `N04.IN.${peer}`);