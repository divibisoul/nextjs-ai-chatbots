import { NextResponse } from 'next/server';
import { SOUL_MESH_CAPABILITIES } from '@/lib/soul-mesh/SoulMeshCapabilities';
import { SOUL_MESH_CONTRACT_VERSION } from '@/lib/soul-mesh/SoulMeshProtocol';

const N04_CAPABILITIES = SOUL_MESH_CAPABILITIES.filter((capability) => capability.remote).map((capability) => capability.id);
const ACCEPTED_SOURCES = new Set(['N01', 'N02', 'N03', 'N05', 'N06', 'N07']);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { source?: string; target?: string; protocol?: string; contractVersion?: string } | null;
  if (!body || body.protocol !== 'soul-mesh/1' || body.target !== 'N04' || !body.source || !ACCEPTED_SOURCES.has(body.source)) {
    return NextResponse.json({ accepted: false, error: 'INVALID_SOUL_MESH_HANDSHAKE' }, { status: 400 });
  }
  if (body.contractVersion && body.contractVersion !== SOUL_MESH_CONTRACT_VERSION) {
    return NextResponse.json({ accepted: false, error: 'INVALID_SOUL_MESH_CONTRACT_VERSION' }, { status: 409 });
  }
  return NextResponse.json({
    accepted: true,
    protocol: 'soul-mesh/1',
    contractVersion: SOUL_MESH_CONTRACT_VERSION,
    source: 'N04',
    target: body.source,
    nucleus: 'N04',
    transports: ['HTTP'],
    capabilities: N04_CAPABILITIES,
    timestamp: Date.now(),
  });
}
