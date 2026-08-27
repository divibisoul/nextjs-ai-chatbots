import { generateText, type UIMessageStreamWriter } from 'ai';
import type { Session } from 'next-auth';
import { myProvider } from '@/lib/ai/providers';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import type { ChatMessage } from '@/lib/types';
import { chatModels } from '@/lib/ai/models';
import { SOUL_MESH_CAPABILITIES } from '@/lib/soul-mesh/SoulMeshCapabilities';
import { sendTo, N04_IN_CHANNELS, N04_OUT_CHANNELS } from '@/lib/soul-mesh/peer-client';
import { n04Cache } from './N04Cache';

export type Nucleus04MeshRuntimeOptions = { session?: Session | null };

type ToolId = 'createDocument' | 'updateDocument' | 'getWeather' | 'requestSuggestions';
type ToolRequest = { tool: ToolId; arguments: unknown };
type AiPilotRequest = { prompt?: string; system?: string; model?: string };
type Task = { capability: string; payload: unknown };

const NOOP_DATA_STREAM = { write: () => undefined } as unknown as UIMessageStreamWriter<ChatMessage>;
const AVAILABLE_MODELS = new Set(chatModels.map((model) => model.id));

function assertObject(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name}_MUST_BE_OBJECT`);
  return value as Record<string, unknown>;
}

function requireSession(session?: Session | null): Session {
  if (!session?.user?.id) throw new Error('AUTH_CONTEXT_REQUIRED');
  return session;
}

function stableKey(value: unknown): string {
  return JSON.stringify(value, Object.keys((value && typeof value === 'object' && !Array.isArray(value)) ? value as object : {}).sort());
}

export function createNucleus04MeshHandlers({ session }: Nucleus04MeshRuntimeOptions = {}) {
  const tools: Record<string, { execute: (args: unknown) => unknown | Promise<unknown> }> = {
    getWeather,
  };
  if (session) {
    tools.createDocument = createDocument({ session, dataStream: NOOP_DATA_STREAM });
    tools.updateDocument = updateDocument({ session, dataStream: NOOP_DATA_STREAM });
    tools.requestSuggestions = requestSuggestions({ session, dataStream: NOOP_DATA_STREAM });
  }

  const executeTool = async (payload: unknown) => {
    const input = assertObject(payload, 'TOOL_EXECUTION_PAYLOAD') as unknown as ToolRequest;
    if (typeof input.tool !== 'string') throw new Error('TOOL_ID_REQUIRED');
    if (input.tool !== 'getWeather') requireSession(session);
    const selected = tools[input.tool];
    if (!selected?.execute) throw new Error(`TOOL_NOT_AVAILABLE:${input.tool}`);
    return selected.execute(input.arguments);
  };

  const handlers: Record<string, (payload: unknown) => Promise<unknown> | unknown> = {
    async 'ai-pilot'(payload) {
      const input = assertObject(payload, 'AI_PILOT_PAYLOAD') as AiPilotRequest;
      const prompt = typeof input.prompt === 'string' ? input.prompt : '';
      if (!prompt.trim()) throw new Error('AI_PILOT_PROMPT_REQUIRED');
      const modelId = typeof input.model === 'string' && AVAILABLE_MODELS.has(input.model) ? input.model : 'chat-model';
      const key = `ai:${modelId}:${stableKey({ prompt, system: input.system })}`;
      return n04Cache.getOrSet(key, async () => {
        const result = await generateText({
          model: myProvider.languageModel(modelId),
          system: typeof input.system === 'string' ? input.system : undefined,
          prompt,
        });
        return { model: modelId, text: result.text, usage: result.usage };
      });
    },

    async conversation(payload) { return handlers['ai-pilot'](payload); },

    async 'tool-execution'(payload) { return executeTool(payload); },

    async 'artifact-processing'(payload) {
      requireSession(session);
      return executeTool(payload);
    },

    async 'document-processing'(payload) {
      requireSession(session);
      return executeTool(payload);
    },

    async 'context-orchestration'(payload) {
      return { nucleus: 'N04', protocol: 'soul-mesh/1', receivedAt: Date.now(), context: payload };
    },

    async 'mesh-communication'(payload) {
      const input = assertObject(payload, 'MESH_COMMUNICATION_PAYLOAD');
      const target = String(input.target);
      if (!['N01', 'N02', 'N03', 'N05', 'N06'].includes(target)) throw new Error('INVALID_MESH_PEER');
      if (typeof input.capability !== 'string' || !input.capability) throw new Error('MESH_CAPABILITY_REQUIRED');
      return sendTo(target as 'N01' | 'N02' | 'N03' | 'N05' | 'N06', input.capability, input.payload);
    },

    streaming() { throw new Error('STREAMING_REQUIRES_CHAT_TRANSPORT'); },

    async 'batch.process'(payload) {
      const input = assertObject(payload, 'BATCH_PROCESS_PAYLOAD');
      const tasks = Array.isArray(input.tasks) ? input.tasks as Task[] : [];
      return { ok: true, results: await Promise.all(tasks.map((task) => dispatch(task.capability, task.payload))) };
    },

    async 'document.create'(payload) {
      requireSession(session);
      return executeTool({ tool: 'createDocument', arguments: payload });
    },

    async 'document.edit'(payload) {
      requireSession(session);
      return executeTool({ tool: 'updateDocument', arguments: payload });
    },

    async 'artifact.analyze'(payload) {
      return { ok: false, code: 'CAPABILITY_NOT_IMPLEMENTED', capability: 'artifact.analyze', reason: 'No standalone artifact analyzer is present in the repository; no fake success is returned.', input: payload };
    },

    async 'tool.run'(payload) { return executeTool(payload); },

    async 'workflow.execute'(payload) {
      const input = assertObject(payload, 'WORKFLOW_EXECUTE_PAYLOAD');
      const tasks = Array.isArray(input.tasks) ? input.tasks as Task[] : [];
      const results: unknown[] = [];
      for (const task of tasks) results.push(await dispatch(task.capability, task.payload));
      return { ok: true, results };
    },

    async 'schedule.task'(payload) {
      const input = assertObject(payload, 'SCHEDULE_TASK_PAYLOAD');
      const delayMs = Math.max(0, Number(input.delayMs ?? 0));
      const taskId = crypto.randomUUID();
      setTimeout(() => { void dispatch(String(input.capability), input.input); }, delayMs).unref?.();
      return { scheduled: true, taskId, delayMs, capability: input.capability };
    },

    async 'parallel.map'(payload) {
      const input = assertObject(payload, 'PARALLEL_MAP_PAYLOAD');
      const capability = String(input.capability ?? 'tool.run');
      const items = Array.isArray(input.items) ? input.items : [];
      return { ok: true, results: await Promise.all(items.map((item) => dispatch(capability, item))) };
    },

    'mesh.ping'(payload) { return { ok: true, nucleus: 'N04', echoed: payload, processedAt: Date.now() }; },

    'mesh.describe'() {
      return { nucleus: 'N04', protocol: 'soul-mesh/1', capabilities: SOUL_MESH_CAPABILITIES, tools: Object.keys(tools), models: chatModels, peers: ['N01', 'N02', 'N03', 'N05', 'N06'], channels: { inbound: N04_IN_CHANNELS, outbound: N04_OUT_CHANNELS }, status: 'online' };
    },

    'core.health'() { return { ok: true, nucleus: 'N04', runtime: 'nextjs-ai-chatbots', authenticatedToolContext: Boolean(session?.user?.id), timestamp: Date.now() }; },

    'environment.weather'(payload) { return tools.getWeather.execute(payload); },
  };

  const dispatch = async (capability: string, payload: unknown) => {
    const handler = handlers[capability];
    if (!handler) throw new Error(`CAPABILITY_HANDLER_NOT_REGISTERED:${capability}`);
    return handler(payload);
  };

  return handlers;
}
