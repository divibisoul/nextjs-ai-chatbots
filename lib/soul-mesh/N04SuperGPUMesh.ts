import { randomUUID } from 'node:crypto';
import { sendToWithCorrelation } from './peer-client';

export const N04_SUPERGPU_MESH_CAPABILITY = 'mesh.supergpu.execute@1.0.0' as const;

export async function requestN07SuperGPU(
  values: number[],
  operation = 'identity',
  device?: string,
  correlationId = randomUUID(),
) {
  if (!Array.isArray(values) || values.length === 0 || values.some(value => !Number.isFinite(value))) {
    throw new Error('SUPERGPU_VALUES_INVALID');
  }
  if (!operation.trim()) throw new Error('SUPERGPU_OPERATION_REQUIRED');
  return sendToWithCorrelation(
    'N07',
    N04_SUPERGPU_MESH_CAPABILITY,
    {
      values,
      metadata: { operation, ...(device?.trim() ? { device: device.trim() } : {}) },
    },
    correlationId,
    correlationId,
  );
}
