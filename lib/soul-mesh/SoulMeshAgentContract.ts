import type { SoulMeshMessage } from './SoulMeshProtocol';
import type { SoulLocalAgentContext } from './SoulMeshAgentRegistry';

export type Nucleus04Agent = {
  id: string;
  name: string;
  capabilities: string[];
  execute: (message: SoulMeshMessage | SoulLocalAgentContext) => Promise<unknown> | unknown;
};
