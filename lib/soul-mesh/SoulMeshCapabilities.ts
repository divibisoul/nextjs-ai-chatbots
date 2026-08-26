export type SoulMeshCapability = {
  id: string;
  version: string;
  description: string;
  request: boolean;
  response: boolean;
  events: boolean;
};

/** Capabilities exposed by Nucleus 04 to the six-core Soul Mesh. */
export const SOUL_MESH_CAPABILITIES: SoulMeshCapability[] = [
  { id: 'ai-pilot', version: '1.0', description: 'Provider-neutral boundary for the user-selected AI pilot', request: true, response: true, events: true },
  { id: 'tool-execution', version: '1.0', description: 'Execute registered Nucleus 04 tools through a controlled context', request: true, response: true, events: true },
  { id: 'artifact-processing', version: '1.0', description: 'Create and process application artifacts', request: true, response: true, events: true },
  { id: 'document-processing', version: '1.0', description: 'Read and update persisted documents through existing handlers', request: true, response: true, events: true },
  { id: 'context-orchestration', version: '1.0', description: 'Coordinate context supplied by the Soul cockpit and pilot', request: true, response: true, events: true },
  { id: 'streaming', version: '1.0', description: 'Stream tool and AI results to the existing chat UI', request: true, response: true, events: true },
  { id: 'conversation', version: '1.0', description: 'Conversational services', request: true, response: true, events: true },
  { id: 'mesh-communication', version: '1.0', description: 'Nucleus-to-nucleus Soul Mesh communication', request: true, response: true, events: true },
];
