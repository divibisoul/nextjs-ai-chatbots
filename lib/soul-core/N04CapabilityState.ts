import type { Nucleus04Capability } from './Nucleus04Capabilities';
import { nucleus04Processor } from './Nucleus04Processor';

export interface N04CapabilityState {
  capability: Nucleus04Capability;
  registered: boolean;
  executable: boolean;
}

export function getN04CapabilityState(): N04CapabilityState[] {
  const registered = new Set(nucleus04Processor.registeredCapabilities());
  return nucleus04Processor.capabilities.map((capability) => ({
    capability,
    registered: registered.has(capability),
    executable: registered.has(capability),
  }));
}
