export const SOUL_CAPABILITIES = {
  chatOrchestrate: { id: 'chat.orchestrate', execution: 'WEB_SESSION' as const },
  aiTools: { id: 'chat.tools', execution: 'WEB_SESSION' as const },
  history: { id: 'chat.history', execution: 'WEB_SESSION' as const },
};

export function soulCapability(id: string) {
  return Object.values(SOUL_CAPABILITIES).find(capability => capability.id === id);
}
