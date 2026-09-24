import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

type PingPayload = { source?: string; correlationId?: string; nonce?: string; hmac?: string; timestamp?: number };

function canonical(body: PingPayload) {
  return JSON.stringify({
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    source: body.source ?? null,
    target: 'N04',
    capability: 'mesh.ping',
    correlationId: body.correlationId ?? null,
    timestamp: body.timestamp ?? null,
    nonce: body.nonce ?? null,
  });
}

function authorized(request: Request, body: PingPayload): boolean {
  const secret = process.env.SOUL_MESH_HMAC_SECRET?.trim();
  if (secret) {
    if (!body.nonce || !body.hmac || !body.timestamp) return false;
    if (Math.abs(Date.now() - body.timestamp) > 30_000) return false;
    const expected = createHmac('sha256', secret).update(canonical(body), 'utf8').digest('hex');
    const actual = Buffer.from(body.hmac, 'hex');
    const wanted = Buffer.from(expected, 'hex');
    return actual.length === wanted.length && timingSafeEqual(actual, wanted);
  }
  const token = process.env.SOUL_MESH_TOKEN?.trim();
  if (token) return request.headers.get('authorization') === `Bearer ${token}`;
  return process.env.NODE_ENV !== 'production';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as PingPayload | null;
  const nuclei = new Set(['N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'N07']);
  if (!body?.source || !body.correlationId || !nuclei.has(body.source) || body.source === 'N04') {
    return NextResponse.json({ ok: false, error: 'INVALID_MESH_PING' }, { status: 400 });
  }
  if (!authorized(request, body)) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true, protocol: 'soul-mesh/1', contractVersion: '1.1.0',
    source: 'N04', target: body.source, capability: 'mesh.ping',
    correlationId: body.correlationId, nonce: body.nonce ?? null, timestamp: Date.now(),
  });
}