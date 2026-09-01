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
import { SOUL_MESH_CONTRACT_VERSION } from '@/lib/soul-mesh/SoulMeshProtocol';
import { sendTo, N04_IN_CHANNELS, N04_OUT_CHANNELS } from '@/lib/soul-mesh/peer-client';
import { SoulMeshAgentRegistry } from '@/lib/soul-mesh/SoulMeshAgentRegistry';
import type { SoulMeshMessage } from '@/lib/soul-mesh/SoulMeshProtocol';

export type Nucleus04MeshRuntimeOptions = { session?: Session | null };
type ToolId = 'createDocument' | 'updateDocument' | 'getWeather' | 'requestSuggestions';
type ToolRequest = { tool: ToolId; arguments: unknown };
type AiPilotRequest = { prompt?: string; system?: string; model?: string };
const NOOP_DATA_STREAM = { write: () => undefined } as unknown as UIMessageStreamWriter<ChatMessage>;
const AVAILABLE_MODELS = new Set(chatModels.map((model) => model.id));
const PEERS = ['N01', 'N02', 'N03', 'N05', 'N06'] as const;

type Tool = { execute?: (args: unknown) => unknown | Promise<unknown> };

function assertObject(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name}_MUST_BE_OBJECT`);
  }
  return value as Record<string, unknown>;
}

function requireSession(session?: Session | null): Session {
  if (!session?.user?.id) throw new Error('AUTH_CONTEXT_REQUIRED');
  return session;
}

function message(capability: string, payload: unknown): SoulMeshMessage {
  return {
    protocol: 'soul-mesh/1',
    contractVersion: SOUL_MESH_CONTRACT_VERSION,
    id: crypto.randomUUID(),
    correlationId: crypto.randomUUID(),
    source: 'N04',
    target: 'N04',
    kind: 'request',
    capability,
    payload,
    timestamp: Date.now(),
  };
}

export function createNucleus04MeshHandlers({ session }: Nucleus04MeshRuntimeOptions = {}) {
  const tools = session
    ? {
        createDocument: createDocument({ session, dataStream: NOOP_DATA_STREAM }),
        updateDocument: updateDocument({ session, dataStream: NOOP_DATA_STREAM }),
        getWeather,
        requestSuggestions: requestSuggestions({ session, dataStream: NOOP_DATA_STREAM }),
      }
    : { getWeather };

  const agents = new SoulMeshAgentRegistry();

  const executePilot = async (payload: unknown) => {
    const input = assertObject(payload, 'AI_PILOT_PAYLOAD') as AiPilotRequest;
    if (!input.prompt?.trim()) throw new Error('AI_PILOT_PROMPT_REQUIRED');
    const modelId =
      typeof input.model === 'string' && AVAILABLE_MODELS.has(input.model)
        ? input.model
        : 'chat-model';
    const result = await generateText({
      model: myProvider.languageModel(modelId),
      system: typeof input.system === 'string' ? input.system : undefined,
      prompt: input.prompt,
    });
    return { model: modelId, text: result.text, usage: result.usage };
  };

  agents.register({
    id: 'N04-pilot-agent',
    name: 'N04 AI Pilot Agent',
    capabilities: ['ai-pilot', 'conversation'],
    execute: (m: SoulMeshMessage) => executePilot(m.payload),
  });

  agents.register({
    id: 'N04-tool-agent',
    name: 'N04 Tool Agent',
    capabilities: ['tool-execution', 'artifact-processing', 'document-processing', 'environment.weather'],
    execute: async (m: SoulMeshMessage) => {
      const input = assertObject(m.payload, 'TOOL_EXECUTION_PAYLOAD') as unknown as ToolRequest;
      if (!input.tool) throw new Error('TOOL_ID_REQUIRED');
      if (input.tool !== 'getWeather') requireSession(session);
      const selected = tools[input.tool as keyof typeof tools] as Tool | undefined;
      if (!selected?.execute) throw new Error(`TOOL_NOT_AVAILABLE:${input.tool}`);
      return selected.execute(input.arguments);
    },
  });

  agents.register({
    id: 'N04-orchestration-agent',
    name: 'N04 Mesh Orchestration Agent',
    capabilities: ['context-orchestration', 'mesh-communication'],
    execute: async (m: SoulMeshMessage) => {
      if (m.capability === 'context-orchestration') {
        return { nucleus: 'N04', protocol: 'soul-mesh/1', receivedAt: Date.now(), context: m.payload };
      }

      const input = assertObject(m.payload, 'MESH_COMMUNICATION_PAYLOAD');
      const target = String(input.target);
      const capability = input.capability;
      if (!PEERS.includes(target as (typeof PEERS)[number])) throw new Error('INVALID_MESH_PEER');
      if (typeof capability !== 'string' || !capability) throw new Error('MESH_CAPABILITY_REQUIRED');
      return sendTo(target as (typeof PEERS)[number], capability, input.payload);
    },
  });

  agents.register({
    id: 'N04-mesh-agent',
    name: 'N04 Mesh Agent',
    capabilities: ['mesh.handshake', 'mesh.ping', 'mesh.describe', 'core.health'],
    execute: (m: SoulMeshMessage) => {
      switch (m.capability) {
        case 'mesh.handshake':
          return {
            nucleus: 'N04',
            protocol: 'soul-mesh/1',
            contractVersion: SOUL_MESH_CONTRACT_VERSION,
            capabilities: SOUL_MESH_CAPABILITIES,
            transports: ['http'],
            timestamp: Date.now(),
          };
        case 'mesh.ping':
          return { ok: true, nucleus: 'N04', echoed: m.payload, processedAt: Date.now() };
        case 'mesh.describe':
          return {
            nucleus: 'N04',
            protocol: 'soul-mesh/1',
            contractVersion: SOUL_MESH_CONTRACT_VERSION,
            capabilities: SOUL_MESH_CAPABILITIES,
            agents: agents.describe(),
            tools: ['createDocument', 'updateDocument', 'getWeather', 'requestSuggestions'],
            models: chatModels,
            peers: [...PEERS],
            channels: { inbound: N04_IN_CHANNELS, outbound: N04_OUT_CHANNELS },
            status: 'online',
          };
        default:
          return {
            ok: true,
            nucleus: 'N04',
            runtime: 'nextjs-ai-chatbots',
            contractVersion: SOUL_MESH_CONTRACT_VERSION,
            authenticatedToolContext: Boolean(session?.user?.id),
            timestamp: Date.now(),
          };
      }
    },
  });

  return {
    async 'ai-pilot'(payload: unknown) {
      return agents.execute(message('ai-pilot', payload));
    },
    async conversation(payload: unknown) {
      return this['ai-pilot'](payload);
    },
    async 'tool-execution'(payload: unknown) {
      return agents.execute(message('tool-execution', payload));
    },
    async 'artifact-processing'(payload: unknown) {
      requireSession(session);
      return this['tool-execution'](payload);
    },
    async 'document-processing'(payload: unknown) {
      requireSession(session);
      return this['tool-execution'](payload);
    },
    async 'context-orchestration'(payload: unknown) {
      return agents.execute(message('context-orchestration', payload));
    },
    async 'mesh-communication'(payload: unknown) {
      return agents.execute(message('mesh-communication', payload));
    },
    streaming() {
      throw new Error('STREAMING_REQUIRES_CHAT_TRANSPORT');
    },
    'mesh.handshake'() {
      return agents.execute(message('mesh.handshake', {}));
    },
    'mesh.ping'(payload: unknown) {
      return agents.execute(message('mesh.ping', payload));
    },
    'mesh.describe'() {
      return agents.execute(message('mesh.describe', {}));
    },
    'core.health'() {
      return agents.execute(message('core.health', {}));
    },
    'environment.weather'(payload: unknown) {
      return agents.execute(message('environment.weather', { tool: 'getWeather', arguments: payload }));
    },
  };
}
