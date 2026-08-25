import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { source?: string; correlationId?: string } | null;
  if (!body?.source || !body.correlationId) return NextResponse.json({ ok: false, error: 'Missing source or correlationId' }, { status: 400 });
  return NextResponse.json({ ok: true, protocol: 'soul-mesh/1', source: 'chatbots', target: body.source, correlationId: body.correlationId, timestamp: Date.now() });
}
