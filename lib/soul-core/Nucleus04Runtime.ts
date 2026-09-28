import { generateText, type UIMessageStreamWriter } from 'ai';
import type { Session } from 'next-auth';
import { myProvider } from '@/lib/ai/providers';
import { nucleus04Processor, Nucleus04Processor, type Nucleus04Capability, type Nucleus04Context } from './Nucleus04Processor';
import { createNucleus04Tools, type Nucleus04ToolContext, type Nucleus04ToolId } from './Nucleus04ToolRegistry';
import { sendTo } from '@/lib/soul-mesh/peer-client';
import type { ChatMessage } from '@/lib/types';
import { N04WorkerPool } from './N04WorkerPool';

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
  processor.registerHandler('tool.run', async (input, runtimeContext) => processor.execute({ capability: 'tool-execution', input }, runtimeContext ?? (context as Nucleus04Context)));
  processor.registerHandler('document.create', async (input, runtimeContext) => processor.execute({ capability: 'tool-execution', input: { tool: 'createDocument', arguments: input } }, runtimeContext ?? (context as Nucleus04Context)));
  processor.registerHandler('document.edit', async (input, runtimeContext) => processor.execute({ capability: 'tool-execution', input: { tool: 'updateDocument', arguments: input } }, runtimeContext ?? (context as Nucleus04Context)));
  processor.registerHandler('document-processing', async (input, runtimeContext) => processor.execute({ capability: 'tool-execution', input }, runtimeContext ?? (context as Nucleus04Context)));
  processor.registerHandler('context-orchestration', async (input) => ({ nucleus: 'N04', protocol: 'soul-mesh/1', context: input, timestamp: Date.now() }));
  processor.registerHandler('mesh-communication', async (input) => {
    const request = input as { target: 'N01' | 'N02' | 'N03' | 'N05' | 'N06' | 'N07'; capability: string; payload: unknown };
    if (!request.target || !request.capability) throw new Error('MESH_REQUEST_INVALID');
    return sendTo(request.target, request.capability, request.payload);
  });
  const workerPool = new N04WorkerPool(8);

  processor.registerHandler('batch.process', async (input, runtimeContext) => {
    const request = input as {
      capability?: Nucleus04Capability;
      items?: unknown[];
      maxConcurrency?: number;
    };
    if (!request.capability?.trim()) throw new Error('N04_BATCH_CAPABILITY_REQUIRED');
    if (!Array.isArray(request.items) || request.items.length === 0) {
      throw new Error('N04_BATCH_ITEMS_REQUIRED');
    }
    if (request.items.length > 1024) throw new Error('N04_BATCH_TOO_LARGE');
    const executable = new Set(processor.registeredCapabilities());
    if (!executable.has(request.capability)) {
      throw new Error(`N04_BATCH_CAPABILITY_NOT_EXECUTABLE:${request.capability}`);
    }

    const pool = request.maxConcurrency && request.maxConcurrency !== 8
      ? new N04WorkerPool(request.maxConcurrency)
      : workerPool;

    const tasks = request.items.map((item, index) => ({
      id: `n04-batch-${index}`,
      input: item,
      priority: 0,
    }));

    const results = await pool.execute(tasks, (item) =>
      processor.execute(
        { capability: request.capability!, input: item },
        runtimeContext ?? (context as Nucleus04Context),
      ),
    );

    return {
      nucleus: 'N04',
      capability: request.capability,
      count: results.length,
      results,
      parallel: true,
      workerPool: pool.stats(),
    };
  });

  processor.registerHandler('parallel.map', async (input, runtimeContext) => {
    const request = input as {
      capability?: Nucleus04Capability;
      items?: unknown[];
      maxConcurrency?: number;
    };
    if (!request.capability?.trim()) throw new Error('N04_PARALLEL_CAPABILITY_REQUIRED');
    if (!Array.isArray(request.items) || request.items.length === 0) {
      throw new Error('N04_PARALLEL_ITEMS_REQUIRED');
    }
    const executable = new Set(processor.registeredCapabilities());
    if (!executable.has(request.capability)) {
      throw new Error(`N04_PARALLEL_CAPABILITY_NOT_EXECUTABLE:${request.capability}`);
    }
    const pool = request.maxConcurrency && request.maxConcurrency !== 8
      ? new N04WorkerPool(request.maxConcurrency)
      : workerPool;
    const tasks = request.items.map((item, index) => ({
      id: `n04-map-${index}`,
      input: item,
      priority: 0,
    }));
    const results = await pool.execute(tasks, (item) =>
      processor.execute(
        { capability: request.capability!, input: item },
        runtimeContext ?? (context as Nucleus04Context),
      ),
    );
    return {
      nucleus: 'N04',
      capability: request.capability,
      count: results.length,
      results,
      parallel: true,
      workerPool: pool.stats(),
    };
  });

  processor.registerHandler('streaming', async () => ({ ok: true, mode: 'native-chat-transport', nucleus: 'N04', message: 'Use the native chat streaming transport for streamed UI output; Mesh remains synchronous for request/response.' }));

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
