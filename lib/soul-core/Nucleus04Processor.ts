import type { Session } from 'next-auth';
import type { Nucleus04Capability } from './Nucleus04Capabilities';
import { NUCLEUS_04_CAPABILITIES } from './Nucleus04Capabilities';
import { createNucleus04MeshHandlers } from './Nucleus04MeshRuntime';
import { n04Cache } from './N04Cache';
import { N04PriorityQueue, type N04Priority } from './N04PriorityQueue';
import { n04SuperGpu } from './N04SuperGpuEngine';
import { delegateWork, isKnownN04Peer, offerCapabilities, requestSupport } from '../soul-mesh/N04CooperativeMesh';

export interface Nucleus04Context { session?: Session | null; dataStream?: unknown; metadata?: Record<string, unknown>; }
export interface Nucleus04Request { capability: Nucleus04Capability; input: unknown; requestId?: string; }
export interface Nucleus04Result { requestId: string; nucleus: 'nucleus-04'; capability: Nucleus04Capability; accepted: true; input: unknown; }
export interface Nucleus04Pilot { id: string; execute(input: unknown, context?: Nucleus04Context): Promise<unknown>; }
export type Nucleus04CapabilityHandler = (input: unknown, context?: Nucleus04Context) => Promise<unknown>;
function objectInput(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('N04_MESH_INPUT_MUST_BE_OBJECT'); return value as Record<string, unknown>; }
function stableSerialize(value: unknown): string { if (value === null || typeof value !== 'object') return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`; return `{${Object.entries(value as Record<string, unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stableSerialize(item)}`).join(',')}}`; }
function isPeerSource(value: unknown): boolean { return ['N01','N02','N03','N05','N06'].includes(String(value).toUpperCase()); }

export class Nucleus04Processor {
  readonly id = 'nucleus-04' as const;
  readonly capabilities = NUCLEUS_04_CAPABILITIES;
  private readonly handlers = new Map<string, Nucleus04CapabilityHandler>();
  private readonly queue = new N04PriorityQueue();
  private pilot?: Nucleus04Pilot;
  constructor(options: { session?: Session | null } = {}) {
    const runtime = createNucleus04MeshHandlers({ session: options.session });
    for (const capability of this.capabilities) {
      const handler = runtime[capability as keyof typeof runtime];
      if (handler) this.registerHandler(capability, async (input) => handler(input));
    }
    const baseMeshHandler = this.handlers.get('mesh-communication');
    this.registerHandler('mesh-communication', async (input, context) => {
      const request = objectInput(input); const target = String(request.target ?? '').toUpperCase();
      if (!isKnownN04Peer(target)) throw new Error(`INVALID_MESH_PEER:${target}`);
      const action = typeof request.action === 'string' ? request.action : 'request';
      if (action === 'offer') { const capabilities = Array.isArray(request.capabilities) ? request.capabilities.filter((value): value is string => typeof value === 'string') : [...this.capabilities]; return offerCapabilities(target, capabilities); }
      if (typeof request.capability !== 'string' || !request.capability.trim()) throw new Error('MESH_CAPABILITY_REQUIRED');
      if (action === 'support' || action === 'request') return requestSupport(target, request.capability, request.payload, typeof request.reason === 'string' ? request.reason : undefined);
      if (action === 'delegate') return delegateWork(target, request.capability, request.payload, typeof request.reason === 'string' ? request.reason : undefined);
      if (baseMeshHandler) return baseMeshHandler(input, context);
      throw new Error('N04_MESH_HANDLER_UNAVAILABLE');
    });
  }
  registerHandler(capability: Nucleus04Capability, handler: Nucleus04CapabilityHandler) { this.handlers.set(capability, handler); return this; }
  registerPilot(pilot: Nucleus04Pilot) { this.pilot = pilot; return this; }
  getPilot() { return this.pilot; }
  supports(capability: string): capability is Nucleus04Capability { return (this.capabilities as readonly string[]).includes(capability); }
  hasHandler(capability: string) { return this.handlers.has(capability); }
  getRegisteredCapabilities() { return [...this.handlers.keys()] as Nucleus04Capability[]; }
  async execute(request: Nucleus04Request, context?: Nucleus04Context) {
    if (!this.supports(request.capability)) throw new Error(`Unsupported Nucleus 04 capability: ${request.capability}`);
    if (request.capability === 'ai-pilot' && this.pilot) return this.pilot.execute(request.input, context);
    const handler = this.handlers.get(request.capability); if (!handler) throw new Error(`N04_CAPABILITY_HANDLER_MISSING:${request.capability}`);
    const source = String(context?.metadata?.source ?? '').toUpperCase(); const priority: N04Priority = isPeerSource(source) ? 'mesh' : ['batch.process','parallel.map'].includes(request.capability) ? 'batch' : 'internal';
    const cacheable = ['ai-pilot','environment.weather','mesh.describe','core.health'].includes(request.capability);
    const run = () => cacheable ? n04Cache.getOrSet(`${request.capability}:${stableSerialize(request.input)}`, () => handler(request.input, context)) : handler(request.input, context);
    return n04SuperGpu.submit(() => this.queue.add(run, priority), priority);
  }
  accept(request: Nucleus04Request): Nucleus04Result { if (!this.supports(request.capability)) throw new Error(`Unsupported Nucleus 04 capability: ${request.capability}`); return { requestId: request.requestId ?? crypto.randomUUID(), nucleus: this.id, capability: request.capability, accepted: true, input: request.input }; }
}
export const nucleus04Processor = new Nucleus04Processor();
