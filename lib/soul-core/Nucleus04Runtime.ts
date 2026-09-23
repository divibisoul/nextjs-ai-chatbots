import { generateText, type UIMessageStreamWriter } from 'ai';
import type { Session } from 'next-auth';
import { myProvider } from '@/lib/ai/providers';
import { nucleus04Processor, Nucleus04Processor, type Nucleus04Context } from './Nucleus04Processor';
import { createNucleus04Tools, type Nucleus04ToolContext, type Nucleus04ToolId } from './Nucleus04ToolRegistry';
import { sendTo } from '@/lib/soul-mesh/peer-client';
import type { ChatMessage } from '@/lib/types';

type ExecutableTool = { execute?: (input: unknown, options?: unknown) => unknown | Promise<unknown> };

export function createNucleus04Runtime(context: Nucleus04ToolContext) {
  const processor = new Nucleus04Processor();
  const tools = createNucleus04Tools(context) as Record<Nucleus04ToolId, ExecutableTool>;

  processor.registerHandler('tool-execution', async (input) => {
    const request = input as { tool?: Nucleus04ToolId; arguments?: unknown };
    if (!request.tool) throw new Error('TOOL_ID_REQUIRED');
    const selected = tools[request.tool];
    if (!selected?.execute) throw new Error(`Nucleus 04 tool is unavailable: ${request.tool}`);
    return selected.execute(request.arguments ?? {});
  });

  processor.registerHandler('artifact-processing', async (input, runtimeContext) => processor.execute({ capability: 'tool-execution', input }, runtimeContext ?? (context as Nucleus04Context)));
  processor.registerHandler('document-processing', async (input, runtimeContext) => processor.execute({ capability: 'tool-execution', input }, runtimeContext ?? (context as Nucleus04Context)));
  processor.registerHandler('context-orchestration', async (input) => ({ nucleus: 'N04', protocol: 'soul-mesh/1', context: input, timestamp: Date.now() }));
  processor.registerHandler('mesh-communication', async (input) => {
    const request = input as { target: 'N01' | 'N02' | 'N03' | 'N05' | 'N06'; capability: string; payload: unknown };
    if (!request.target || !request.capability) throw new Error('MESH_REQUEST_INVALID');
    return sendTo(request.target, request.capability, request.payload);
  });
  processor.registerHandler('streaming', async () => ({ ok: true, mode: 'native-chat-transport', nucleus: 'N04', message: 'Use the native chat streaming transport for streamed UI output; Mesh remains synchronous for request/response.' }));

  processor.registerHandler('document.create', async (input, runtimeContext) =>
    processor.execute(
      { capability: 'tool-execution', input: { tool: 'createDocument', arguments: (input as { arguments?: unknown }).arguments ?? input } },
      runtimeContext ?? (context as Nucleus04Context),
    ),
  );
  processor.registerHandler('document.edit', async (input, runtimeContext) =>
    processor.execute(
      { capability: 'tool-execution', input: { tool: 'updateDocument', arguments: (input as { arguments?: unknown }).arguments ?? input } },
      runtimeContext ?? (context as Nucleus04Context),
    ),
  );
  processor.registerHandler('tool.run', async (input, runtimeContext) => {
    const request = input as { tool?: string; arguments?: unknown };
    if (!request.tool) throw new Error('TOOL_ID_REQUIRED');
    return processor.execute(
      { capability: 'tool-execution', input: { tool: request.tool, arguments: request.arguments ?? {} } },
      runtimeContext ?? (context as Nucleus04Context),
    );
  });
  processor.registerHandler('batch.process', async (input, runtimeContext) => {
    const value = input as { jobs?: Array<{ capability?: string; input?: unknown }> };
    if (!Array.isArray(value.jobs) || value.jobs.length === 0) throw new Error('BATCH_JOBS_REQUIRED');
    return Promise.all(value.jobs.map(async (job) => {
      const capability = typeof job.capability === 'string' ? job.capability.trim() : '';
      if (!capability) throw new Error('BATCH_CAPABILITY_REQUIRED');
      if (!processor.supports(capability)) throw new Error('BATCH_CAPABILITY_UNSUPPORTED:' + capability);
      return processor.execute(
        { capability: capability as Nucleus04Capability, input: job.input },
        runtimeContext ?? (context as Nucleus04Context),
      );
    }));
  });
  processor.registerHandler('parallel.map', async (input, runtimeContext) => {
    const value = input as { capability?: string; inputs?: unknown[] };
    const capability = typeof value.capability === 'string' ? value.capability.trim() : '';
    if (!capability || !processor.supports(capability)) throw new Error('PARALLEL_CAPABILITY_UNSUPPORTED:' + capability);
    if (!Array.isArray(value.inputs) || value.inputs.length === 0) throw new Error('PARALLEL_INPUTS_REQUIRED');
    return Promise.all(value.inputs.map((item) =>
      processor.execute(
        { capability: capability as Nucleus04Capability, input: item },
        runtimeContext ?? (context as Nucleus04Context),
      ),
    ));
  });

  processor.registerPilot({
    id: 'n04-provider-adapter',
    execute: async (input) => {
      const request = input as { prompt: string; system?: string; model?: string };
      if (!request.prompt?.trim()) throw new Error('AI_PILOT_PROMPT_REQUIRED');
      const model = request.model === 'chat-model-reasoning' ? 'chat-model-reasoning' : 'chat-model';
      const result = await generateText({ model: myProvider.languageModel(model), system: request.system, prompt: request.prompt });
      return { model, text: result.text, usage: result.usage };
    },
  });

  return { processor, tools };
}

export function createNucleus04MeshContext(session: Session, dataStream: UIMessageStreamWriter<ChatMessage>): Nucleus04ToolContext {
  return { session, dataStream };
}

export { nucleus04Processor };
