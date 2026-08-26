import { SOUL_CAPABILITIES, type SoulCapabilityId } from './capabilities';

export type SoulChatRequest = {
  message: string;
  requestedCapability?: SoulCapabilityId;
  context?: unknown;
};

export type SoulChatRoute = {
  mode: 'conversation' | 'capability';
  capability?: SoulCapabilityId;
  provider: 'nucleus-02';
};

export function routeSoulChat(request: SoulChatRequest): SoulChatRoute {
  if (request.requestedCapability && SOUL_CAPABILITIES.some((item) => item.id === request.requestedCapability)) {
    return { mode: 'capability', capability: request.requestedCapability, provider: 'nucleus-02' };
  }

  return { mode: 'conversation', provider: 'nucleus-02' };
}
