import { sendTo } from './peer-client';
import type { SoulMeshMessage } from './SoulMeshProtocol';

/** N04-side interoperability adapter for the independent N03 AI. */
export const N03_CAPABILITIES = [
  'mesh.ping','mesh.describe','capability.list','voice-input','voice-output','speech-processing',
  'multimodal-input','cognitive-ui','emotion-analysis','spiritual-wisdom','plant-knowledge',
  'ritual-knowledge','frequency-context','mesh-communication',
] as const;
export type N03Capability = (typeof N03_CAPABILITIES)[number];

export type N03Transport = 'mesh-http' | 'supabase-realtime' | 'event-bus' | 'edge-function';
export interface N03Recognition { nucleus:'N03'; protocol:'soul-mesh/1'; recognized:true; transports:N03Transport[]; capabilities:N03Capability[]; channels:string[]; }

export async function pingN03(timeoutMs=5000){ return sendTo('N03','mesh.ping',{from:'N04',channel:'N04.OUT.N03'},timeoutMs); }
export async function describeN03(timeoutMs=5000){ return sendTo('N03','mesh.describe',{from:'N04'},timeoutMs); }
export async function listN03Capabilities(timeoutMs=5000){ return sendTo('N03','capability.list',{from:'N04'},timeoutMs); }
export async function invokeN03(capability:N03Capability,payload:unknown,timeoutMs=30000):Promise<SoulMeshMessage>{ return sendTo('N03',capability,payload,timeoutMs); }

/** Static interoperability profile: recognizes every known N03 transport without requiring deployment. */
export function getN03InteroperabilityProfile():N03Recognition {
  return { nucleus:'N03', protocol:'soul-mesh/1', recognized:true,
    transports:['mesh-http','supabase-realtime','event-bus','edge-function'],
    capabilities:[...N03_CAPABILITIES],
    channels:['N04.OUT.N03','N04.IN.N03','N03.OUT.N04','N03.IN.N04'] };
}

/** Live recognition is intentionally separate from the static profile. */
export async function recognizeN03(timeoutMs=5000){
  const [description,capabilities]=await Promise.all([describeN03(timeoutMs),listN03Capabilities(timeoutMs)]);
  return { ...getN03InteroperabilityProfile(), live:true, description, capabilities };
}

export async function healthN03(timeoutMs=5000){
  const startedAt=Date.now();
  try { const [ping,description]=await Promise.all([pingN03(timeoutMs),describeN03(timeoutMs)]); return {nucleus:'N03' as const,status:'CONNECTED' as const,latencyMs:Date.now()-startedAt,ping,description}; }
  catch(error){ return {nucleus:'N03' as const,status:'FAILED' as const,latencyMs:Date.now()-startedAt,error:error instanceof Error?error.message:String(error)}; }
}
