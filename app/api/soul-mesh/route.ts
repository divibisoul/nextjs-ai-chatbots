import { geminiSkillsConfigured } from '@/lib/soul-mesh/GeminiSkillsCatalog';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import type { Session } from 'next-auth';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { createN04MeshHandler } from '@/lib/soul-mesh/endpoint';
import { N04_RESIDENT_AGENT } from '@/lib/soul-mesh/N04ResidentAgent';
import { describeBrowserUseAdapter } from '@/lib/soul-core/BrowserUseAdapter';
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
    'gemini.skills.list',
    'gemini.skills.describe',
    'ai-pilot',
    'tool-execution',
    'artifact-processing',
    'document-processing',
    'context-orchestration',
    'streaming',
    'mesh-communication',
    'core.health',
    'tool.run',
    'document.create',
    'document.edit',
    'artifact.analyze',
    'batch.process',
    'parallel.map',
    'workflow.execute',
    'schedule.task',
    'mesh.resident.describe@1.0.0',
    'browser.automation.browser-use@1.0.0',
  ];

  const browserUse = describeBrowserUseAdapter();
  return {
    nucleus: 'N04',
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    status: 'online',
    declaredCapabilities: capabilities,
    executableCapabilities: [
      ...capabilities.filter((capability) => capability !== 'gemini.skills.list' && capability !== 'gemini.skills.describe' && capability !== 'browser.automation.browser-use@1.0.0'),
      ...(geminiSkillsConfigured() ? ['gemini.skills.list', 'gemini.skills.describe'] : []),
      ...(browserUse.state === 'PASS' ? ['browser.automation.browser-use@1.0.0'] : []),
    ],
    peers: ['N01', 'N02', 'N03', 'N05', 'N06', 'N07'],
    transports: ['http'],
    source: message.source,
    residentAgent: N04_RESIDENT_AGENT,
    browserUse,
  };
}

export async function POST(request: Request) {
  let message: SoulMeshMessage;
  let raw: string;
  try {
    raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'SOUL_MESH_PAYLOAD_TOO_LARGE' }, { status: 413 });
    }
    message = JSON.parse(raw) as SoulMeshMessage;
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

    if (message.kind === 'request' && capability === 'mesh.resident.describe@1.0.0') {
      return NextResponse.json(meshResponse(message, N04_RESIDENT_AGENT), { status: 200 });
    }

    if (
      message.kind === 'request' &&
      (capability === 'mesh.ping' ||
        capability === 'mesh.health' ||
        capability === 'core.health')
    ) {
      return NextResponse.json(
        meshResponse(message, {
          ok: true,
          nucleus: 'N04',
          handler: capability,
          processedAt: Date.now(),
          runtime: 'nextjs-ai-chatbots',
          contractVersion: '1.1.0',
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

    const meshM2MSafe = capability === 'context-orchestration';
    let session: Session | undefined;

    if (!meshM2MSafe) {
      session = await auth();
      if (!session) {
        return NextResponse.json(
          { error: 'UNAUTHENTICATED_SESSION', capability },
          { status: 401 },
        );
      }
    } else if (authorization !== 'hmac') {
      return NextResponse.json(
        { error: 'MESH_M2M_REQUIRES_HMAC', capability },
        { status: 403 },
      );
    }

    const machineSession = session ?? ({
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      user: {
        id: `mesh:${message.source}`,
        name: 'SOUL Mesh machine principal',
        email: null,
        image: null,
        type: 'guest',
      },
    } as Session);

    const handleMeshMessage = createN04MeshHandler({
      session: machineSession,
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
