import type { Session } from 'next-auth';
import type { Nucleus04Capability } from './Nucleus04Capabilities';
import { NUCLEUS_04_CAPABILITIES } from './Nucleus04Capabilities';
import { createNucleus04MeshHandlers } from './Nucleus04MeshRuntime';
import { n04Cache } from './N04Cache';
import { N04PriorityQueue } from './N04PriorityQueue';

export interface Nucleus04Context { session?: Session | null; dataStream?: unknown; metadata?: Record<string, unknown>; }
export interface Nucleus04Request { capability: Nucleus04Capability; input: unknown; requestId?: string; }
export interface Nucleus04Result { requestId: string; nucleus: 'nucleus-04'; capability: Nucleus04Capability; accepted: true; input: unknown; }
export interface Nucleus04Pilot { id: string; execute(input: unknown, context?: Nucleus04Context): Promise<unknown>; }
export type Nucleus04CapabilityHandler = (input: unknown, context?: Nucleus04Context) => Promise<unknown>;

/** Runtime boundary for N04. Advertised capabilities are bound to the real Mesh runtime. */
export class Nucleus04Processor {
  readonly id = 'nucleus-04' as const;
  readonly capabilities = NUCLEUS_04_CAPABILITIES;
  private readonly handlers = new Map<string, Nucleus04CapabilityHandler>();
  private readonly queue = new N04PriorityQueue(Math.max(1, Number(process.env.N04_HANDLER_CONCURRENCY ?? 4)));
  private pilot?: Nucleus04Pilot;

  constructor(options: { session?: Session | null } = {}) {
    const runtime = createNucleus04MeshHandlers({ session: options.session });
    for (const capability of this.capabilities) {
      const handler = runtime[capability];
      if (handler) this.registerHandler(capability, async (input) => handler(input));
    }
  }

  registerHandler(capability: Nucleus04Capability, handler: Nucleus04CapabilityHandler) {
    this.handlers.set(capability, handler);
    return this;
  }

  registerPilot(pilot: Nucleus04Pilot) { this.pilot = pilot; return this; }
  getPilot() { return this.pilot; }
  supports(capability: string): capability is Nucleus04Capability { return (this.capabilities as readonly string[]).includes(capability); }

  async execute(request: Nucleus04Request, context?: Nucleus04Context) {
    if (!this.supports(request.capability)) throw new Error(`Unsupported Nucleus 04 capability: ${request.capability}`);
    if (request.capability === 'ai-pilot' && this.pilot) return this.pilot.execute(request.input, context);
    const handler = this.handlers.get(request.capability);
    if (!handler) throw new Error(`N04_CAPABILITY_HANDLER_MISSING:${request.capability}`);

    const priority = context?.metadata?.source === 'N01' ? 'mesh' : 'internal';
    const cacheable = ['ai-pilot', 'environment.weather', 'context-orchestration', 'mesh.describe', 'core.health'].includes(request.capability);
    const run = () => cacheable
      ? n04Cache.getOrSet(`${request.capability}:${JSON.stringify(request.input)}`, () => handler(request.input, context))
      : handler(request.input, context);
    return this.queue.add(run, priority);
  }

  accept(request: Nucleus04Request): Nucleus04Result {
    if (!this.supports(request.capability)) throw new Error(`Unsupported Nucleus 04 capability: ${request.capability}`);
    return { requestId: request.requestId ?? crypto.randomUUID(), nucleus: this.id, capability: request.capability, accepted: true, input: request.input };
  }
}

export const nucleus04Processor = new Nucleus04Processor();
