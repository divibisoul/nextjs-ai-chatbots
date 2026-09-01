import type { SoulMeshMessage } from './SoulMeshProtocol';
import type { Nucleus04Agent } from './SoulMeshAgentContract';

export class SoulMeshAgentRegistry {
  private readonly agents = new Map<string, Nucleus04Agent>();

  register(agent: Nucleus04Agent): void {
    this.agents.set(agent.id, agent);
  }

  findForCapability(capability: string): Nucleus04Agent | undefined {
    return [...this.agents.values()].find((agent) => agent.capabilities.includes(capability));
  }

  async execute(message: SoulMeshMessage): Promise<unknown> {
    const capability = message.capability;
    if (!capability) throw new Error('CAPABILITY_REQUIRED');
    const agent = this.findForCapability(capability);
    if (!agent) throw new Error(`AGENT_NOT_FOUND:${capability}`);
    return agent.execute(message);
  }

  describe() {
    return [...this.agents.values()].map(({ id, name, capabilities }) => ({ id, name, capabilities }));
  }
}
