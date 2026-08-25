import type { SoulMeshPeer } from './SoulMeshPeerMatrix';

export type SoulMeshLink = { local: 'chatbots'; peer: SoulMeshPeer; in: boolean; out: boolean };
export const R5_LINKS: SoulMeshLink[] = [
  'aeternum','nexus','eternium','chatbot','chatbot-2000'
].map((peer) => ({ local: 'chatbots', peer: peer as SoulMeshPeer, in: true, out: true }));
