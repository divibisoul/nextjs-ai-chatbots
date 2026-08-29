import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { handleMeshMessage } from '@/lib/soul-mesh/endpoint';
import { createNucleus04MeshHandlers } from '@/lib/soul-core/Nucleus04MeshRuntime';
import { createN04MeshProcessorGateway } from '@/lib/soul-mesh/N04MeshProcessorGateway';

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 100;
const FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_MS = 60_000;
const peerState = new Map<string, { windowStart: number; count: number; failures: number; openUntil: number }>();

function authorized(request: Request): boolean {
  const token = process.env.SOUL_MESH_TOKEN;
  return !token || request.headers.get('authorization') === `Bearer ${token}`;
}

function peerKey(request: Request, message?: SoulMeshMessage): string {
  return message?.source ?? request.headers.get('x-soul-nucleus') ?? 'unknown';
}

function allowPeer(key: string): boolean {
  const now = Date.now();
  const state = peerState.get(key) ?? { windowStart: now, count: 0, failures: 0, openUntil: 0 };
  if (state.openUntil > now) return false;
  if (now - state.windowStart >= RATE_WINDOW_MS) { state.windowStart = now; state.count = 0; }
  if (state.count >= RATE_LIMIT) return false;
  state.count += 1;
  peerState.set(key, state);
  return true;
}

function recordFailure(key: string): void {
  const state = peerState.get(key) ?? { windowStart: Date.now(), count: 0, failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) state.openUntil = Date.now() + CIRCUIT_OPEN_MS;
  peerState.set(key, state);
}

function recordSuccess(key: string): void {
  const state = peerState.get(key);
  if (state) { state.failures = 0; state.openUntil = 0; peerState.set(key, state); }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let message: SoulMeshMessage;
  try { message = (await request.json()) as SoulMeshMessage; }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }

  const key = peerKey(request, message);
  if (!allowPeer(key)) return NextResponse.json({ error: 'MESH_RATE_LIMIT_OR_CIRCUIT_OPEN' }, { status: 429 });

  try {
    const session = await auth();
    const baseHandlers = createNucleus04MeshHandlers({ session });
    const handlers = createN04MeshProcessorGateway(baseHandlers);
    const result = await handleMeshMessage(message, handlers);
    if (result.kind === 'error') recordFailure(key); else recordSuccess(key);
    return NextResponse.json(result, { status: result.kind === 'error' ? 502 : 200 });
  } catch (error) {
    recordFailure(key);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'SOUL_MESH_ERROR' }, { status: 400 });
  }
}
