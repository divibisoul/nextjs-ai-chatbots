import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { createN04MeshHandler } from '@/lib/soul-mesh/endpoint';
import {
  signSoulMeshResponse,
  verifySoulMeshRequest,
} from '@/lib/soul-mesh/SoulMeshHmac';

type MeshAuthorization = 'hmac' | 'bearer' | 'unauthorized' | 'misconfigured';

function authorizationState(
  request: Request,
  message: SoulMeshMessage,
): MeshAuthorization {
  const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim();
  const nonce = request.headers.get('x-soul-mesh-nonce')?.trim() ?? '';
  const signature = request.headers.get('x-soul-mesh-hmac')?.trim() ?? '';

  if (secret && nonce && signature) {
    return verifySoulMeshRequest(message, secret, nonce, signature)
      ? 'hmac'
      : 'unauthorized';
  }

  const token = process.env.SOUL_MESH_TOKEN?.trim();
  if (!token) {
    return process.env.NODE_ENV === 'production' ? 'misconfigured' : 'bearer';
  }

  return request.headers.get('authorization') === `Bearer ${token}`
    ? 'bearer'
    : 'unauthorized';
}

function createMeshDataStream(): UIMessageStreamWriter<ChatMessage> {
  return { write: () => undefined } as unknown as UIMessageStreamWriter<ChatMessage>;
}

function meshResponse(
  message: SoulMeshMessage,
  payload: unknown,
  kind: 'response' | 'error' = 'response',
): SoulMeshMessage {
  const base: SoulMeshMessage = {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id: crypto.randomUUID(),
    correlationId: message.correlationId,
    source: 'N04',
    target: message.source,
    kind,
    capability: message.capability,
    payload,
    timestamp: Date.now(),
  };

  const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim();
  if (!secret) return base;

  const signed = signSoulMeshResponse(message, payload, kind, secret);
  return {
    ...signed.message,
    nonce: signed.nonce,
    hmac: signed.hmac,
    meta: { ...signed.message.meta, nonce: signed.nonce },
  };
}

function discoveryPayload(message: SoulMeshMessage) {
  const capabilities = [
    'ai-pilot',
    'tool-execution',
    'artifact-processing',
    'document-processing',
    'context-orchestration',
    'streaming',
    'mesh-communication',
    'tool.run',
    'document.create',
    'document.edit',
  ];

  return {
    nucleus: 'N04',
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    status: 'online',
    declaredCapabilities: capabilities,
    executableCapabilities: capabilities,
    peers: ['N01', 'N02', 'N03', 'N05', 'N06', 'N07'],
    transports: ['http'],
    source: message.source,
  };
}

export async function POST(request: Request) {
  let message: SoulMeshMessage;
  try {
    message = (await request.json()) as SoulMeshMessage;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const authorization = authorizationState(request, message);
  if (authorization === 'misconfigured') {
    return NextResponse.json(
      { error: 'SOUL_MESH_AUTH_NOT_CONFIGURED' },
      { status: 503 },
    );
  }
  if (authorization === 'unauthorized') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const capability = message.capability?.trim() ?? '';

    if (
      message.kind === 'request' &&
      (capability === 'mesh.ping' || capability === 'mesh.health')
    ) {
      return NextResponse.json(
        meshResponse(message, {
          ok: true,
          nucleus: 'N04',
          handler: capability,
          processedAt: Date.now(),
        }),
        { status: 200 },
      );
    }

    if (message.kind === 'request' && capability === 'mesh.describe') {
      return NextResponse.json(
        meshResponse(message, discoveryPayload(message)),
        { status: 200 },
      );
    }

    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'UNAUTHENTICATED_SESSION', capability },
        { status: 401 },
      );
    }

    const handleMeshMessage = createN04MeshHandler({
      session,
      dataStream: createMeshDataStream(),
    });
    const result = await handleMeshMessage(message);
    return NextResponse.json(result, {
      status: result.kind === 'error' ? 502 : 200,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SOUL_MESH_ERROR' },
      { status: 400 },
    );
  }
}
