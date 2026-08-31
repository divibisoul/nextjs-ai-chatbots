import { describe, expect, it } from 'vitest';

describe('Web3.Storage adapter', () => {
  it('requires a token before upload', async () => {
    const original = process.env.WEB3_STORAGE_TOKEN;
    delete process.env.WEB3_STORAGE_TOKEN;
    try {
      const { uploadFile } = await import('./web3-storage');
      await expect(uploadFile(new Blob(['test']), 'test.txt')).rejects.toThrow('WEB3_STORAGE_TOKEN_REQUIRED');
    } finally {
      if (original === undefined) delete process.env.WEB3_STORAGE_TOKEN;
      else process.env.WEB3_STORAGE_TOKEN = original;
    }
  });
});
