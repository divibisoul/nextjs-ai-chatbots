import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { handleMeshMessage } from '@/lib/soul-mesh/endpoint';
import { createNucleus04MeshHandlers } from '@/lib/soul-core/Nucleus04MeshRuntime';

function authorizationState(request: Request): 'authorized' | 'unauthorized' | 'misconfigured' {
  const token = process.env.SOUL_MESH_TOKEN?.trim();
  if (!token) return process.env.NODE_ENV === 'production' ? 'misconfigured' : 'authorized';
  return request.headers.get('authorization') === `Bearer ${token}` ? 'authorized' : 'unauthorized';
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
    const handlers = createNucleus04MeshHandlers({ session });
    const result = await handleMeshMessage(message, handlers);
    return NextResponse.json(result, { status: result.kind === 'error' ? 502 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'SOUL_MESH_ERROR' }, { status: 400 });
  }
}
