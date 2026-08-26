export type SoulMeshCapability = {
  id: string;
  version: string;
  description: string;
  request: boolean;
  response: boolean;
  events: boolean;
  remote: boolean;
};

/** Wire-level capabilities exposed by Nucleus 04. */
export const SOUL_MESH_CAPABILITIES: SoulMeshCapability[] = [
  { id: 'ai-pilot', version: '1.1', description: 'Provider-neutral AI inference boundary backed by the configured N04 pilot.', request: true, response: true, events: false, remote: true },
  { id: 'conversation', version: '1.1', description: 'Conversational inference through the same provider-neutral pilot boundary.', request: true, response: true, events: false, remote: true },
  { id: 'tool-execution', version: '1.1', description: 'Execute a registered N04 tool through the controlled tool boundary.', request: true, response: true, events: true, remote: true },
  { id: 'artifact-processing', version: '1.1', description: 'Create or process application artifacts using existing N04 handlers.', request: true, response: true, events: true, remote: true },
  { id: 'document-processing', version: '1.1', description: 'Read or update persisted documents using existing N04 handlers.', request: true, response: true, events: true, remote: true },
  { id: 'context-orchestration', version: '1.1', description: 'Exchange structured context between heterogeneous nuclei without coupling runtimes.', request: true, response: true, events: true, remote: true },
  { id: 'streaming', version: '1.1', description: 'Streaming is supported by the native chat transport; synchronous Mesh requests must use ai-pilot or tool-execution.', request: true, response: true, events: true, remote: true },
  { id: 'mesh-communication', version: '1.1', description: 'N04 outbound request/response bridge to N01, N02, N03, N05 and N06.', request: true, response: true, events: true, remote: true },
  { id: 'mesh.ping', version: '1.0', description: 'Liveness and correlation probe.', request: true, response: true, events: false, remote: true },
  { id: 'mesh.describe', version: '1.0', description: 'Runtime capability, tool, model and peer discovery.', request: true, response: true, events: false, remote: true },
  { id: 'core.health', version: '1.0', description: 'N04 runtime health and authenticated-tool-context status.', request: true, response: true, events: false, remote: true },
  { id: 'environment.weather', version: '1.0', description: 'Weather lookup exposed from the existing N04 tool implementation.', request: true, response: true, events: false, remote: true },
];
