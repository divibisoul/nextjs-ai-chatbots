import type { N04MeshRuntimeContext } from '@/lib/soul-mesh/endpoint';
import { createNucleus04MeshHandlers } from '@/lib/soul-core/Nucleus04MeshRuntime';
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
  const handlers = createNucleus04MeshHandlers({ session: context?.session ?? null });
  const executable = handlers as Record<string, (payload: unknown) => unknown | Promise<unknown>>;
  const handler = executable[capability];
  if (!handler) {
    throw new Error(`OCTACORE_N04_CAPABILITY_PENDING_RUNTIME:${capability}`);
  }
  const value = await handler(request.payload);
  return {
    ok: true,
    nucleus: 'N04' as const,
    capability,
    correlationId: request.correlation_id ?? null,
    jobId: request.job_id ?? null,
    value,
  };
}
