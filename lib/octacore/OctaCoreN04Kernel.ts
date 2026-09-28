import { type Nucleus04Context, Nucleus04Processor } from '@/lib/soul-core/Nucleus04Processor';
import { supportsNucleus04Capability } from '@/lib/soul-core/Nucleus04Capabilities';

export type OctaCoreN04Request = {
  capability: string;
  payload: unknown;
  job_id?: string;
  correlation_id: string;
};

export async function executeOctaCoreN04(
  request: OctaCoreN04Request,
  context: Nucleus04Context,
  processor: Nucleus04Processor,
) {
  if (!request || typeof request !== 'object') {
    throw new Error('OCTACORE_N04_REQUEST_REQUIRED');
  }
  const capability = request.capability?.trim();
  if (!capability) throw new Error('OCTACORE_N04_CAPABILITY_REQUIRED');
  if (!supportsNucleus04Capability(capability)) {
    throw new Error(`OCTACORE_N04_CAPABILITY_NOT_DECLARED:${capability}`);
  }
  const executable = processor.registeredCapabilities();
  if (!executable.includes(capability)) {
    throw new Error(`OCTACORE_N04_CAPABILITY_NOT_EXECUTABLE:${capability}`);
  }

  const result = await processor.execute(
    { capability, input: request.payload },
    {
      ...context,
      metadata: {
        ...(context.metadata ?? {}),
        octacore: true,
        job_id: request.job_id ?? null,
        correlationId: request.correlation_id,
      },
    },
  );

  return {
    ok: true,
    nucleus: 'N04' as const,
    capability,
    job_id: request.job_id ?? null,
    correlation_id: request.correlation_id,
    result,
  };
}
