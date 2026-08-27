import type { SoulMeshTransportKind, SoulNucleus } from './SoulMeshProtocol';

export const N01_REFERENCE_TRANSPORTS: readonly SoulMeshTransportKind[] = ['IN_PROCESS','WEBVIEW_BRIDGE','LOOPBACK_HTTP','HTTP','REALTIME'];
export const N04_IMPLEMENTED_TRANSPORTS: readonly SoulMeshTransportKind[] = ['IN_PROCESS','HTTP'];
export const N04_ADAPTER_TARGETS: readonly SoulMeshTransportKind[] = ['WEBVIEW_BRIDGE','LOOPBACK_HTTP','REALTIME'];
export interface NucleusTransportProfile { nucleus: SoulNucleus; implemented: readonly SoulMeshTransportKind[]; adapters: readonly SoulMeshTransportKind[]; }
export const N04_TRANSPORT_PROFILE: NucleusTransportProfile = { nucleus:'N04', implemented:N04_IMPLEMENTED_TRANSPORTS, adapters:N04_ADAPTER_TARGETS };
export function selectCompatibleTransport(local: readonly SoulMeshTransportKind[], remote: readonly SoulMeshTransportKind[]): SoulMeshTransportKind | null { for(const transport of N01_REFERENCE_TRANSPORTS) if(local.includes(transport)&&remote.includes(transport)) return transport; return null; }
export function buildPeerTransportMatrix(local:NucleusTransportProfile, peers:readonly NucleusTransportProfile[]):Readonly<Record<SoulNucleus,SoulMeshTransportKind|null>> { return Object.fromEntries(peers.map(peer=>[peer.nucleus,selectCompatibleTransport(local.implemented,peer.implemented)])) as Record<SoulNucleus,SoulMeshTransportKind|null>; }
