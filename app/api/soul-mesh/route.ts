import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { createN04MeshHandler } from '@/lib/soul-mesh/endpoint';

function authorizationState(request: Request): 'authorized' | 'unauthorized' | 'misconfigured' {
  const token = process.env.SOUL_MESH_TOKEN?.trim();
  if (!token) return process.env.NODE_ENV === 'production' ? 'misconfigured' : 'authorized';
  return request.headers.get('authorization') === `Bearer ${token}` ? 'authorized' : 'unauthorized';
}

function createMeshDataStream(): UIMessageStreamWriter<ChatMessage> {
  return { write: () => undefined } as unknown as UIMessageStreamWriter<ChatMessage>;
}

export async function POST(request: Request) {
  const authorization = authorizationState(request);
  if (authorization === 'misconfigured') return NextResponse.json({ error: 'SOUL_MESH_TOKEN_NOT_CONFIGURED' }, { status: 503 });
  if (authorization === 'unauthorized') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let message: SoulMeshMessage;
  try { message = (await request.json()) as SoulMeshMessage; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

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
