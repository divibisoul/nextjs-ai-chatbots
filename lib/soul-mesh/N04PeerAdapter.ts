/** Backwards-compatible facade over the canonical N04 peer client. */
export {
  sendTo as sendFromN04,
  PEERS,
  superGPUExecute,
  superGPUParallel,
} from './peer-client';

export { createRequest, getConfiguredPeers, probePeer, probeAllPeers } from './adapter';

export type { N04Peer } from './peer-client';

export function getN04PeerConfig() {
  return getConfiguredPeers().map(peer => ({ nucleus: peer.id, url: peer.url }));
}

export function discoverN04Peer(target: import('./peer-client').N04Peer) {
  return probePeer(target).then(result => ({
    nucleus: result.id,
    reachable: result.reachable,
    ...(result.reachable ? { description: result.details } : { error: result.error }),
  }));
}

export function discoverAllN04Peers() {
  return Promise.all(PEERS.map(discoverN04Peer));
}