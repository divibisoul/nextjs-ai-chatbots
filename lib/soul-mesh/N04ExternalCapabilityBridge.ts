import { sendToWithCorrelation } from './peer-client';

export type N04ExternalCapabilityRequest = {
  capability: string;
  payload?: unknown;
  correlationId: string;
  workloads?: unknown[];
  candidate?: Record<string, unknown>;
  strategy?: string;
};

export async function delegateN04ExternalCapability(
  request: N04ExternalCapabilityRequest,
): Promise<unknown> {
  const capability = request.capability.trim();
  if (!capability) throw new Error('N04_EXTERNAL_CAPABILITY_REQUIRED');
  const correlationId = request.correlationId.trim();
  if (!correlationId) throw new Error('N04_EXTERNAL_CORRELATION_REQUIRED');

  const result = await sendToWithCorrelation(
    'N02',
    capability,
    {
      payload: request.payload ?? {},
      metadata: {
        prefrontal_orbital: 'true',
        workloads_json: JSON.stringify(request.workloads ?? []),
        candidate_json: JSON.stringify(request.candidate ?? { capability }),
        strategy: request.strategy ?? 'n04-external-tool-preflight',
      },
    },
    correlationId,
  );
  return result.payload;
}
