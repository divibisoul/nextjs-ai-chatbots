import { generateText } from 'ai';
import { nucleus04Processor, Nucleus04Processor, type Nucleus04Context } from './Nucleus04Processor';
import { createNucleus04Tools, type Nucleus04ToolContext, type Nucleus04ToolId } from './Nucleus04ToolRegistry';
import { myProvider } from '@/lib/ai/providers';
import { sendTo } from '@/lib/soul-mesh/peer-client';

type ExecutableTool = {
  execute?: (input: unknown, options?: unknown) => unknown | Promise<unknown>;
};

type WorkflowTask = {
  capability: Parameters<Nucleus04Processor['execute']>[0]['capability'];
  input: unknown;
};

export function createNucleus04Runtime(context: Nucleus04ToolContext) {
  const processor = new Nucleus04Processor();
  const tools = createNucleus04Tools(context) as Record<Nucleus04ToolId, ExecutableTool>;

  const executeTool = async (input: unknown) => {
    const request = input as { tool: Nucleus04ToolId; arguments: unknown };
    const selected = tools[request.tool];
    if (!selected?.execute) throw new Error(`Nucleus 04 tool is unavailable: ${request.tool}`);
    return selected.execute(request.arguments);
  };

  // Existing application tools remain the source of truth; Mesh capabilities
  // are adapters over those implementations rather than duplicate engines.
  processor.registerHandler('tool-execution', executeTool);
  processor.registerHandler('tool.run', executeTool);

  processor.registerHandler('document.create', async (input) => {
    return executeTool({ tool: 'createDocument', arguments: input });
  });

  processor.registerHandler('document.edit', async (input) => {
    return executeTool({ tool: 'updateDocument', arguments: input });
  });

  processor.registerHandler('artifact-processing', async (input, runtimeContext) => {
    return processor.execute(
      { capability: 'tool-execution', input },
      runtimeContext ?? (context as Nucleus04Context),
    );
  });

  processor.registerHandler('document-processing', async (input, runtimeContext) => {
    return processor.execute(
      { capability: 'tool-execution', input },
      runtimeContext ?? (context as Nucleus04Context),
    );
  });

  processor.registerHandler('artifact.analyze', async () => {
    // Do not fabricate an artifact analyzer. The Mesh capability is declared,
    // but this repository has no standalone analyzer implementation to invoke.
    throw new Error('N04_ARTIFACT_ANALYZER_NOT_IMPLEMENTED');
  });

  processor.registerHandler('context-orchestration', async (input) => ({
    nucleus: 'N04',
    context: input,
    timestamp: Date.now(),
  }));

  processor.registerHandler('streaming', async (input) => ({
    ok: true,
    capability: 'streaming',
    delegated: true,
    input,
  }));

  processor.registerHandler('mesh-communication', async (input) => {
    const request = input as {
      target: 'N01' | 'N02' | 'N03' | 'N05' | 'N06';
      capability: string;
      payload: unknown;
    };
    return sendTo(request.target, request.capability, request.payload);
  });

  const executeWorkflow = async (input: unknown) => {
    const workflow = input as { tasks?: WorkflowTask[] };
    const tasks = workflow.tasks ?? [];
    return Promise.all(tasks.map((task) => processor.execute({ capability: task.capability, input: task.input }, {
      ...context,
      metadata: { source: 'N04_WORKFLOW' },
    })));
  };

  processor.registerHandler('workflow.execute', executeWorkflow);
  processor.registerHandler('batch.process', async (input) => executeWorkflow(input));
  processor.registerHandler('parallel.map', async (input) => {
    const request = input as { capability: WorkflowTask['capability']; items?: unknown[] };
    if (!request.capability) throw new Error('N04_PARALLEL_MAP_CAPABILITY_REQUIRED');
    return Promise.all((request.items ?? []).map((item) => processor.execute({ capability: request.capability, input: item }, {
      ...context,
      metadata: { source: 'N04_PARALLEL_MAP' },
    })));
  });

  processor.registerHandler('schedule.task', async (input) => {
    const task = input as { delayMs?: number; capability: WorkflowTask['capability']; input: unknown };
    const delayMs = Math.max(0, task.delayMs ?? 0);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        processor.execute({ capability: task.capability, input: task.input }, {
          ...context,
          metadata: { source: 'N04_SCHEDULER' },
        }).then(resolve, reject);
      }, delayMs);
    });
  });

  processor.registerPilot({
    id: 'n04-provider-adapter',
    execute: async (input) => {
      const request = input as { prompt: string; system?: string; model?: string };
      if (!request.prompt?.trim()) throw new Error('AI_PILOT_PROMPT_REQUIRED');
      const model = request.model === 'chat-model-reasoning' ? 'chat-model-reasoning' : 'chat-model';
      const result = await generateText({
        model: myProvider.languageModel(model),
        system: request.system,
        prompt: request.prompt,
      });
      return { model, text: result.text, usage: result.usage };
    },
  });

  return { processor, tools };
}

/** Backwards-compatible singleton for consumers that explicitly need one. */
export { nucleus04Processor };
