import type { Nucleus04Capability } from '../soul-core/Nucleus04Capabilities';
import { nucleus04Processor } from '../soul-core/Nucleus04Processor';

/**
 * Adapter layer between N04's existing AI/tools and the canonical Soul Mesh.
 * It deliberately does not replace local tools; it exposes them as handlers.
 */
export interface N04CapabilityRuntime {
  execute(capability: Nucleus04Capability, input: unknown): Promise<unknown>;
}

export class Nucleus04HybridCapabilityBridge {
  private readonly runtime: N04CapabilityRuntime;

  constructor(runtime: N04CapabilityRuntime) {
    this.runtime = runtime;
  }

  register(capability: Nucleus04Capability) {
    nucleus04Processor.registerHandler(capability, (input) =>
      this.runtime.execute(capability, input),
    );
    return this;
  }

  registerAll() {
    for (const capability of nucleus04Processor.capabilities) {
      if (capability !== 'ai-pilot') this.register(capability);
    }
    return this;
  }

  executableCapabilities() {
    return nucleus04Processor.capabilities.filter((capability) =>
      capability === 'ai-pilot' || nucleus04Processor.supports(capability),
    );
  }
}
