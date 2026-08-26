import { describe, expect, it } from 'vitest';
import { createMeshRequest, validateMeshResponse } from './SoulMeshE2EContract';

describe('Soul Mesh Nucleus 04 E2E contract', () => {
  it('creates a correlated request', () => {
    const request = createMeshRequest('chatbots', 'eternium', 'context-orchestration', { test: true });
    expect(request.protocol).toBe('soul-mesh/1');
    expect(request.source).toBe('chatbots');
    expect(request.target).toBe('eternium');
    expect(request.correlationId).toBeTruthy();
  });

  it('accepts only a correctly correlated reverse response', () => {
    const request = createMeshRequest('chatbots', 'eternium', 'context-orchestration', {});
    const response = {
      ...request,
      id: crypto.randomUUID(),
      source: 'eternium' as const,
      target: 'chatbots' as const,
      kind: 'response' as const,
    };
    expect(validateMeshResponse(request, response)).toBe(true);
    expect(validateMeshResponse(request, { ...response, correlationId: crypto.randomUUID() })).toBe(false);
  });
});
