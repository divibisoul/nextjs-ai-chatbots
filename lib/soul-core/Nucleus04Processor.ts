import type { Nucleus04Capability } from './Nucleus04Capabilities';
import { NUCLEUS_04_CAPABILITIES } from './Nucleus04Capabilities';

export interface Nucleus04Context {
  session?: unknown;
  dataStream?: unknown;
  metadata?: Record<string, unknown>;
}

export interface Nucleus04Request {
  capability: Nucleus04Capability;
  input: unknown;
  requestId?: string;
}

export interface Nucleus04Result {
  requestId: string;
  nucleus: 'nucleus-04';
  capability: Nucleus04Capability;
  accepted: true;
  input: unknown;
}

export interface Nucleus04Pilot {
  id: string;
  execute(input: unknown, context?: Nucleus04Context): Promise<unknown>;
}

export type Nucleus04CapabilityHandler = (
  input: unknown,
  context?: Nucleus04Context,
) => Promise<unknown>;

/**
 * Runtime boundary for Nucleus 04. The processor is provider-neutral: AI
 * providers, tools and Mesh transports attach through explicit adapters.
 */
export class Nucleus04Processor {
  readonly id = 'nucleus-04' as const;
  readonly capabilities = NUCLEUS_04_CAPABILITIES;
  private readonly handlers = new Map<string, Nucleus04CapabilityHandler>();
  private pilot?: Nucleus04Pilot;

  registerHandler(capability: Nucleus04Capability, handler: Nucleus04CapabilityHandler) {
    this.handlers.set(capability, handler);
    return this;
  }

  registerPilot(pilot: Nucleus04Pilot) {
    this.pilot = pilot;
    return this;
  }

  getPilot() {
    return this.pilot;
  }

  registeredCapabilities(): Nucleus04Capability[] {
    return this.capabilities.filter((capability) =>
      capability === 'ai-pilot' ? Boolean(this.pilot) : this.handlers.has(capability),
    );
  }

  missingCapabilities(): Nucleus04Capability[] {
    const registered = new Set(this.registeredCapabilities());
    return this.capabilities.filter((capability) => !registered.has(capability));
  }

  supports(capability: string): capability is Nucleus04Capability {
    return (this.capabilities as readonly string[]).includes(capability);
  }

  async execute(request: Nucleus04Request, context?: Nucleus04Context) {
    if (!this.supports(request.capability)) {
      throw new Error(`Unsupported Nucleus 04 capability: ${request.capability}`);
    }

    if (request.capability === 'ai-pilot') {
      if (!this.pilot) throw new Error('No AI pilot is connected to Nucleus 04');
      return this.pilot.execute(request.input, context);
    }

    const handler = this.handlers.get(request.capability);
    if (!handler) {
      throw new Error(`Capability is registered but has no runtime handler: ${request.capability}`);
    }

    return handler(request.input, context);
  }

  accept(request: Nucleus04Request): Nucleus04Result {
    if (!this.supports(request.capability)) {
      throw new Error(`Unsupported Nucleus 04 capability: ${request.capability}`);
    }

    return {
      requestId: request.requestId ?? crypto.randomUUID(),
      nucleus: this.id,
      capability: request.capability,
      accepted: true,
      input: request.input,
    };
  }
}

/** Backwards-compatible process instance for local consumers. */
export const nucleus04Processor = new Nucleus04Processor();
