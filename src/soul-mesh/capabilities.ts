export type SoulExecution = 'WEB_SESSION' | 'MESH_DELEGATION';

export interface SoulCapability {
  id: string;
  execution: SoulExecution;
  consumes?: string[];
  produces?: string[];
  latencyClass?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const SOUL_CAPABILITIES: Record<string, SoulCapability> = {
  chatOrchestrate: { id: 'chat.orchestrate', execution: 'WEB_SESSION', consumes: ['text/plain', 'chat.context'], produces: ['task.plan'], latencyClass: 'MEDIUM' },
  aiTools: { id: 'chat.tools', execution: 'WEB_SESSION', produces: ['tool.result'], latencyClass: 'LOW' },
  history: { id: 'chat.history', execution: 'WEB_SESSION', produces: ['chat.context'], latencyClass: 'LOW' },
  synthesisSupport: { id: 'support.synthesis', execution: 'MESH_DELEGATION', consumes: ['text/plain', 'task.plan', 'tool.result'], produces: ['text/plain'], latencyClass: 'MEDIUM' },
};

export function soulCapability(id: string): SoulCapability | undefined {
  return Object.values(SOUL_CAPABILITIES).find(capability => capability.id === id);
}

export function composeCapabilities(primaryId: string, supportingIds: string[]): SoulCapability | undefined {
  const primary = soulCapability(primaryId);
  const supporting = supportingIds.map(soulCapability).filter(Boolean) as SoulCapability[];
  if (!primary || supporting.length === 0) return primary;
  return {
    id: `composed.${primary.id}`,
    execution: 'MESH_DELEGATION',
    consumes: Array.from(new Set([...(primary.consumes ?? []), ...supporting.flatMap(item => item.consumes ?? [])])),
    produces: Array.from(new Set([...(primary.produces ?? []), ...supporting.flatMap(item => item.produces ?? [])])),
    latencyClass: primary.latencyClass ?? 'MEDIUM',
  };
}
