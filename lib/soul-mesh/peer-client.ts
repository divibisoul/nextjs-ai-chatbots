import { randomUUID } from 'crypto';
import { createSoulMeshNonce, signSoulMeshRequest, verifySoulMeshResponse } from './SoulMeshHmac';
import type { SoulMeshMessage } from './SoulMeshProtocol';

export const NUCLEUS_ID = 'N04' as const;
export const PEERS = ['N01', 'N02', 'N03', 'N05', 'N06', 'N07'] as const;
export type N04Peer = (typeof PEERS)[number];

function peerUrl(target: N04Peer): string | undefined {
  const value = process.env[`SOUL_MESH_${target}_URL`]?.trim();
  if (!value || /^(undefined|null)$/i.test(value)) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value.replace(/\/$/, '') : undefined;
  } catch {
    return undefined;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function retryableError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    error instanceof TypeError
  );
}

function assertResponse(
  request: SoulMeshMessage,
  response: unknown,
): asserts response is SoulMeshMessage {
  if (!response || typeof response !== 'object') {
    throw new Error('SOUL_MESH_INVALID_RESPONSE');
  }
  const candidate = response as SoulMeshMessage;
  if (candidate.protocol !== request.protocol) {
    throw new Error('SOUL_MESH_PROTOCOL_MISMATCH');
  }
  if (candidate.contractVersion !== request.contractVersion) {
    throw new Error('SOUL_MESH_CONTRACT_MISMATCH');
  }
  if (candidate.correlationId !== request.correlationId) {
    throw new Error('SOUL_MESH_CORRELATION_MISMATCH');
  }
  if (candidate.source !== request.target || candidate.target !== request.source) {
    throw new Error('SOUL_MESH_ROUTE_MISMATCH');
  }
  if (candidate.kind !== 'response' && candidate.kind !== 'error') {
    throw new Error('SOUL_MESH_INVALID_RESPONSE_KIND');
  }
}

async function attempt(
  url: string,
  message: SoulMeshMessage,
  timeoutMs: number,
): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const token = process.env.SOUL_MESH_TOKEN?.trim();
    const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim();
    const nonce = String(message.meta?.nonce ?? '');
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-soul-correlation-id': message.correlationId,
    };

    if (secret && nonce) {
      if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('SOUL_MESH_HMAC_SECRET_TOO_SHORT');
      headers['x-soul-mesh-nonce'] = nonce;
      headers['x-soul-mesh-hmac'] = signSoulMeshRequest(message, secret, nonce);
    } else if (token) {
      headers.authorization = `Bearer ${token}`;
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error(`SOUL_MESH_AUTH_NOT_CONFIGURED:${message.target}`);
    }

    const response = await fetch(`${url.replace(/\/$/, '')}/api/soul-mesh`, {
      method: 'POST',
      headers,
      body: JSON.stringify(message),
      signal: controller.signal,
      cache: 'no-store',
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

const RETRY_SAFE_CAPABILITIES = new Set([
  'mesh.ping',
  'mesh.describe',
  'capability.list',
  'mesh.handshake',
  'sara.health',
  'sara.state',
  'sara.capabilities',
  'sara.trace',
]);

async function dispatchWithRetry(
  url: string,
  message: SoulMeshMessage,
  timeoutMs: number,
  maxAttempts: number,
): Promise<SoulMeshMessage> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('SOUL_MESH_INVALID_TIMEOUT');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw new Error('SOUL_MESH_INVALID_ATTEMPTS');
  const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim();
  const token = process.env.SOUL_MESH_TOKEN?.trim();
  if (secret && Buffer.byteLength(secret, 'utf8') < 32) throw new Error('SOUL_MESH_HMAC_SECRET_TOO_SHORT');
  if (!secret && !token && process.env.NODE_ENV === 'production') {
    throw new Error(`SOUL_MESH_AUTH_NOT_CONFIGURED:${message.target}`);
  }

  // Only read-only diagnostics are eligible for retries. Application/provider calls
  // are attempted once to avoid duplicate side effects when a response is lost.
  const attempts = RETRY_SAFE_CAPABILITIES.has(message.capability) ? maxAttempts : 1;
  let lastError: unknown;
  for (let attemptNumber = 1; attemptNumber <= attempts; attemptNumber += 1) {
    const nonce = secret ? createSoulMeshNonce() : '';
    const meta = { ...(message.meta ?? {}) } as Record<string, unknown>;
    delete meta.nonce;
    if (nonce) meta.nonce = nonce;
    const attemptMessage: SoulMeshMessage = {
      ...message,
      timestamp: Date.now(),
      ...(nonce ? { nonce } : {}),
      meta,
    };

    try {
      const { response, body } = await attempt(url, attemptMessage, timeoutMs);
      assertResponse(attemptMessage, body);
      const secretNow = process.env.SOUL_MESH_HMAC_SECRET?.trim();
      if (secretNow) {
        verifySoulMeshResponse(
          attemptMessage,
          body,
          secretNow,
          String(body.nonce ?? ''),
          String(body.hmac ?? ''),
        );
      }

      // Authenticate the envelope before acting on HTTP status or remote-error details.
      if (!response.ok) {
        if (attemptNumber < attempts && isRetryableStatus(response.status)) {
          await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** (attemptNumber - 1)));
          continue;
        }
        throw new Error(`SOUL_MESH_REMOTE_ERROR:${message.target}:${response.status}`);
      }
      if (body.kind === 'error') throw new Error(`SOUL_MESH_REMOTE_ERROR:${message.target}`);
      return body;
    } catch (error) {
      lastError = error;
      if (attemptNumber < attempts && retryableError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** (attemptNumber - 1)));
        continue;
      }
      break;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`SOUL_MESH_REQUEST_FAILED:${message.target}`);
}

export async function sendTo(
  target: N04Peer,
  capability: string,
  payload: unknown,
  timeoutMs = 15000,
  maxAttempts = 2,
): Promise<SoulMeshMessage> {
  const url = peerUrl(target);
  if (!url) throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);
  if (!capability.trim()) throw new Error('SOUL_MESH_CAPABILITY_REQUIRED');
  const correlationId = randomUUID();
  const message: SoulMeshMessage = {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id: randomUUID(),
    correlationId,
    source: NUCLEUS_ID,
    target,
    kind: 'request',
    capability,
    payload,
    timestamp: Date.now(),
    meta: {
      runtime: 'nextjs-ai-chatbots',
      transport: 'HTTP',
      encoding: 'json',
      version: '1.1.0',
      traceId: correlationId,
    },
  };
  return dispatchWithRetry(url, message, timeoutMs, maxAttempts);
}

export async function sendToWithCorrelation(
  target: N04Peer,
  capability: string,
  payload: unknown,
  correlationId: string,
  traceId = correlationId,
  timeoutMs = 15000,
  maxAttempts = 2,
): Promise<SoulMeshMessage> {
  const url = peerUrl(target);
  if (!url) throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);
  if (!capability.trim()) throw new Error('SOUL_MESH_CAPABILITY_REQUIRED');
  if (!correlationId.trim()) throw new Error('SOUL_MESH_CORRELATION_REQUIRED');
  const resolvedCorrelation = correlationId.trim();
  const message: SoulMeshMessage = {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id: randomUUID(),
    correlationId: resolvedCorrelation,
    source: NUCLEUS_ID,
    target,
    kind: 'request',
    capability,
    payload,
    timestamp: Date.now(),
    meta: {
      runtime: 'nextjs-ai-chatbots',
      transport: 'HTTP',
      encoding: 'json',
      version: '1.1.0',
      traceId: traceId.trim() || resolvedCorrelation,
    },
  };
  return dispatchWithRetry(url, message, timeoutMs, maxAttempts);
}

export async function executePublicCapability(
  provider:
    | 'bijux-dag-runtime' | 'ouro-loop' | 'recuris' | 'fedml' | 'hivemind'
    | 'temporal' | 'hora-graph-core' | 'cognitive-workspace' | 'ravana' | 'ray' | 'nats-go',
  operation: string,
  payload: unknown,
  correlationId = randomUUID(),
  timeoutMs = 60000,
): Promise<SoulMeshMessage> {
  const normalizedOperation = operation.trim();
  if (!normalizedOperation) throw new Error('PUBLIC_CAPABILITY_OPERATION_REQUIRED');
  return sendToWithCorrelation(
    'N07',
    `external.${provider}.execute@1.0.0`,
    { payload, metadata: { provider, external_operation: normalizedOperation } },
    correlationId,
    correlationId,
    timeoutMs,
    2,
  );
}

export const N04_OUT_CHANNELS = PEERS.map((peer) => `N04.OUT.${peer}`);
export const N04_IN_CHANNELS = PEERS.map((peer) => `N04.IN.${peer}`);
