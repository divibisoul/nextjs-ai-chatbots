import { strict as assert } from 'node:assert';
import test from 'node:test';
import { auditN04Capabilities } from './N04CapabilityAudit';

test('N04 capability audit exposes every declared capability state', () => {
  const audit = auditN04Capabilities();
  assert.equal(audit.length, 15);
  assert.ok(audit.every((entry) => entry.capability && (entry.state === 'REGISTERED' || entry.state === 'MISSING')));
});
