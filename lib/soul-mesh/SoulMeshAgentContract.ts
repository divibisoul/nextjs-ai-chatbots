import type { SoulMeshMessage } from './SoulMeshProtocol';

export type Nucleus04Agent = {
  id: string;
  name: string;
  capabilities: string[];
  execute: (message: SoulMeshMessage) => Promise<unknown> | unknown;
};
