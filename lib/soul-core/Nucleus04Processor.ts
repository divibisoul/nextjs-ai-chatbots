import {
  NUCLEUS_04_CAPABILITIES,
  type Nucleus04Capability,
} from './Nucleus04Capabilities';

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

/**
 * Core boundary for Nucleus 04. It deliberately does not select or own an AI
 * provider: the eventual AI Pilot is supplied by the surrounding Soul system.
 * Existing tools, artifacts, documents and streaming implementations remain
 * behind this boundary and can be attached incrementally.
 */
export class Nucleus04Processor {
  readonly id = 'nucleus-04' as const;
  readonly capabilities = NUCLEUS_04_CAPABILITIES;

  supports(capability: string): capability is Nucleus04Capability {
    return this.capabilities.includes(capability as Nucleus04Capability);
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

export const nucleus04Processor = new Nucleus04Processor();
