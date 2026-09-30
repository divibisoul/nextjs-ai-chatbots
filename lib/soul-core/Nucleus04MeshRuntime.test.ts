import assert from 'node:assert/strict';
import test from 'node:test';
import { createNucleus04MeshHandlers } from './Nucleus04MeshRuntime';

test('N04 Mesh describe exposes only registered executable capabilities', async () => {
  const handlers = createNucleus04MeshHandlers();
  const description = await handlers['mesh.describe']();
  assert.equal(description.nucleus, 'N04');
  assert.equal(description.status, 'online');
  assert.ok(Array.isArray(description.executableCapabilities));
  assert.ok(Array.isArray(description.tools));
  assert.ok(!description.tools.includes('createDocument'));
});
