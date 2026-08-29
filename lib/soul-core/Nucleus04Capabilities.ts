export type Nucleus04Capability =
  | 'ai-pilot' | 'tool-execution' | 'artifact-processing' | 'document-processing'
  | 'context-orchestration' | 'streaming' | 'mesh-communication'
  | 'batch.process' | 'document.create' | 'document.edit' | 'artifact.analyze'
  | 'tool.run' | 'workflow.execute' | 'schedule.task' | 'parallel.map';

export const NUCLEUS_04_CAPABILITIES: readonly Nucleus04Capability[] = [
  'ai-pilot', 'tool-execution', 'artifact-processing', 'document-processing',
  'context-orchestration', 'streaming', 'mesh-communication', 'batch.process',
  'document.create', 'document.edit', 'artifact.analyze', 'tool.run',
  'workflow.execute', 'schedule.task', 'parallel.map',
] as const;

export function supportsNucleus04Capability(capability: string): capability is Nucleus04Capability {
  return (NUCLEUS_04_CAPABILITIES as readonly string[]).includes(capability);
}
