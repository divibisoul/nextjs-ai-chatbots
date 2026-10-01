import test from 'node:test';
import assert from 'node:assert/strict';
import { delegateN04ExternalCapability } from './N04ExternalCapabilityBridge';

test('N04 external capability bridge requires correlation', async () => {
  await assert.rejects(
    delegateN04ExternalCapability({ capability: 'strategic_planning', correlationId: ' ' }),
    /N04_EXTERNAL_CORRELATION_REQUIRED/,
  );
});
