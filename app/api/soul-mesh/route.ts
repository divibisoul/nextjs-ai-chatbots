import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { handleMeshMessage } from '@/lib/soul-mesh/endpoint';
import { createNucleus04MeshHandlers } from '@/lib/soul-core/Nucleus04MeshRuntime';
import { verifySoulMeshMessage } from '@/lib/soul-mesh/SoulMeshHmac';

function authDisabled(): boolean {
  return process.env.MESH_AUTH_DISABLED === 'true';
}

function authorized(request: Request): boolean {
  if (authDisabled()) return true;
  const token = process.env.SOUL_MESH_TOKEN;
  if (!token) return false;
  return request.headers.get('authorization') === `Bearer ${token}`;
}

function hmacAuthorized(request: Request, message: SoulMeshMessage): boolean {
  if (authDisabled()) return true;
  const secret = process.env.SOUL_MESH_HMAC_SECRET;
  if (!secret) return true;
  const nonce = request.headers.get('x-soul-mesh-nonce') ?? '';
  const signature = request.headers.get('x-soul-mesh-hmac') ?? '';
  return verifySoulMeshMessage(message, secret, nonce, signature);
}

export async function POST(request: Request) {
  if (!authDisabled() && !process.env.SOUL_MESH_TOKEN) {
    return NextResponse.json({ error: 'MESH_AUTH_NOT_CONFIGURED' }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let message: SoulMeshMessage;
  try {
    message = (await request.json()) as SoulMeshMessage;
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!hmacAuthorized(request, message)) {
    return NextResponse.json({ error: 'INVALID_MESH_HMAC' }, { status: 401 });
  }

  try {
    const session = await auth();
    const handlers = createNucleus04MeshHandlers({ session });
    const result = await handleMeshMessage(message, handlers);
    return NextResponse.json(result, { status: result.kind === 'error' ? 502 : 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SOUL_MESH_ERROR' },
      { status: 400 },
    );
  }
}
