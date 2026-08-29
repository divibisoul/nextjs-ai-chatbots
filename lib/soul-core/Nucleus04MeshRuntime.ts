import { generateText, type UIMessageStreamWriter } from 'ai';
import type { Session } from 'next-auth';
import { myProvider } from '@/lib/ai/providers';
import { getWeather } from '@/lib/ai/tools/get-weather';
import type { ChatMessage } from '@/lib/types';
import { chatModels } from '@/lib/ai/models';
import { SOUL_MESH_CAPABILITIES } from '@/lib/soul-mesh/SoulMeshCapabilities';
import { sendTo, N04_IN_CHANNELS, N04_OUT_CHANNELS } from '@/lib/soul-mesh/peer-client';
import { SoulMeshAgentRegistry } from '@/lib/soul-mesh/SoulMeshAgentRegistry';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';
import { n04Cache } from './N04Cache';
import { n04SuperGpu } from './N04SuperGpuEngine';

type ToolId = 'createDocument' | 'updateDocument' | 'getWeather' | 'requestSuggestions';
type ToolRequest = { tool: ToolId; arguments: unknown };
type AiPilotRequest = { prompt?: string; system?: string; model?: string };
type Task = { capability: string; payload: unknown };
export type Nucleus04MeshRuntimeOptions = { session?: Session | null };
const NOOP_DATA_STREAM = { write: () => undefined } as unknown as UIMessageStreamWriter<ChatMessage>;
const AVAILABLE_MODELS = new Set(chatModels.map(model => model.id));
const PROVIDER_MODEL_IDS = new Set(['chat-model','chat-model-reasoning','title-model','artifact-model']);
function assertObject(value: unknown, name: string): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name}_MUST_BE_OBJECT`); return value as Record<string, unknown>; }
function requireSession(session?: Session | null): Session { if (!session?.user?.id) throw new Error('AUTH_CONTEXT_REQUIRED'); return session; }
function stableKey(value: unknown): string { if (!value || typeof value !== 'object' || Array.isArray(value)) return JSON.stringify(value); return JSON.stringify(Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a],[b])=>a.localeCompare(b)))); }

export function createNucleus04MeshHandlers({ session }: Nucleus04MeshRuntimeOptions = {}) {
  const tools: Record<string, { execute?: (...args: unknown[]) => unknown | Promise<unknown> }> = {};
  const registerTool = (name: string, candidate: unknown) => { if (!candidate || typeof candidate !== 'object') return; const execute = Reflect.get(candidate, 'execute'); if (typeof execute === 'function') tools[name] = { execute: (...args) => Reflect.apply(execute, candidate, args) }; };
  registerTool('getWeather', getWeather);
  if (session) {
    tools.createDocument = { execute: async (args) => { const { createDocument } = await import('@/lib/ai/tools/create-document'); const tool = createDocument({ session, dataStream: NOOP_DATA_STREAM }); return Reflect.apply(Reflect.get(tool,'execute'), tool, [args]); } };
    tools.updateDocument = { execute: async (args) => { const { updateDocument } = await import('@/lib/ai/tools/update-document'); const tool = updateDocument({ session, dataStream: NOOP_DATA_STREAM }); return Reflect.apply(Reflect.get(tool,'execute'), tool, [args]); } };
    tools.requestSuggestions = { execute: async (args) => { const { requestSuggestions } = await import('@/lib/ai/tools/request-suggestions'); const tool = requestSuggestions({ session, dataStream: NOOP_DATA_STREAM }); return Reflect.apply(Reflect.get(tool,'execute'), tool, [args]); } };
  }
  const executeTool = async (payload: unknown) => { const input = assertObject(payload,'TOOL_EXECUTION_PAYLOAD') as unknown as ToolRequest; if (typeof input.tool !== 'string') throw new Error('TOOL_ID_REQUIRED'); if (input.tool !== 'getWeather') requireSession(session); const selected = tools[input.tool]; if (!selected?.execute) throw new Error(`TOOL_NOT_AVAILABLE:${input.tool}`); return selected.execute(input.arguments); };
  const agents = new SoulMeshAgentRegistry();
  const executePilot = async (payload: unknown) => { const input = assertObject(payload,'AI_PILOT_PAYLOAD') as AiPilotRequest; if (!input.prompt?.trim()) throw new Error('AI_PILOT_PROMPT_REQUIRED'); const requestedModel = typeof input.model === 'string' ? input.model : 'chat-model'; const modelId = PROVIDER_MODEL_IDS.has(requestedModel) && AVAILABLE_MODELS.has(requestedModel) ? requestedModel : 'chat-model'; return n04Cache.getOrSet(`ai:${modelId}:${stableKey({prompt:input.prompt,system:input.system})}`, async () => { const result = await generateText({ model: myProvider.languageModel(modelId), system: typeof input.system === 'string' ? input.system : undefined, prompt: input.prompt }); return { model:modelId, text:result.text, usage:result.usage }; }); };
  agents.register({ id:'N04-pilot-agent', name:'N04 AI Pilot Agent', capabilities:['ai-pilot','conversation'], execute:(m:SoulMeshMessage)=>executePilot(m.payload) });
  agents.register({ id:'N04-tool-agent', name:'N04 Tool Agent', capabilities:['tool-execution','artifact-processing','document-processing','environment.weather','document.create','document.edit','tool.run'], execute:(m:SoulMeshMessage)=>executeTool(m.payload) });
  agents.register({ id:'N04-orchestration-agent', name:'N04 Mesh Orchestration Agent', capabilities:['context-orchestration','mesh-communication','workflow.execute','batch.process','parallel.map'], execute:async(m:SoulMeshMessage)=>m.capability==='mesh-communication'?executeMeshCommunication(m.payload):{nucleus:'N04',protocol:'soul-mesh/1',receivedAt:Date.now(),context:m.payload} });
  agents.register({ id:'N04-mesh-agent', name:'N04 Mesh Agent', capabilities:['mesh.ping','mesh.describe','core.health'], execute:(m:SoulMeshMessage)=>m.capability==='mesh.ping'?{ok:true,nucleus:'N04',echoed:m.payload,processedAt:Date.now()}:m.capability==='mesh.describe'?{nucleus:'N04',protocol:'soul-mesh/1',capabilities:SOUL_MESH_CAPABILITIES,agents:agents.describe(),tools:Object.keys(tools),models:chatModels,peers:['N01','N02','N03','N05','N06'],channels:{inbound:N04_IN_CHANNELS,outbound:N04_OUT_CHANNELS},status:'online'}:{ok:true,nucleus:'N04',runtime:'nextjs-ai-chatbots',authenticatedToolContext:Boolean(session?.user?.id),timestamp:Date.now()} });
  const handlers: Record<string,(payload:unknown)=>Promise<unknown>|unknown> = {
    async 'ai-pilot'(payload){return agents.execute(message('ai-pilot',payload));}, async conversation(payload){return handlers['ai-pilot'](payload);}, async 'tool-execution'(payload){return agents.execute(message('tool-execution',payload));},
    async 'artifact-processing'(payload){requireSession(session);return executeTool(payload);}, async 'document-processing'(payload){const input=assertObject(payload,'DOCUMENT_PROCESSING_PAYLOAD');return executeTool({tool:input.operation==='edit'||input.operation==='update'?'updateDocument':'createDocument',arguments:input.input??input});},
    async 'context-orchestration'(payload){const input=assertObject(payload,'CONTEXT_ORCHESTRATION_PAYLOAD');const tasks=Array.isArray(input.tasks)?input.tasks as Task[]:[];return{nucleus:'N04',protocol:'soul-mesh/1',context:input.context??null,results:await n04SuperGpu.map(tasks,(item)=>{const task=item as Task;return dispatch(task.capability,task.payload);},'internal')};},
    async 'mesh-communication'(payload){return executeMeshCommunication(payload);}, streaming(){throw new Error('STREAMING_REQUIRES_CHAT_TRANSPORT');},
    async 'mesh.ping'(payload){return agents.execute(message('mesh.ping',payload));}, async 'mesh.describe'(){return agents.execute(message('mesh.describe',{}));}, async 'core.health'(){return agents.execute(message('core.health',{}));}, async 'environment.weather'(payload){return executeTool({tool:'getWeather',arguments:payload});},
    async 'batch.process'(payload){const input=assertObject(payload,'BATCH_PROCESS_PAYLOAD');const tasks=Array.isArray(input.tasks)?input.tasks as Task[]:[];return{ok:true,results:await n04SuperGpu.map(tasks,(item)=>{const task=item as Task;return dispatch(task.capability,task.payload);},'batch')};},
    async 'document.create'(payload){return executeTool({tool:'createDocument',arguments:payload});}, async 'document.edit'(payload){return executeTool({tool:'updateDocument',arguments:payload});},
    async 'artifact.analyze'(payload){const input=assertObject(payload,'ARTIFACT_ANALYZE_PAYLOAD');const content=typeof input.content==='string'?input.content:undefined;return{ok:true,capability:'artifact.analyze',analysis:{kind:input.kind??'unknown',mimeType:input.mimeType??null,bytes:input.bytes??(content?new TextEncoder().encode(content).byteLength:null),textLength:content?.length??null,hasContent:content!==undefined}};},
    async 'tool.run'(payload){return executeTool(payload);}, async 'workflow.execute'(payload){const input=assertObject(payload,'WORKFLOW_EXECUTE_PAYLOAD');const tasks=Array.isArray(input.tasks)?input.tasks as Task[]:[];const results:unknown[]=[];for(const task of tasks)results.push(await dispatch(task.capability,task.payload));return{ok:true,completed:results.length,results};},
    async 'schedule.task'(payload){const input=assertObject(payload,'SCHEDULE_TASK_PAYLOAD');const delayMs=Math.max(0,Math.min(86400000,Number(input.delayMs??0)));if(!Number.isFinite(delayMs))throw new Error('SCHEDULE_DELAY_INVALID');const taskId=crypto.randomUUID();setTimeout(()=>{void dispatch(String(input.capability),input.input);},delayMs).unref?.();return{scheduled:true,taskId,delayMs,capability:input.capability};},
    async 'parallel.map'(payload){const input=assertObject(payload,'PARALLEL_MAP_PAYLOAD');const capability=String(input.capability??'tool.run');const items=Array.isArray(input.items)?input.items:[];return{ok:true,results:await n04SuperGpu.map(items,item=>dispatch(capability,item),'batch')},
  };
  function message(capability:string,payload:unknown):SoulMeshMessage{return{protocol:'soul-mesh/1',id:crypto.randomUUID(),correlationId:crypto.randomUUID(),source:'N04',target:'N04',kind:'request',capability,payload,timestamp:Date.now()};}
  async function executeMeshCommunication(payload:unknown){const input=assertObject(payload,'MESH_COMMUNICATION_PAYLOAD');const target=String(input.target??'').toUpperCase();const capability=input.capability;if(!['N01','N02','N03','N05','N06'].includes(target))throw new Error('INVALID_MESH_PEER');if(typeof capability!=='string'||!capability)throw new Error('MESH_CAPABILITY_REQUIRED');return sendTo(target as 'N01'|'N02'|'N03'|'N05'|'N06',capability,input.payload);}
  async function dispatch(capability:string,payload:unknown){const handler=handlers[capability];if(!handler)throw new Error(`CAPABILITY_HANDLER_NOT_REGISTERED:${capability}`);return handler(payload);}
  return handlers;
}
