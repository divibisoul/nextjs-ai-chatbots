export type SoulCapabilityId =
  | 'document.create'
  | 'document.update'
  | 'document.suggestions'
  | 'environment.weather';

export type SoulCapability = {
  id: SoulCapabilityId;
  provider: 'nucleus-04';
  description: string;
  mesh: { inbound: boolean; outbound: boolean };
};

export const SOUL_CAPABILITIES: readonly SoulCapability[] = [
  { id: 'document.create', provider: 'nucleus-04', description: 'Create a typed artifact/document through the existing document handlers.', mesh: { inbound: true, outbound: true } },
  { id: 'document.update', provider: 'nucleus-04', description: 'Update an existing artifact/document using its existing handler.', mesh: { inbound: true, outbound: true } },
  { id: 'document.suggestions', provider: 'nucleus-04', description: 'Generate structured improvement suggestions for an existing document.', mesh: { inbound: true, outbound: true } },
  { id: 'environment.weather', provider: 'nucleus-04', description: 'Retrieve current and hourly weather data from coordinates.', mesh: { inbound: true, outbound: true } },
];

export function hasSoulCapability(id: string): id is SoulCapabilityId {
  return SOUL_CAPABILITIES.some((capability) => capability.id === id);
}
