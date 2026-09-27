import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { createN04MeshHandler } from '@/lib/soul-mesh/endpoint';
import { verifySoulMeshRequest } from '@/lib/soul-mesh/SoulMeshHmac';

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

function discoveryResponse(message: SoulMeshMessage) {
  const capabilities = [
    'ai-pilot',
    'tool-execution',
    'artifact-processing',
    'document-processing',
    'context-orchestration',
    'streaming',
    'mesh-communication',
    'batch.process',
    'document.create',
    'document.edit',
    'artifact.analyze',
    'tool.run',
    'workflow.execute',
    'schedule.task',
    'parallel.map',
  ];

  return {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id: crypto.randomUUID(),
    correlationId: message.correlationId,
    source: 'N04',
    target: message.source,
    kind: 'response',
    capability: message.capability,
    payload: {
      nucleus: 'N04',
      protocol: 'soul-mesh/1',
      contractVersion: '1.1.0',
      status: 'online',
      declaredCapabilities: capabilities,
      executableCapabilities: capabilities.filter(
        capability => !['artifact.analyze', 'workflow.execute', 'schedule.task', 'parallel.map', 'batch.process'].includes(capability),
      ),
      peers: ['N01', 'N02', 'N03', 'N05', 'N06', 'N07'],
      transports: ['http'],
    },
    timestamp: Date.now(),
  } satisfies SoulMeshMessage;
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
    return NextResponse.json({ error: 'SOUL_MESH_AUTH_NOT_CONFIGURED' }, { status: 503 });
  }
  if (authorization === 'unauthorized') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const capability = message.capability?.trim() ?? '';
    if (message.kind === 'request' && ['mesh.ping', 'mesh.health'].includes(capability)) {
      return NextResponse.json(
        {
          ...discoveryResponse(message),
          payload: { ok: true, nucleus: 'N04', handler: capability, processedAt: Date.now() },
        },
        { status: 200 },
      );
    }

    if (message.kind === 'request' && capability === 'mesh.describe') {
      return NextResponse.json(discoveryResponse(message), { status: 200 });
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
