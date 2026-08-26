import { describe, expect, it } from 'vitest';
import { nucleus04Processor } from './Nucleus04Processor';

describe('Nucleus 04 processor', () => {
  it('exposes the core capabilities', () => {
    expect(nucleus04Processor.supports('ai-pilot')).toBe(true);
    expect(nucleus04Processor.supports('tool-execution')).toBe(true);
    expect(nucleus04Processor.supports('mesh-communication')).toBe(true);
  });

  it('accepts a supported request without coupling to an AI provider', () => {
    const result = nucleus04Processor.accept({
      capability: 'context-orchestration',
      input: { text: 'test' },
      requestId: 'n4-test',
    });

    expect(result.nucleus).toBe('nucleus-04');
    expect(result.requestId).toBe('n4-test');
    expect(result.accepted).toBe(true);
  });
});
