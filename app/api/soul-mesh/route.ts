import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { createN04MeshHandler } from '@/lib/soul-mesh/endpoint';
import { NUCLEUS_04_CAPABILITIES } from '@/lib/soul-core/Nucleus04Capabilities';
import { saraHortaCoreAssess } from '@/lib/sara/SARAClient';

const NUCLEUS_ID = 'N04' as const;
const PEERS = ['N01', 'N02', 'N03', 'N05', 'N06', 'N07'] as const;
const MAX_CLOCK_SKEW_MS = 30_000;
const REPLAY_WINDOW_MS = 5 * 60_000;
const seenHmacNonces = new Map<string, number>();

type WireMessage = SoulMeshMessage & { nonce?: string; hmac?: string };

function meshCanonical(message: SoulMeshMessage, nonce: string): string {
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
    transport: message.meta?.transport ?? null,
    meta: message.meta ?? null,
    nonce,
  });
}

function verifyMeshHmac(request: Request, message: WireMessage): boolean {
  const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim();
  if (!secret || !message.nonce || !message.hmac) return false;
  if (!Number.isFinite(message.timestamp) || Math.abs(Date.now() - message.timestamp) > MAX_CLOCK_SKEW_MS) return false;
  const headerNonce = request.headers.get('x-soul-mesh-nonce')?.trim();
  const headerHmac = request.headers.get('x-soul-mesh-hmac')?.trim();
  const nonce = headerNonce || message.nonce;
  const supplied = headerHmac || message.hmac;
  if (nonce !== message.nonce || !supplied || !/^[0-9a-f]{64}$/i.test(supplied)) return false;
  const key = `${message.source}:${nonce}`;
  const now = Date.now();
  for (const [seenKey, seenAt] of seenHmacNonces) if (now - seenAt > REPLAY_WINDOW_MS) seenHmacNonces.delete(seenKey);
  if (seenHmacNonces.has(key)) return false;
  const expected = createHmac('sha256', secret).update(meshCanonical(message, nonce), 'utf8').digest('hex');
  const actual = Buffer.from(supplied, 'hex');
  const wanted = Buffer.from(expected, 'hex');
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return false;
  seenHmacNonces.set(key, now);
  return true;
}

function authorizationState(request: Request, message: WireMessage): 'authorized' | 'unauthorized' | 'misconfigured' {
  if (process.env.SOUL_MESH_HMAC_SECRET?.trim()) return verifyMeshHmac(request, message) ? 'authorized' : 'unauthorized';
  const token = process.env.SOUL_MESH_TOKEN?.trim();
  if (!token) return process.env.NODE_ENV === 'production' ? 'misconfigured' : 'authorized';
  return request.headers.get('authorization') === `Bearer ${token}` ? 'authorized' : 'unauthorized';
}

function createMeshDataStream(): UIMessageStreamWriter<ChatMessage> {
  return { write: () => undefined } as unknown as UIMessageStreamWriter<ChatMessage>;
}

function sessionlessCapability(capability: string | undefined): boolean {
  return capability === 'mesh.handshake' || capability === 'mesh.ping' || capability === 'mesh.health' || capability === 'mesh.describe';
}

function discoveryResponse(message: SoulMeshMessage) {
  return {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id: crypto.randomUUID(),
    correlationId: message.correlationId,
    source: NUCLEUS_ID,
    target: message.source,
    kind: 'response' as const,
    capability: message.capability,
    payload: {
      nucleus: NUCLEUS_ID,
      peers: [...PEERS],
      status: 'online',
      declaredCapabilities: [...NUCLEUS_04_CAPABILITIES],
      federatedCapabilities: ['sara.hortacore.assess'],
      executableCapabilities: NUCLEUS_04_CAPABILITIES.filter(capability => capability !== 'ai-pilot'),
      transports: ['HTTP', 'REALTIME'],
      channels: { in: PEERS.map(peer => `N04.IN.${peer}`), out: PEERS.map(peer => `N04.OUT.${peer}`) },
    },
    timestamp: Date.now(),
    meta: { runtime: 'nextjs-ai-chatbots', transport: 'HTTP', encoding: 'json', version: '1.1.0', traceId: message.meta?.traceId ?? message.correlationId },
  };
}

export async function POST(request: Request) {
  let message: WireMessage;
  try { message = (await request.json()) as WireMessage; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

  if (!message || typeof message !== 'object') return NextResponse.json({ error: 'INVALID_MESH_MESSAGE' }, { status: 400 });

  const authorization = authorizationState(request, message);
  if (authorization === 'misconfigured') return NextResponse.json({ error: 'SOUL_MESH_TOKEN_NOT_CONFIGURED' }, { status: 503 });
  if (authorization === 'unauthorized') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  if (message.capability === 'sara.hortacore.assess') {
    const payload = message.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({
        protocol: 'soul-mesh/1', contractVersion: '1.1.0', id: crypto.randomUUID(),
        correlationId: message.correlationId, source: NUCLEUS_ID, target: message.source,
        kind: 'error', capability: message.capability,
        payload: { code: 'SARA_HORTACORE_PAYLOAD_INVALID' }, timestamp: Date.now(),
      }, { status: 422 });
    }
    const proposal = (payload as { proposal?: unknown }).proposal;
    if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
      return NextResponse.json({
        protocol: 'soul-mesh/1', contractVersion: '1.1.0', id: crypto.randomUUID(),
        correlationId: message.correlationId, source: NUCLEUS_ID, target: message.source,
        kind: 'error', capability: message.capability,
        payload: { code: 'SARA_HORTACORE_PROPOSAL_REQUIRED' }, timestamp: Date.now(),
      }, { status: 422 });
    }
    try {
      const assessment = await saraHortaCoreAssess(
        proposal as Parameters<typeof saraHortaCoreAssess>[0],
        message.correlationId,
      );
      return NextResponse.json({
        protocol: 'soul-mesh/1', contractVersion: '1.1.0', id: crypto.randomUUID(),
        correlationId: message.correlationId, source: NUCLEUS_ID, target: message.source,
        kind: 'response', capability: message.capability,
        payload: assessment, timestamp: Date.now(),
        meta: { runtime: 'nextjs-ai-chatbots', transport: 'HTTP', encoding: 'json', version: '1.1.0', traceId: message.meta?.traceId ?? message.correlationId },
      }, { status: 200 });
    } catch (error) {
      return NextResponse.json({
        protocol: 'soul-mesh/1', contractVersion: '1.1.0', id: crypto.randomUUID(),
        correlationId: message.correlationId, source: NUCLEUS_ID, target: message.source,
        kind: 'error', capability: message.capability,
        payload: { code: error instanceof Error ? error.message : 'SARA_HORTACORE_REQUEST_FAILED' },
        timestamp: Date.now(),
      }, { status: 502 });
    }
  }

  if (sessionlessCapability(message.capability)) {
    if (message.capability === 'mesh.describe' || message.capability === 'mesh.handshake') return NextResponse.json(discoveryResponse(message), { status: 200 });
    return NextResponse.json({
      protocol: 'soul-mesh/1', contractVersion: '1.1.0', id: crypto.randomUUID(), correlationId: message.correlationId,
      source: NUCLEUS_ID, target: message.source, kind: 'response', capability: message.capability,
      payload: { ok: true, nucleus: NUCLEUS_ID, handler: message.capability, processedAt: Date.now() }, timestamp: Date.now(),
    }, { status: 200 });
  }

  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'UNAUTHENTICATED_SESSION' }, { status: 401 });
    const handleMeshMessage = createN04MeshHandler({ session, dataStream: createMeshDataStream() });
    const result = await handleMeshMessage(message);
    return NextResponse.json(result, { status: result.kind === 'error' ? 502 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'SOUL_MESH_ERROR' }, { status: 400 });
  }
}