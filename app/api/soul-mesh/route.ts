import { NextResponse } from 'next/server';
import { handleMeshMessage } from '@/lib/soul-mesh/endpoint';
import { NUCLEUS_02_MESH_HANDLERS } from '@/lib/soul-mesh/Nucleus02MeshHandlers';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';

function authorized(request: Request): boolean {
  const token = process.env.SOUL_MESH_TOKEN;
  return !token || request.headers.get('authorization') === `Bearer ${token}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const message = (await request.json()) as SoulMeshMessage;
    const response = await handleMeshMessage(message, NUCLEUS_02_MESH_HANDLERS);
    return NextResponse.json(response);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown mesh error';
    return NextResponse.json({ error: detail }, { status: 400 });
  }
}
