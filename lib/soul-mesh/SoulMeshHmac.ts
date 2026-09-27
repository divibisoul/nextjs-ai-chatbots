import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { SoulMeshMessage } from './SoulMeshProtocol';

const MAX_CLOCK_SKEW_MS = 30_000;

function canonicalN07Request(message: SoulMeshMessage, nonce: string): string {
  return JSON.stringify({
    protocol: message.protocol,
    contractVersion: message.contractVersion,
    id: message.id,
    correlationId: message.correlationId,
    source: message.source,
    target: message.target,
    kind: message.kind,
    capability: message.capability ?? '',
    payload: message.payload,
    timestamp: message.timestamp,
    transport: message.meta?.transport,
    meta: message.meta,
    nonce,
  });
}

function canonicalLegacyResponse(
  message: SoulMeshMessage,
  payload: unknown,
  kind: 'response' | 'error',
  nonce: string,
): string {
  return JSON.stringify({
    version: '1.0',
    contractVersion: message.contractVersion,
    messageId: message.id,
    source: message.target,
    target: message.source,
    timestamp: message.timestamp,
    nonce,
    correlationId: message.correlationId,
    type: kind === 'error' ? 'ERROR' : 'TASK_RESULT',
    payload: { capability: message.capability ?? '', payload },
  });
}

export function createSoulMeshNonce(): string {
  return randomBytes(24).toString('base64url');
}

function digest(value: string, secret: string): string {
  if (!secret || secret.length < 16) throw new Error('SOUL_MESH_HMAC_SECRET_INVALID');
  return createHmac('sha256', secret).update(value, 'utf8').digest('hex');
}

export function signSoulMeshRequest(message: SoulMeshMessage, secret: string, nonce: string): string {
  if (!nonce) throw new Error('SOUL_MESH_NONCE_REQUIRED');
  return digest(canonicalN07Request(message, nonce), secret);
}

export function verifySoulMeshRequest(
  message: SoulMeshMessage,
  secret: string,
  nonce: string,
  hmacValue: string,
  now = Date.now(),
): boolean {
  if (!secret || !nonce || !hmacValue || !Number.isFinite(message.timestamp)) return false;
  if (Math.abs(now - message.timestamp) > MAX_CLOCK_SKEW_MS) return false;
  const expected = signSoulMeshRequest(message, secret, nonce);
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hmacValue, 'hex'));
}

export function signSoulMeshResponse(
  request: SoulMeshMessage,
  payload: unknown,
  kind: 'response' | 'error',
  secret: string,
): { nonce: string; hmac: string } {
  const response: SoulMeshMessage = {
    ...request,
    id: request.id,
    source: request.target,
    target: request.source,
    kind,
    payload,
    timestamp: Date.now(),
    meta: { ...(request.meta ?? {}), traceId: request.meta?.traceId ?? request.correlationId },
  };
  const nonce = createSoulMeshNonce();
  return { nonce, hmac: digest(canonicalLegacyResponse(response, payload, kind, nonce), secret) };
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
