import { nucleus04Processor, type Nucleus04Context } from './Nucleus04Processor';
import { createNucleus04Tools, type Nucleus04ToolContext, type Nucleus04ToolId } from './Nucleus04ToolRegistry';

type ExecutableTool = {
  execute?: (input: unknown, options?: unknown) => unknown | Promise<unknown>;
};

export function createNucleus04Runtime(context: Nucleus04ToolContext) {
  const tools = createNucleus04Tools(context) as Record<Nucleus04ToolId, ExecutableTool>;

  nucleus04Processor.registerHandler('tool-execution', async (input) => {
    const request = input as { tool: Nucleus04ToolId; arguments: unknown };
    const selected = tools[request.tool];

    if (!selected?.execute) {
      throw new Error(`Nucleus 04 tool is unavailable: ${request.tool}`);
    }

    return selected.execute(request.arguments);
  });

  nucleus04Processor.registerHandler('artifact-processing', async (input, runtimeContext) => {
    const request = input as { tool: 'createDocument' | 'updateDocument'; arguments: unknown };
    return nucleus04Processor.execute(
      { capability: 'tool-execution', input: request },
      runtimeContext ?? (context as Nucleus04Context),
    );
  });

  nucleus04Processor.registerHandler('document-processing', async (input, runtimeContext) => {
    const request = input as { tool: 'createDocument' | 'updateDocument'; arguments: unknown };
    return nucleus04Processor.execute(
      { capability: 'tool-execution', input: request },
      runtimeContext ?? (context as Nucleus04Context),
    );
  });

  return { processor: nucleus04Processor, tools };
}
