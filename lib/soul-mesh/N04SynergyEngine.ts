import type { SoulNucleus, SoulMeshPeerProfile } from './SoulMeshProtocol';

export type N04SynergyMode = 'LOCAL' | 'PAIR' | 'TRIAD' | 'FUSION';

export interface N04CapabilityDescriptor {
  capability: string;
  provider: SoulNucleus;
  transports: readonly string[];
}

export interface N04SynergyPlan {
  mode: N04SynergyMode;
  providers: readonly SoulNucleus[];
  requestedCapabilities: readonly string[];
  executableCapabilities: readonly string[];
  compositeCapabilities: readonly string[];
  score: number;
  rationale: readonly string[];
}

const PEERS: readonly SoulNucleus[] = ['N01', 'N02', 'N03', 'N04', 'N05', 'N06'];

/**
 * Computes cooperative capability composition without replacing any nucleus.
 * A composite capability is derived when two or more independent nuclei expose
 * compatible capabilities. The engine only plans; execution stays in the
 * existing Soul Mesh/runtime so the six nuclei remain independently deployable.
 */
export class N04SynergyEngine {
  plan(
    profiles: ReadonlyMap<SoulNucleus, SoulMeshPeerProfile>,
    requestedCapabilities: readonly string[] = [],
  ): N04SynergyPlan {
    const available = new Map<string, SoulNucleus[]>();
    for (const nucleus of PEERS) {
      const profile = profiles.get(nucleus);
      if (!profile) continue;
      for (const capability of profile.capabilities) {
        const providers = available.get(capability) ?? [];
        providers.push(nucleus);
        available.set(capability, providers);
      }
    }

    const executable = requestedCapabilities.filter((capability) => available.has(capability));
    const composites: string[] = [];
    const rationale: string[] = [];

    const addComposite = (name: string, a: string, b: string) => {
      const aProviders = available.get(a) ?? [];
      const bProviders = available.get(b) ?? [];
      if (aProviders.length === 0 || bProviders.length === 0) return;
      const distinct = new Set([...aProviders, ...bProviders]);
      if (distinct.size < 2) return;
      composites.push(name);
      rationale.push(`${name} composes ${a} + ${b} across ${[...distinct].join(', ')}`);
    };

    addComposite('reasoning.execute', 'ai-pilot', 'context-orchestration');
    addComposite('artifact-to-document', 'artifact-processing', 'document-processing');
    addComposite('tool-to-workflow', 'tool-execution', 'workflow.execute');
    addComposite('parallel-intelligence', 'parallel.map', 'batch.process');
    addComposite('mesh-delegated-execution', 'mesh-communication', 'workflow.execute');

    const providers = new Set<SoulNucleus>();
    for (const capability of executable) {
      for (const provider of available.get(capability) ?? []) providers.add(provider);
    }

    const providerCount = Math.max(1, providers.size);
    const coverage = requestedCapabilities.length === 0 ? 1 : executable.length / requestedCapabilities.length;
    const score = Number((Math.min(1, coverage) * (1 + Math.log2(providerCount) / 4)).toFixed(3));
    const mode: N04SynergyMode = providerCount >= 4 ? 'FUSION' : providerCount >= 3 ? 'TRIAD' : providerCount >= 2 ? 'PAIR' : 'LOCAL';

    return {
      mode,
      providers: [...providers],
      requestedCapabilities: [...requestedCapabilities],
      executableCapabilities: executable,
      compositeCapabilities: [...new Set(composites)],
      score,
      rationale,
    };
  }
}

export const n04SynergyEngine = new N04SynergyEngine();
