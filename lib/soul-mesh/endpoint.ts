import type { SoulMeshMessage } from './SoulMeshProtocol';
import { isSoulMeshMessage } from './SoulMeshProtocol';
import { createNucleus04Runtime } from '@/lib/soul-core/Nucleus04Runtime';
import type { Nucleus04ToolContext } from '@/lib/soul-core/Nucleus04ToolRegistry';

export const NUCLEUS_ID = 'N04' as const;
const NUCLEI = new Set(['N01', 'N02', 'N03', 'N04', 'N05', 'N06']);
const MAX_PAYLOAD_BYTES = 1_000_000;
export type SoulMeshHandler = (payload: unknown) => Promise<unknown> | unknown;
function payloadSize(value: unknown): number { try { return new TextEncoder().encode(JSON.stringify(value)).byteLength; } catch { return Number.POSITIVE_INFINITY; } }
export function validateMeshMessage(m: unknown): asserts m is SoulMeshMessage { if (!isSoulMeshMessage(m)) throw new Error('INVALID_MESH_MESSAGE'); if (!NUCLEI.has(m.source)||!NUCLEI.has(m.target)||m.source===m.target) throw new Error('INVALID_NUCLEUS_ROUTE'); if (m.target!==NUCLEUS_ID) throw new Error('WRONG_TARGET'); if (!m.capability&&m.kind!=='event'&&m.kind!=='ack') throw new Error('MISSING_CAPABILITY'); if (payloadSize(m.payload)>MAX_PAYLOAD_BYTES) throw new Error('MESH_PAYLOAD_TOO_LARGE'); }
function result(message:SoulMeshMessage,payload:unknown,kind:SoulMeshMessage['kind']='response'):SoulMeshMessage{return{protocol:'soul-mesh/1',id:crypto.randomUUID(),correlationId:message.correlationId,source:NUCLEUS_ID,target:message.source,kind,capability:message.capability,payload,timestamp:Date.now()};}
export function createN04MeshHandler(context:Nucleus04ToolContext){ const {processor}=createNucleus04Runtime(context); return async function handleMeshMessage(message:SoulMeshMessage,handlers:Record<string,SoulMeshHandler>={}):Promise<SoulMeshMessage>{ validateMeshMessage(message); if(message.kind!=='request') return message; const handler=handlers[message.capability??'']; try { const output=handler ? await handler(message.payload) : await processor.execute({capability:message.capability as any,input:message.payload},{...context,metadata:{mesh:true,source:message.source,correlationId:message.correlationId}} as any); return result(message,output); } catch(error){ return result(message,{code:'CAPABILITY_EXECUTION_ERROR',nucleus:NUCLEUS_ID,capability:message.capability,detail:error instanceof Error?error.message:'Unknown error'},'error'); } } }
export async function handleMeshMessage(message:SoulMeshMessage,handlers:Record<string,SoulMeshHandler>={}){ const context=handlers as unknown as Nucleus04ToolContext; return createN04MeshHandler(context)(message,handlers); }
