import type { N04MeshRuntimeContext } from '@/lib/soul-mesh/endpoint';
import { createNucleus04Runtime } from '@/lib/soul-core/Nucleus04Runtime';
import { supportsNucleus04Capability } from '@/lib/soul-core/Nucleus04Capabilities';

export type OctaCoreN04Request = {
  capability: string;
  payload: unknown;
  job_id?: string;
  correlation_id?: string;
};

export async function executeOctaCoreN04(request: OctaCoreN04Request, context?: N04MeshRuntimeContext) {
  if (!request || typeof request !== 'object') throw new Error('OCTACORE_N04_REQUEST_REQUIRED');
  const capability = request.capability?.trim();
  if (!capability || !supportsNucleus04Capability(capability)) {
    throw new Error(`OCTACORE_N04_CAPABILITY_NOT_DECLARED:${capability ?? ''}`);
  }
  const runtime = createNucleus04Runtime({
    session: context.session,
    dataStream: context.dataStream as N04MeshRuntimeContext['dataStream'],
  });
  const registered = runtime.processor.registeredCapabilities();
  if (!registered.includes(capability)) {
    throw new Error(`OCTACORE_N04_CAPABILITY_PENDING_RUNTIME:${capability}`);
  }
  try {
    const value = await runtime.processor.execute({
      capability: capability as Parameters<typeof runtime.processor.execute>[0]['capability'],
      input: request.payload,
    }, {
      session: context.session,
      dataStream: context.dataStream,
      metadata: {
        mesh: true,
        correlationId: request.correlation_id,
      },
    });
    return {
      ok: true,
      nucleus: 'N04' as const,
      capability,
      correlationId: request.correlation_id ?? null,
      jobId: request.job_id ?? null,
      value,
    };
  } catch (error) {
    throw new Error(`OCTACORE_N04_EXECUTION_ERROR:${error instanceof Error ? error.message : String(error)}`);
  }

}
