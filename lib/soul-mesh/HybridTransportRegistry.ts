export const NUCLEUS_ID = 'N04' as const;
export const TRANSPORTS = ['IN_PROCESS','WEBVIEW_BRIDGE','LOOPBACK_HTTP','HTTP','REALTIME'] as const;
export type TransportKind = typeof TRANSPORTS[number];
export type TransportStatus = 'native' | 'adapter' | 'available-via-peer' | 'unavailable';
export interface TransportDescriptor { kind: TransportKind; status: TransportStatus; bidirectional: boolean; priority: number; }
export const N04_TRANSPORT_REGISTRY: readonly TransportDescriptor[] = TRANSPORTS.map((kind,i)=>({kind,status:kind==='IN_PROCESS'||kind==='HTTP'?'native':'adapter',bidirectional:true,priority:i+1}));
export function selectTransport(local:readonly TransportKind[],remote:readonly TransportKind[]):TransportKind|null{return N04_TRANSPORTS_SAFE(local,remote);}
function N04_TRANSPORTS_SAFE(local:readonly TransportKind[],remote:readonly TransportKind[]):TransportKind|null{return N04_TRANSPORT_REGISTRY.find(t=>local.includes(t.kind)&&remote.includes(t.kind))?.kind??null;}
