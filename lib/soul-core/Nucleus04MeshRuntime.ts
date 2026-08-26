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

export type Nucleus04MeshRuntimeOptions = {
  session?: Session | null;
};

type ToolId = 'createDocument' | 'updateDocument' | 'getWeather' | 'requestSuggestions';

type ToolRequest = {
  tool: ToolId;
  arguments: unknown;
};

type AiPilotRequest = {
  prompt?: string;
  system?: string;
  model?: string;
};

const NOOP_DATA_STREAM = {
  write: () => undefined,
} as unknown as UIMessageStreamWriter<ChatMessage>;

const AVAILABLE_MODELS = new Set(chatModels.map((model) => model.id));

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

export function createNucleus04MeshHandlers({ session }: Nucleus04MeshRuntimeOptions = {}) {
  const tools = session
    ? {
        createDocument: createDocument({ session, dataStream: NOOP_DATA_STREAM }),
        updateDocument: updateDocument({ session, dataStream: NOOP_DATA_STREAM }),
        getWeather,
        requestSuggestions: requestSuggestions({ session, dataStream: NOOP_DATA_STREAM }),
      }
    : { getWeather };

  return {
    async 'ai-pilot'(payload: unknown) {
      const input = assertObject(payload, 'AI_PILOT_PAYLOAD') as AiPilotRequest;
      const prompt = typeof input.prompt === 'string' ? input.prompt : '';
      if (!prompt.trim()) throw new Error('AI_PILOT_PROMPT_REQUIRED');

      const modelId = typeof input.model === 'string' && AVAILABLE_MODELS.has(input.model)
        ? input.model
        : 'chat-model';

      const result = await generateText({
        model: myProvider.languageModel(modelId),
        system: typeof input.system === 'string' ? input.system : undefined,
        prompt,
      });

      return {
        model: modelId,
        text: result.text,
        usage: result.usage,
      };
    },

    async conversation(payload: unknown) {
      return this['ai-pilot'](payload);
    },

    async 'tool-execution'(payload: unknown) {
      const input = assertObject(payload, 'TOOL_EXECUTION_PAYLOAD') as unknown as ToolRequest;
      if (typeof input.tool !== 'string') throw new Error('TOOL_ID_REQUIRED');

      if (input.tool !== 'getWeather') requireSession(session);
      const selected = tools[input.tool as keyof typeof tools] as { execute?: (args: unknown) => unknown | Promise<unknown> } | undefined;
      if (!selected?.execute) throw new Error(`TOOL_NOT_AVAILABLE:${input.tool}`);

      return selected.execute(input.arguments);
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
      return {
        nucleus: 'N04',
        protocol: 'soul-mesh/1',
        receivedAt: Date.now(),
        context: payload,
      };
    },

    async 'mesh-communication'(payload: unknown) {
      const input = assertObject(payload, 'MESH_COMMUNICATION_PAYLOAD');
      const target = input.target;
      const capability = input.capability;
      if (!['N01', 'N02', 'N03', 'N05', 'N06'].includes(String(target))) {
        throw new Error('INVALID_MESH_PEER');
      }
      if (typeof capability !== 'string' || !capability) throw new Error('MESH_CAPABILITY_REQUIRED');

      return sendTo(target as 'N01' | 'N02' | 'N03' | 'N05' | 'N06', capability, input.payload);
    },

    streaming() {
      throw new Error('STREAMING_REQUIRES_CHAT_TRANSPORT');
    },

    'mesh.ping'(payload: unknown) {
      return { ok: true, nucleus: 'N04', echoed: payload, processedAt: Date.now() };
    },

    'mesh.describe'() {
      return {
        nucleus: 'N04',
        protocol: 'soul-mesh/1',
        capabilities: SOUL_MESH_CAPABILITIES,
        tools: ['createDocument', 'updateDocument', 'getWeather', 'requestSuggestions'],
        models: chatModels,
        peers: ['N01', 'N02', 'N03', 'N05', 'N06'],
        channels: { inbound: N04_IN_CHANNELS, outbound: N04_OUT_CHANNELS },
        status: 'online',
      };
    },

    'core.health'() {
      return {
        ok: true,
        nucleus: 'N04',
        runtime: 'nextjs-ai-chatbots',
        authenticatedToolContext: Boolean(session?.user?.id),
        timestamp: Date.now(),
      };
    },

    'environment.weather'(payload: unknown) {
      return tools.getWeather.execute(payload as never);
    },
  };
}
