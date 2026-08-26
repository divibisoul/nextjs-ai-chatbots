export const SOUL_MESH_PROTOCOL = 'soul-mesh/1';
export type NucleusId = 'N01'|'N02'|'N03'|'N04'|'N05'|'N06';
export type MessageKind = 'request'|'response'|'event'|'error'|'ack';
export type SoulMeshMessage = { protocol:string; id:string; correlationId:string; source:NucleusId; target:NucleusId; kind:MessageKind; capability:string; payload:unknown; timestamp:string };
export function validateMessage(m:SoulMeshMessage, nucleusId:NucleusId){if(m.protocol!==SOUL_MESH_PROTOCOL)throw new Error('Unsupported Mesh protocol');if(m.target!==nucleusId)throw new Error('Wrong target');if(m.source===m.target)throw new Error('Self route');if(!m.id||!m.correlationId||!m.capability)throw new Error('Malformed Mesh message');return true;}
export async function handleMeshMessage(m:SoulMeshMessage,nucleusId:NucleusId,handlers:Record<string,(p:unknown)=>Promise<unknown>|unknown>){validateMessage(m,nucleusId);if(m.kind!=='request')return m;const h=handlers[m.capability];if(!h)return {...m,kind:'error',payload:{code:'CAPABILITY_NOT_FOUND'}};try{return {...m,kind:'response',payload:await h(m.payload)}}catch(e){return {...m,kind:'error',payload:{code:'CAPABILITY_EXECUTION_ERROR'}}}}
