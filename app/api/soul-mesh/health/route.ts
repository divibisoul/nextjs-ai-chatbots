import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    protocol: 'soul-mesh/1', nucleus: 'N02', status: 'ready',
    capabilities: ['mesh.ping', 'conversation', 'tool-execution', 'artifact-processing', 'document-processing', 'context-orchestration', 'streaming'],
    timestamp: Date.now(),
  });
}
