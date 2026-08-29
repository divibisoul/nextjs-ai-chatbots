import { Nucleus04Processor, type Nucleus04Context } from '@/lib/soul-core/Nucleus04Processor';
import { NUCLEUS_04_CAPABILITIES } from '@/lib/soul-core/Nucleus04Capabilities';
import type { SoulMeshMessage } from './SoulMeshProtocol';
import type { SoulMeshHandler } from './endpoint';

/**
 * Makes the canonical execution chain explicit:
 * HTTP Mesh -> validation -> processor -> capability adapter -> result.
 * Existing capability implementations remain the source of truth.
 */
export function createN04MeshProcessorGateway(
  handlers: Record<string, SoulMeshHandler>,
): Record<string, SoulMeshHandler> {
  const processor = new Nucleus04Processor();
  const aiPilot = handlers['ai-pilot'];

  if (aiPilot) {
    processor.registerPilot({
      id: 'n04-mesh-ai-pilot-adapter',
      execute: (input, context) => aiPilot(input, context as SoulMeshMessage | undefined),
    });
  }

  for (const capability of NUCLEUS_04_CAPABILITIES) {
    if (capability === 'ai-pilot') continue;
    const implementation = handlers[capability];
    if (implementation) {
      processor.registerHandler(capability, (input, context) => implementation(input, context as SoulMeshMessage | undefined));
    }
  }

  return Object.fromEntries(
    NUCLEUS_04_CAPABILITIES.map((capability) => [
      capability,
      async (payload: unknown, message?: SoulMeshMessage) => {
        const context: Nucleus04Context = {
          metadata: {
            source: message?.source,
            target: message?.target,
            correlationId: message?.correlationId,
          },
        };
        return processor.execute({ capability, input: payload, requestId: message?.correlationId }, context);
      },
    ]),
  );
}
