import type { SoulMeshMessage } from './SoulMeshProtocol';
import type { Nucleus04Agent } from './SoulMeshAgentContract';

export type SoulLocalAgentContext = {
  kind: 'local';
  nucleus: 'N04';
  capability: string;
  payload: unknown;
  correlationId: string;
};

export type SoulAgentExecutionMessage = SoulMeshMessage | SoulLocalAgentContext;

export class SoulMeshAgentRegistry {
  private readonly agents = new Map<string, Nucleus04Agent>();

  register(agent: Nucleus04Agent): void {
    this.agents.set(agent.id, agent);
  }

  findForCapability(capability: string): Nucleus04Agent | undefined {
    return [...this.agents.values()].find((agent) => agent.capabilities.includes(capability));
  }

  async execute(message: SoulMeshMessage): Promise<unknown> {
    if (message.source === message.target) throw new Error('SELF_ROUTE_NOT_ALLOWED');
    return this.executeAgent(message.capability, message);
  }

  async executeLocal(capability: string, payload: unknown, correlationId = crypto.randomUUID()): Promise<unknown> {
    const context: SoulLocalAgentContext = { kind: 'local', nucleus: 'N04', capability, payload, correlationId };
    return this.executeAgent(capability, context);
  }

  private async executeAgent(capability: string | undefined, message: SoulAgentExecutionMessage): Promise<unknown> {
    if (!capability) throw new Error('CAPABILITY_REQUIRED');
    const agent = this.findForCapability(capability);
    if (!agent) throw new Error(`AGENT_NOT_FOUND:${capability}`);
    return agent.execute(message);
  }

  describe() {
    return [...this.agents.values()].map(({ id, name, capabilities }) => ({ id, name, capabilities }));
  }
}
