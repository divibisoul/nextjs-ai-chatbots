import assert from 'node:assert/strict';
import test from 'node:test';

test('Web3.Storage adapter requires a token before upload', async () => {
  const original = process.env.WEB3_STORAGE_TOKEN;
  delete process.env.WEB3_STORAGE_TOKEN;
  try {
    const { uploadFile } = await import('./web3-storage');
    await assert.rejects(
      () => uploadFile(new Blob(['test']), 'test.txt'),
      /WEB3_STORAGE_TOKEN_REQUIRED/,
    );
  } finally {
    if (original === undefined) delete process.env.WEB3_STORAGE_TOKEN;
    else process.env.WEB3_STORAGE_TOKEN = original;
  }
});
