import { randomUUID } from 'crypto';
import type { SoulMeshMessage, SoulNucleus } from './SoulMeshProtocol';

export type N04Peer = Exclude<SoulNucleus, 'N04'>;
const PEERS: readonly N04Peer[] = ['N01','N02','N03','N05','N06'];
const URL_ENV: Record<N04Peer,string> = { N01:'SOUL_MESH_N01_URL', N02:'SOUL_MESH_N02_URL', N03:'SOUL_MESH_N03_URL', N05:'SOUL_MESH_N05_URL', N06:'SOUL_MESH_N06_URL' };

export function getN04PeerConfig(){return PEERS.map(nucleus=>({nucleus,url:process.env[URL_ENV[nucleus]]?.trim().replace(/\/$/,'')??''}));}
export function createN04Request(target:N04Peer,capability:string,payload:unknown):SoulMeshMessage{return{protocol:'soul-mesh/1',id:randomUUID(),correlationId:randomUUID(),source:'N04',target,kind:'request',capability,payload,timestamp:Date.now()};}
export async function sendFromN04(target:N04Peer,capability:string,payload:unknown,timeoutMs=15000){const peer=getN04PeerConfig().find(item=>item.nucleus===target);if(!peer?.url)throw new Error(`SOUL_MESH_PEER_URL_NOT_CONFIGURED:${target}`);const message=createN04Request(target,capability,payload);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);try{const token=process.env.SOUL_MESH_TOKEN;const response=await fetch(`${peer.url}/api/soul-mesh`,{method:'POST',headers:{'content-type':'application/json',accept:'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(message),cache:'no-store',signal:controller.signal});const body=await response.json().catch(()=>null) as SoulMeshMessage|null;if(!response.ok)throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}:${response.status}`);if(!body||body.protocol!==message.protocol||body.correlationId!==message.correlationId||body.source!==target||body.target!=='N04'||(body.kind!=='response'&&body.kind!=='error'))throw new Error(`SOUL_MESH_INVALID_RESPONSE:${target}`);if(body.kind==='error')throw new Error(`SOUL_MESH_REMOTE_ERROR:${target}`);return body.payload;}finally{clearTimeout(timer);}}
export async function discoverN04Peer(target:N04Peer){try{return{nucleus:target,reachable:true,description:await sendFromN04(target,'mesh.describe',{from:'N04'})};}catch(error){return{nucleus:target,reachable:false,error:error instanceof Error?error.message:String(error)};}}
export function discoverAllN04Peers(){return Promise.all(PEERS.map(discoverN04Peer));}
