import type { Nucleus04Capability } from './Nucleus04Capabilities';
import { nucleus04Processor } from './Nucleus04Processor';

export type N04CapabilityState = 'REGISTERED' | 'MISSING';

export interface N04CapabilityAuditEntry {
  capability: Nucleus04Capability;
  state: N04CapabilityState;
}

export function auditN04Capabilities(): N04CapabilityAuditEntry[] {
  const registered = nucleus04Processor.registeredCapabilities();
  return nucleus04Processor.capabilities.map((capability) => ({
    capability,
    state: registered.includes(capability) ? 'REGISTERED' : 'MISSING',
  }));
}

export function assertN04CapabilitiesRegistered(): void {
  const missing = auditN04Capabilities().filter((entry) => entry.state === 'MISSING');
  if (missing.length > 0) {
    throw new Error(`N04_CAPABILITIES_NOT_REGISTERED:${missing.map((entry) => entry.capability).join(',')}`);
  }
}
