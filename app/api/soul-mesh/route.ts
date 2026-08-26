import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { isSoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { handleMeshMessage } from '@/lib/soul-mesh/endpoint';
import { createNucleus04MeshHandlers } from '@/lib/soul-core/Nucleus04MeshRuntime';

function authorized(request: Request): boolean {
  const token = process.env.SOUL_MESH_TOKEN;
  if (!token) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${token}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!isSoulMeshMessage(body)) return NextResponse.json({ error: 'INVALID_MESH_ENVELOPE' }, { status: 400 });

  try {
    const session = await auth();
    const handlers = createNucleus04MeshHandlers({ session });
    const result = await handleMeshMessage(body, handlers);
    return NextResponse.json(result, { status: result.kind === 'error' ? 502 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SOUL_MESH_ERROR';
    const status = message === 'WRONG_TARGET' || message === 'INVALID_NUCLEUS_ROUTE' || message === 'STALE_MESH_MESSAGE' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
