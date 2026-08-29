// The N04 unit/contract suite runs directly under Node/tsx, outside Next.js' server component runtime.
// Next.js intentionally makes `server-only` throw when loaded through this raw Node path.
// Keep the production guard intact and neutralize only that marker for these tests.
const Module = require('node:module');
const originalLoad = Module._load;

Module._load = function n04TestLoad(request, parent, isMain) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, parent, isMain);
};
