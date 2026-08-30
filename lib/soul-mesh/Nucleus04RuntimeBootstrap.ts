import type { Nucleus04Capability, Nucleus04Pilot } from '../soul-core/Nucleus04Processor';
import { nucleus04Processor } from '../soul-core/Nucleus04Processor';
import { Nucleus04HybridCapabilityBridge } from './Nucleus04HybridCapabilityBridge';

export interface Nucleus04Runtime {
  execute(capability: Exclude<Nucleus04Capability, 'ai-pilot'>, input: unknown): Promise<unknown>;
}

export interface Nucleus04RuntimeStatus {
  nucleus: 'N04';
  declared: Nucleus04Capability[];
  registered: Nucleus04Capability[];
  missing: Nucleus04Capability[];
  ready: boolean;
}

export function bootstrapNucleus04Runtime(
  runtime: Nucleus04Runtime,
  pilot: Nucleus04Pilot,
): Nucleus04RuntimeStatus {
  nucleus04Processor.registerPilot(pilot);
  const bridge = new Nucleus04HybridCapabilityBridge({
    execute: (capability, input) => runtime.execute(capability, input),
  });
  bridge.registerAll();

  const registered = nucleus04Processor.registeredCapabilities();
  const missing = nucleus04Processor.missingCapabilities();

  return {
    nucleus: 'N04',
    declared: [...nucleus04Processor.capabilities],
    registered,
    missing,
    ready: missing.length === 0,
  };
}
