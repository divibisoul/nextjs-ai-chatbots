import type { SoulMeshMessage, SoulMeshTransport } from './SoulMeshProtocol';
export type MeshTransportCandidate = { id: string; transport: SoulMeshTransport; enabled?: boolean };
/** Hybrid transport fabric for N04. */
export class SoulMeshTransportMultiplexer implements SoulMeshTransport {
  readonly kind = 'HTTP' as const;
  private readonly candidates: MeshTransportCandidate[];
  constructor(candidates: MeshTransportCandidate[]) { this.candidates = candidates; }
  async send(message: SoulMeshMessage): Promise<void> {
    const enabled = this.candidates.filter((candidate) => candidate.enabled !== false);
    if (!enabled.length) throw new Error('SOUL_MESH_NO_TRANSPORT_AVAILABLE');
    const failures: string[] = [];
    for (const candidate of enabled) { try { await candidate.transport.send(message); return; } catch (error) { failures.push(`${candidate.id}:${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`); } }
    throw new Error(`SOUL_MESH_ALL_TRANSPORTS_FAILED:${failures.join('|')}`);
  }
  onMessage(handler: (message: SoulMeshMessage) => void | Promise<void>): () => void {
    const unsubscribers = this.candidates.filter((candidate) => candidate.enabled !== false).map((candidate) => candidate.transport.onMessage(handler));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }
  availableTransports(): string[] { return this.candidates.filter((candidate) => candidate.enabled !== false).map((candidate) => candidate.id); }
}
