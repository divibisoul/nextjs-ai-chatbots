import { describe, expect, it } from 'vitest';
import { Nucleus04Processor } from './Nucleus04Processor';

describe('Nucleus 04 processor', () => {
  it('exposes the core capabilities', () => {
    const processor = new Nucleus04Processor();
    expect(processor.supports('ai-pilot')).toBe(true);
    expect(processor.supports('tool-execution')).toBe(true);
    expect(processor.supports('mesh-communication')).toBe(true);
  });

  it('executes a registered capability handler', async () => {
    const processor = new Nucleus04Processor();
    processor.registerHandler('tool-execution', async (input) => ({ ok: true, input }));

    await expect(
      processor.execute({
        capability: 'tool-execution',
        input: { tool: 'getWeather' },
        requestId: 'tool-test',
      }),
    ).resolves.toEqual({ ok: true, input: { tool: 'getWeather' } });
  });

  it('executes the connected AI pilot without selecting a provider', async () => {
    const processor = new Nucleus04Processor();
    processor.registerPilot({
      id: 'test-pilot',
      execute: async (input) => ({ pilot: 'test-pilot', input }),
    });

    await expect(
      processor.execute({ capability: 'ai-pilot', input: { text: 'test' } }),
    ).resolves.toEqual({ pilot: 'test-pilot', input: { text: 'test' } });
  });

  it('rejects an unsupported capability', async () => {
    const processor = new Nucleus04Processor();
    await expect(
      processor.execute({ capability: 'not-a-capability' as never, input: null }),
    ).rejects.toThrow('Unsupported Nucleus 04 capability');
  });
});
