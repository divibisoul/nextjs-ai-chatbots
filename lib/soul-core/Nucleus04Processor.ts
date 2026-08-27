import type { Nucleus04Capability } from './Nucleus04Capabilities';
import { NUCLEUS_04_CAPABILITIES } from './Nucleus04Capabilities';
import { n04WorkerPool } from './N04WorkerPool';
import { n04TaskOrchestrator } from './N04TaskOrchestrator';
import { n04Cache } from './N04Cache';
import { N04PriorityQueue } from './N04PriorityQueue';

export interface Nucleus04Context { session?: unknown; dataStream?: unknown; metadata?: Record<string, unknown>; }
export interface Nucleus04Request { capability: Nucleus04Capability; input: unknown; requestId?: string; }
export interface Nucleus04Result { requestId: string; nucleus: 'nucleus-04'; capability: Nucleus04Capability; accepted: true; input: unknown; }
export interface Nucleus04Pilot { id: string; execute(input: unknown, context?: Nucleus04Context): Promise<unknown>; }
export type Nucleus04CapabilityHandler = (input: unknown, context?: Nucleus04Context) => Promise<unknown>;

/** Runtime boundary for N04. All advertised capabilities have an explicit handler. */
export class Nucleus04Processor {
  readonly id = 'nucleus-04' as const;
  readonly capabilities = NUCLEUS_04_CAPABILITIES;
  private readonly handlers = new Map<string, Nucleus04CapabilityHandler>();
  private readonly queue = new N04PriorityQueue(Math.max(1, Number(process.env.N04_HANDLER_CONCURRENCY ?? 4)));
  private pilot?: Nucleus04Pilot;

  constructor() {
    this.registerHandler('tool-execution', (input) => n04WorkerPool.run({ kind: 'tool', input }));
    this.registerHandler('artifact-processing', (input) => n04WorkerPool.run({ kind: 'artifact', input }));
    this.registerHandler('document-processing', (input) => n04WorkerPool.run({ kind: 'document', input }));
    this.registerHandler('context-orchestration', async (input) => {
      const workflow = input as { tasks?: Array<{ kind: 'document'|'artifact'|'tool'; input: unknown }> };
      return n04TaskOrchestrator.execute({ tasks: workflow.tasks ?? [] });
    });
    this.registerHandler('streaming', async (input) => ({ ok: true, mode: 'streaming', input }));
    this.registerHandler('mesh-communication', async (input) => ({ ok: true, mode: 'mesh', input }));
    this.registerHandler('batch.process', async (input) => {
      const tasks = (input as { tasks?: Array<{ kind: 'document'|'artifact'|'tool'; input: unknown }> }).tasks ?? [];
      return n04TaskOrchestrator.execute({ tasks });
    });
    this.registerHandler('document.create', async (input) => n04WorkerPool.run({ kind: 'document', input: { operation: 'create', input } }));
    this.registerHandler('document.edit', async (input) => n04WorkerPool.run({ kind: 'document', input: { operation: 'edit', input } }));
    this.registerHandler('artifact.analyze', async (input) => n04WorkerPool.run({ kind: 'artifact', input: { operation: 'analyze', input } }));
    this.registerHandler('tool.run', async (input) => n04WorkerPool.run({ kind: 'tool', input: { operation: 'run', input } }));
    this.registerHandler('workflow.execute', async (input) => n04TaskOrchestrator.execute(input as { tasks: Array<{ kind: 'document'|'artifact'|'tool'; input: unknown }> }));
    this.registerHandler('schedule.task', async (input) => {
      const task = input as { delayMs?: number; capability?: Nucleus04Capability; input?: unknown };
      const delay = Math.max(0, task.delayMs ?? 0);
      return new Promise((resolve) => setTimeout(() => resolve({ scheduled: true, capability: task.capability, input: task.input }), delay));
    });
    this.registerHandler('parallel.map', async (input) => {
      const value = input as { kind?: 'document'|'artifact'|'tool'; items?: unknown[] };
      return n04WorkerPool.map(value.kind ?? 'tool', value.items ?? []);
    });
  }

  registerHandler(capability: Nucleus04Capability, handler: Nucleus04CapabilityHandler) { this.handlers.set(capability, handler); return this; }
  registerPilot(pilot: Nucleus04Pilot) { this.pilot = pilot; return this; }
  getPilot() { return this.pilot; }
  supports(capability: string): capability is Nucleus04Capability { return (this.capabilities as readonly string[]).includes(capability); }

  async execute(request: Nucleus04Request, context?: Nucleus04Context) {
    if (!this.supports(request.capability)) throw new Error(`Unsupported Nucleus 04 capability: ${request.capability}`);
    if (request.capability === 'ai-pilot') {
      if (!this.pilot) throw new Error('N04_AI_PILOT_ADAPTER_NOT_CONFIGURED');
      return this.pilot.execute(request.input, context);
    }
    const handler = this.handlers.get(request.capability);
    if (!handler) throw new Error(`N04_CAPABILITY_HANDLER_MISSING:${request.capability}`);
    const priority = context?.metadata?.source === 'N01' ? 'mesh' : 'internal';
    return this.queue.add(() => n04Cache.getOrSet(`${request.capability}:${JSON.stringify(request.input)}`, () => handler(request.input, context)), priority);
  }

  accept(request: Nucleus04Request): Nucleus04Result {
    if (!this.supports(request.capability)) throw new Error(`Unsupported Nucleus 04 capability: ${request.capability}`);
    return { requestId: request.requestId ?? crypto.randomUUID(), nucleus: this.id, capability: request.capability, accepted: true, input: request.input };
  }
}

export const nucleus04Processor = new Nucleus04Processor();
