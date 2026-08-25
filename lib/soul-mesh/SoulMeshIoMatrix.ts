export const SOUL_MESH_PEERS = ['aeternum','nexus','eternium','chatbot','chatbot-2000'] as const;
export type SoulMeshPeer = typeof SOUL_MESH_PEERS[number];
export type SoulMeshRoute = { source: 'chatbots'; target: SoulMeshPeer; direction: 'out' } | { source: SoulMeshPeer; target: 'chatbots'; direction: 'in' };
export const R5_IN: SoulMeshRoute[] = SOUL_MESH_PEERS.map((source) => ({ source, target: 'chatbots' as const, direction: 'in' as const }));
export const R5_OUT: SoulMeshRoute[] = SOUL_MESH_PEERS.map((target) => ({ source: 'chatbots' as const, target, direction: 'out' as const }));
export const R5_IO = [...R5_IN, ...R5_OUT];
