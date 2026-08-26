import { generateText } from 'ai';
import { nucleus04Processor, Nucleus04Processor, type Nucleus04Context } from './Nucleus04Processor';
import { createNucleus04Tools, type Nucleus04ToolContext, type Nucleus04ToolId } from './Nucleus04ToolRegistry';
import { myProvider } from '@/lib/ai/providers';
import { sendTo } from '@/lib/soul-mesh/peer-client';

type ExecutableTool = {
  execute?: (input: unknown, options?: unknown) => unknown | Promise<unknown>;
};

export function createNucleus04Runtime(context: Nucleus04ToolContext) {
  const processor = new Nucleus04Processor();
  const tools = createNucleus04Tools(context) as Record<Nucleus04ToolId, ExecutableTool>;

  processor.registerHandler('tool-execution', async (input) => {
    const request = input as { tool: Nucleus04ToolId; arguments: unknown };
    const selected = tools[request.tool];
    if (!selected?.execute) {
      throw new Error(`Nucleus 04 tool is unavailable: ${request.tool}`);
    }
    return selected.execute(request.arguments);
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

  processor.registerHandler('context-orchestration', async (input) => ({
    nucleus: 'N04',
    context: input,
    timestamp: Date.now(),
  }));

  processor.registerHandler('mesh-communication', async (input) => {
    const request = input as {
      target: 'N01' | 'N02' | 'N03' | 'N05' | 'N06';
      capability: string;
      payload: unknown;
    };
    return sendTo(request.target, request.capability, request.payload);
  });

  processor.registerHandler('streaming', async () => {
    throw new Error('STREAMING_REQUIRES_CHAT_TRANSPORT');
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
