const { parentPort } = require('node:worker_threads');

function analyzeArtifact(input) {
  const payload = input && typeof input === 'object' && 'operation' in input ? input.input : input;
  const operation = input && typeof input === 'object' && 'operation' in input ? input.operation : 'process';
  return { kind: 'artifact', ok: true, operation, result: { type: 'artifact', payload } };
}

parentPort.on('message', (input) => {
  try { parentPort.postMessage(analyzeArtifact(input)); }
  catch (error) { parentPort.postMessage({ kind: 'artifact', ok: false, error: error instanceof Error ? error.message : String(error) }); }
});
