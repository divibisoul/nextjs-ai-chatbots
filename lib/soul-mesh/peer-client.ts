import { randomUUID } from 'crypto';
import type { SoulMeshMessage } from './SoulMeshProtocol';
import { createSoulMeshNonce, signSoulMeshMessage } from './SoulMeshHmac';

export const NUCLEUS_ID = 'N04' as const;
export const PEERS = ['N01', 'N02', 'N03', 'N05', 'N06'] as const;
export type N04Peer = (typeof PEERS)[number];

const URL_ENV: Record<N04Peer, string> = { N01: 'SOUL_MESH_N01_URL', N02: 'SOUL_MESH_N02_URL', N03: 'SOUL_MESH_N03_URL', N05: 'SOUL_MESH_N05_URL', N06: 'SOUL_MESH_N06_URL' };
const TOKEN_ENV: Record<N04Peer, string> = { N01: 'SOUL_MESH_N01_TOKEN', N02: 'SOUL_MESH_N02_TOKEN', N03: 'SOUL_MESH_N03_TOKEN', N05: 'SOUL_MESH_N05_TOKEN', N06: 'SOUL_MESH_N06_TOKEN' };

function peerUrl(target: N04Peer): string | undefined { return process.env[URL_ENV[target]] || process.env.SOUL_MESH_URL_DEFAULT; }
function peerToken(target: N04Peer): string | undefined { return process.env[TOKEN_ENV[target]] || process.env.SOUL_MESH_TOKEN; }

function assertResponse(request: SoulMeshMessage, response: unknown): asserts response is SoulMeshMessage {
  if (!response || typeof response !== 'object') throw new Error('SOUL_MESH_INVALID_RESPONSE');
  const candidate = response as SoulMeshMessage;
  if (candidate.protocol !== request.protocol) throw new Error('SOUL_MESH_PROTOCOL_MISMATCH');
  if (candidate.correlationId !== request.correlationId) throw new Error('SOUL_MESH_CORRELATION_MISMATCH');
  if (candidate.source !== request.target || candidate.target !== request.source) throw new Error('SOUL_MESH_ROUTE_MISMATCH');
  if (candidate.kind !== 'response' && candidate.kind !== 'error') throw new Error('SOUL_MESH_INVALID_RESPONSE_KIND');
}

function retryable(status: number): boolean { return status === 408 || status === 425 || status === 429 || status >= 500; }
function retryDelay(attemptNumber: number): number { return 150 * 2 ** Math.max(0, attemptNumber - 1) + Math.floor(Math.random() * 50); }

async function attempt(target: N04Peer, url: string, message: SoulMeshMessage, timeoutMs: number): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const token = peerToken(target);
    const secret = process.env.SOUL_MESH_HMAC_SECRET;
    const nonce = secret ? createSoulMeshNonce() : '';
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-soul-nucleus': NUCLEUS_ID,
      'x-soul-target': target,
    };
    if (secret) {
      headers['x-soul-mesh-nonce'] = nonce;
      headers['x-soul-mesh-hmac'] = signSoulMeshMessage(message, secret, nonce);
    }
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(message), signal: controller.signal });
    let body: unknown;
    try { body = await response.json(); } catch { throw new Error(`SOUL_MESH_INVALID_JSON:${response.status}`); }
    return { response, body };
  } finally { clearTimeout(timer); }
}

function shouldRetryNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  return error.name === 'AbortError' || error.message.startsWith('fetch failed') || error.message.startsWith('SOUL_MESH_INVALID_JSON:5');
}

export async function sendTo(target: N04Peer, capability: string, payload: unknown, timeoutMs = Number(process.env.SOUL_MESH_TIMEOUT_MS ?? 15000), maxAttempts = 2): Promise<SoulMeshMessage> {
  const url = peerUrl(target);
  if (!url) throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('SOUL_MESH_INVALID_TIMEOUT');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw new Error('SOUL_MESH_INVALID_ATTEMPTS');
  const message: SoulMeshMessage = { protocol: 'soul-mesh/1', id: randomUUID(), correlationId: randomUUID(), source: NUCLEUS_ID, target, kind: 'request', capability, payload, timestamp: Date.now() };
  let lastError: unknown;
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    try {
      const { response, body } = await attempt(target, url, message, timeoutMs);
      assertResponse(message, body);
      if (!response.ok || body.kind === 'error') {
        if (attemptNumber < maxAttempts && retryable(response.status)) { await new Promise((resolve) => setTimeout(resolve, retryDelay(attemptNumber))); continue; }
        throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}:${response.status}`);
      }
      return body;
    } catch (error) {
      lastError = error;
      if (attemptNumber >= maxAttempts || !shouldRetryNetworkError(error)) throw error instanceof Error ? error : new Error(`SOUL_MESH_REQUEST_FAILED:${target}`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attemptNumber)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`SOUL_MESH_REQUEST_FAILED:${target}`);
}

export const N04_OUT_CHANNELS = PEERS.map((peer) => `N04.OUT.${peer}`);
export const N04_IN_CHANNELS = PEERS.map((peer) => `N04.IN.${peer}`);
