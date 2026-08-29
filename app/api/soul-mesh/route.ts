import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { handleMeshMessage } from '@/lib/soul-mesh/endpoint';
import { createNucleus04MeshHandlers } from '@/lib/soul-core/Nucleus04MeshRuntime';
import { verifySoulMeshMessage } from '@/lib/soul-mesh/SoulMeshHmac';

function authDisabled() { return process.env.MESH_AUTH_DISABLED === 'true'; }
function authorizationState(request: Request): 'authorized' | 'unauthorized' | 'misconfigured' {
  if (authDisabled()) return 'authorized';
  const token = process.env.SOUL_MESH_TOKEN?.trim();
  if (!token) return 'misconfigured';
  return request.headers.get('authorization') === `Bearer ${token}` ? 'authorized' : 'unauthorized';
}
function hmacAuthorized(request: Request, message: SoulMeshMessage): boolean {
  if (authDisabled()) return true;
  const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim();
  if (!secret) return true;
  return verifySoulMeshMessage(message, secret, request.headers.get('x-soul-mesh-nonce') ?? '', request.headers.get('x-soul-mesh-hmac') ?? '');
}

export async function POST(request: Request) {
  const authorization = authorizationState(request);
  if (authorization === 'misconfigured') return NextResponse.json({ error: 'SOUL_MESH_TOKEN_NOT_CONFIGURED' }, { status: 503 });
  if (authorization === 'unauthorized') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  let message: SoulMeshMessage;
  try { message = (await request.json()) as SoulMeshMessage; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  if (!hmacAuthorized(request, message)) return NextResponse.json({ error: 'INVALID_MESH_HMAC' }, { status: 401 });
  try {
    const session = await auth();
    const handlers = createNucleus04MeshHandlers({ session });
    const result = await handleMeshMessage(message, handlers);
    return NextResponse.json(result, { status: result.kind === 'error' ? 502 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'SOUL_MESH_ERROR' }, { status: 400 });
  }
}
