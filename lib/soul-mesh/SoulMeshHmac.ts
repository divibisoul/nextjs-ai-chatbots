import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { SoulMeshMessage } from './SoulMeshProtocol';

const MAX_CLOCK_SKEW_MS = 30_000;

function canonicalEnvelope(message: SoulMeshMessage, nonce: string): string {
  return JSON.stringify({
    protocol: message.protocol,
    contractVersion: message.contractVersion,
    id: message.id,
    correlationId: message.correlationId,
    source: message.source,
    target: message.target,
    kind: message.kind,
    capability: message.capability ?? null,
    payload: message.payload,
    timestamp: message.timestamp,
    meta: message.meta ?? null,
    nonce,
  });
}

export function createSoulMeshNonce(): string {
  return randomBytes(24).toString('base64url');
}

function digest(value: string, secret: string): string {
  if (!secret || secret.length < 16) {
    throw new Error('SOUL_MESH_HMAC_SECRET_INVALID');
  }
  return createHmac('sha256', secret).update(value, 'utf8').digest('hex');
}

function safeEqual(expectedHex: string, actualHex: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(actualHex)) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(actualHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function signSoulMeshRequest(
  message: SoulMeshMessage,
  secret: string,
  nonce: string,
): string {
  if (!nonce) throw new Error('SOUL_MESH_NONCE_REQUIRED');
  return digest(canonicalEnvelope(message, nonce), secret);
}

export function verifySoulMeshRequest(
  message: SoulMeshMessage,
  secret: string,
  nonce: string,
  hmacValue: string,
  now = Date.now(),
): boolean {
  if (!secret || !nonce || !hmacValue || !Number.isFinite(message.timestamp)) {
    return false;
  }
  if (message.nonce && message.nonce !== nonce) return false;
  if (Math.abs(now - message.timestamp) > MAX_CLOCK_SKEW_MS) return false;
  try {
    const expected = signSoulMeshRequest(message, secret, nonce);
    return safeEqual(expected, hmacValue);
  } catch {
    return false;
  }
}

export function signSoulMeshResponse(
  request: SoulMeshMessage,
  payload: unknown,
  kind: 'response' | 'error',
  secret: string,
): { message: SoulMeshMessage; nonce: string; hmac: string } {
  const nonce = createSoulMeshNonce();
  const message: SoulMeshMessage = {
    protocol: request.protocol,
    contractVersion: request.contractVersion,
    id: randomBytes(16).toString('hex'),
    correlationId: request.correlationId,
    source: request.target,
    target: request.source,
    kind,
    capability: request.capability,
    payload,
    timestamp: Date.now(),
    meta: {
      runtime: 'nextjs-ai-chatbots',
      transport: 'HTTP',
      encoding: 'json',
      version: request.contractVersion,
      nonce,
      traceId: request.meta?.traceId ?? request.correlationId,
    },
  };
  const hmac = digest(canonicalEnvelope(message, nonce), secret);
  return { message, nonce, hmac };
}

export function verifySoulMeshResponse(
  request: SoulMeshMessage,
  response: SoulMeshMessage & { nonce?: string; hmac?: string },
  secret: string,
  nonce: string,
  hmacValue: string,
  now = Date.now(),
): boolean {
  if (!secret || !nonce || !hmacValue) return false;
  if (response.correlationId !== request.correlationId) return false;
  if (response.source !== request.target || response.target !== request.source) return false;
  if (response.kind !== 'response' && response.kind !== 'error') return false;
  if (!Number.isFinite(response.timestamp)) return false;
  if (Math.abs(now - response.timestamp) > MAX_CLOCK_SKEW_MS) return false;
  try {
    return safeEqual(digest(canonicalLegacyResponse(response, nonce), secret), hmacValue);
  } catch {
    return false;
  }
}

export function verifySoulMeshMessage(
  message: SoulMeshMessage,
  secret: string,
  nonce: string,
  hmacValue: string,
  now = Date.now(),
): boolean {
  return verifySoulMeshRequest(message, secret, nonce, hmacValue, now);
}
