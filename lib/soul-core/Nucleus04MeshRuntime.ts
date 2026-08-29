import { generateText, type UIMessageStreamWriter } from 'ai';
import type { Session } from 'next-auth';
import { myProvider } from '@/lib/ai/providers';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { documentHandlersByArtifactKind, artifactKinds } from '@/lib/artifacts/server';
import type { ChatMessage } from '@/lib/types';
import { chatModels } from '@/lib/ai/models';
import { SOUL_MESH_CAPABILITIES } from '@/lib/soul-mesh/SoulMeshCapabilities';
import { sendTo, N04_IN_CHANNELS, N04_OUT_CHANNELS } from '@/lib/soul-mesh/peer-client';
import { n04Cache } from './N04Cache';
import { n04SuperGpu } from './N04SuperGpuEngine';

export type Nucleus04MeshRuntimeOptions = { session?: Session | null };

type ToolId = 'createDocument' | 'updateDocument' | 'getWeather' | 'requestSuggestions';
type ToolRequest = { tool: ToolId; arguments: unknown };
type AiPilotRequest = { prompt?: string; system?: string; model?: string };
type Task = { capability: string; payload: unknown };
type ArtifactRequest = {
  kind?: (typeof artifactKinds)[number];
  operation?: 'create' | 'update';
  id?: string;
  title?: string;
  description?: string;
  content?: string;
};

type MeshTool = {
  execute?: (...args: unknown[]) => unknown | Promise<unknown>;
};

const NOOP_DATA_STREAM = { write: () => undefined } as unknown as UIMessageStreamWriter<ChatMessage>;
const AVAILABLE_MODELS = new Set(chatModels.map((model) => model.id));
type ProviderModelId = 'chat-model' | 'chat-model-reasoning' | 'title-model' | 'artifact-model';
const PROVIDER_MODEL_IDS = new Set<ProviderModelId>(['chat-model', 'chat-model-reasoning', 'title-model', 'artifact-model']);

function isProviderModelId(value: string): value is ProviderModelId {
  return PROVIDER_MODEL_IDS.has(value as ProviderModelId);
}

function assertObject(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name}_MUST_BE_OBJECT`);
  return value as Record<string, unknown>;
}

function requireSession(session?: Session | null): Session {
  if (!session?.user?.id) throw new Error('AUTH_CONTEXT_REQUIRED');
  return session;
}

function stableKey(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return JSON.stringify(value);
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(Object.fromEntries(entries));
}

function getArtifactHandler(kind: ArtifactRequest['kind']) {
  const resolved = kind ?? 'text';
  if (!artifactKinds.includes(resolved as (typeof artifactKinds)[number])) {
    throw new Error(`ARTIFACT_KIND_NOT_SUPPORTED:${resolved}`);
  }
  return documentHandlersByArtifactKind.find((handler) => handler.kind === resolved);
}

function analyzeArtifactPayload(payload: unknown) {
  const input = assertObject(payload, 'ARTIFACT_ANALYZE_PAYLOAD');
  const content = typeof input.content === 'string' ? input.content : undefined;
  const bytes = typeof input.bytes === 'number' && Number.isFinite(input.bytes) ? input.bytes : undefined;
  const mimeType = typeof input.mimeType === 'string' ? input.mimeType : undefined;
  return {
    ok: true,
    capability: 'artifact.analyze',
    analysis: {
      kind: input.kind ?? 'unknown',
      mimeType: mimeType ?? null,
      bytes: bytes ?? (content ? new TextEncoder().encode(content).byteLength : null),
      textLength: content?.length ?? null,
      hasContent: content !== undefined,
      supportedArtifactKinds: [...artifactKinds],
    },
  };
}

export function createNucleus04MeshHandlers({ session }: Nucleus04MeshRuntimeOptions = {}) {
  const tools: Record<string, MeshTool> = {};

  const registerTool = (name: string, candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object') return;
    const execute = Reflect.get(candidate, 'execute');
    if (typeof execute !== 'function') return;
    tools[name] = { execute: (...args) => Reflect.apply(execute, candidate, args) };
  };

  registerTool('getWeather', getWeather);
  if (session) {
    registerTool('createDocument', createDocument({ session, dataStream: NOOP_DATA_STREAM }));
    registerTool('updateDocument', updateDocument({ session, dataStream: NOOP_DATA_STREAM }));
    registerTool('requestSuggestions', requestSuggestions({ session, dataStream: NOOP_DATA_STREAM }));
  }

  const executeTool = async (payload: unknown) => {
    const input = assertObject(payload, 'TOOL_EXECUTION_PAYLOAD') as unknown as ToolRequest;
    if (typeof input.tool !== 'string') throw new Error('TOOL_ID_REQUIRED');
    if (input.tool !== 'getWeather') requireSession(session);
    const selected = tools[input.tool];
    if (!selected?.execute) throw new Error(`TOOL_NOT_AVAILABLE:${input.tool}`);
    return selected.execute(input.arguments);
  };

  const executeArtifact = async (payload: unknown) => {
    const input = assertObject(payload, 'ARTIFACT_PAYLOAD') as ArtifactRequest;
    const activeSession = requireSession(session);
    const kind = input.kind ?? 'text';
    const handler = getArtifactHandler(kind);
    if (!handler) throw new Error(`ARTIFACT_HANDLER_NOT_AVAILABLE:${kind}`);

    if (input.operation === 'update') {
      if (!input.id || !input.description || input.content === undefined) {
        throw new Error('ARTIFACT_UPDATE_REQUIRES_ID_DESCRIPTION_AND_CONTENT');
      }
      return handler.onUpdateDocument({
        document: { id: input.id, title: input.title ?? input.id, content: input.content } as never,
        description: input.description,
        dataStream: NOOP_DATA_STREAM,
        session: activeSession,
      });
    }

    if (!input.id || !input.title) throw new Error('ARTIFACT_CREATE_REQUIRES_ID_AND_TITLE');
    return handler.onCreateDocument({
      id: input.id,
      title: input.title,
      dataStream: NOOP_DATA_STREAM,
      session: activeSession,
    });
  };

  const handlers: Record<string, (payload: unknown) => Promise<unknown> | unknown> = {
    async 'ai-pilot'(payload) {
      const input = assertObject(payload, 'AI_PILOT_PAYLOAD') as AiPilotRequest;
      const prompt = typeof input.prompt === 'string' ? input.prompt : '';
      if (!prompt.trim()) throw new Error('AI_PILOT_PROMPT_REQUIRED');
      const requestedModel = typeof input.model === 'string' ? input.model : 'chat-model';
      const modelId: ProviderModelId = isProviderModelId(requestedModel) && AVAILABLE_MODELS.has(requestedModel)
        ? requestedModel
        : 'chat-model';
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
    async 'artifact-processing'(payload) { return executeArtifact(payload); },

    async 'document-processing'(payload) {
      const input = assertObject(payload, 'DOCUMENT_PROCESSING_PAYLOAD');
      const operation = input.operation === 'edit' || input.operation === 'update' ? 'edit' : 'create';
      return executeTool({ tool: operation === 'edit' ? 'updateDocument' : 'createDocument', arguments: input.input ?? input });
    },

    async 'context-orchestration'(payload) {
      const input = assertObject(payload, 'CONTEXT_ORCHESTRATION_PAYLOAD');
      const tasks = Array.isArray(input.tasks) ? input.tasks as Task[] : [];
      const results = await n04SuperGpu.map(tasks, (task) => dispatch(task.capability, task.payload), 'internal');
      return { nucleus: 'N04', protocol: 'soul-mesh/1', receivedAt: Date.now(), context: input.context ?? payload, results };
    },

    async 'mesh-communication'(payload) {
      const input = assertObject(payload, 'MESH_COMMUNICATION_PAYLOAD');
      const target = String(input.target);
      if (!['N01', 'N02', 'N03', 'N05', 'N06'].includes(target)) throw new Error('INVALID_MESH_PEER');
      if (typeof input.capability !== 'string' || !input.capability) throw new Error('MESH_CAPABILITY_REQUIRED');
      return sendTo(target as 'N01' | 'N02' | 'N03' | 'N05' | 'N06', input.capability, input.payload);
    },

    streaming(payload) {
      return { ok: false, code: 'STREAMING_REQUIRES_CHAT_TRANSPORT', capability: 'streaming', transport: 'chat-stream', input: payload };
    },

    async 'batch.process'(payload) {
      const input = assertObject(payload, 'BATCH_PROCESS_PAYLOAD');
      const tasks = Array.isArray(input.tasks) ? input.tasks as Task[] : [];
      return { ok: true, results: await n04SuperGpu.map(tasks, (task) => dispatch(task.capability, task.payload), 'batch') };
    },

    async 'document.create'(payload) { return executeTool({ tool: 'createDocument', arguments: payload }); },
    async 'document.edit'(payload) { return executeTool({ tool: 'updateDocument', arguments: payload }); },

    async 'artifact.analyze'(payload) { return analyzeArtifactPayload(payload); },

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
      if (!Number.isFinite(delayMs)) throw new Error('SCHEDULE_DELAY_INVALID');
      const taskId = crypto.randomUUID();
      setTimeout(() => { void dispatch(String(input.capability), input.input); }, delayMs).unref?.();
      return { scheduled: true, taskId, delayMs, capability: input.capability };
    },

    async 'parallel.map'(payload) {
      const input = assertObject(payload, 'PARALLEL_MAP_PAYLOAD');
      const capability = String(input.capability ?? 'tool.run');
      const items = Array.isArray(input.items) ? input.items : [];
      return { ok: true, results: await n04SuperGpu.map(items, (item) => dispatch(capability, item), 'batch') };
    },

    'mesh.ping'(payload) { return { ok: true, nucleus: 'N04', echoed: payload, processedAt: Date.now() }; },
    'mesh.describe'() {
      return { nucleus: 'N04', protocol: 'soul-mesh/1', capabilities: SOUL_MESH_CAPABILITIES, tools: Object.keys(tools), models: chatModels, peers: ['N01', 'N02', 'N03', 'N05', 'N06'], channels: { inbound: N04_IN_CHANNELS, outbound: N04_OUT_CHANNELS }, status: 'online' };
    },
    'core.health'() { return { ok: true, nucleus: 'N04', runtime: 'nextjs-ai-chatbots', authenticatedToolContext: Boolean(session?.user?.id), timestamp: Date.now() }; },
    'environment.weather'(payload) { return tools.getWeather?.execute?.(payload); },
  };

  const dispatch = async (capability: string, payload: unknown) => {
    const handler = handlers[capability];
    if (!handler) throw new Error(`CAPABILITY_HANDLER_NOT_REGISTERED:${capability}`);
    return handler(payload);
  };

  return handlers;
}
