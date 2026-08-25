import { NextResponse } from 'next/server';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';

function authorized(request: Request): boolean {
  const token = process.env.SOUL_MESH_TOKEN;
  return !token || request.headers.get('authorization') === `Bearer ${token}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const message = (await request.json()) as SoulMeshMessage;
  if (message.protocol !== 'soul-mesh/1' || message.target !== 'chatbots') return NextResponse.json({ error: 'Invalid Soul Mesh message' }, { status: 400 });
  if (message.kind !== 'request') return NextResponse.json({ accepted: true });
  const response: SoulMeshMessage = { protocol: 'soul-mesh/1', id: crypto.randomUUID(), correlationId: message.correlationId, source: 'chatbots', target: message.source, kind: 'response', capability: message.capability, payload: { nucleus: 'chatbots', capability: message.capability, received: true, payload: message.payload }, timestamp: Date.now() };
  const peer = process.env.SOUL_MESH_CHATBOT_2000_URL;
  if (peer) await fetch(`${peer.replace(/\/$/, '')}/api/soul-mesh`, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.SOUL_MESH_TOKEN ? { authorization: `Bearer ${process.env.SOUL_MESH_TOKEN}` } : {}) }, body: JSON.stringify(response) });
  return NextResponse.json({ accepted: true, correlationId: message.correlationId });
}
