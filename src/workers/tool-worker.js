const { parentPort } = require('node:worker_threads');

function runTool(input) {
  const payload = input && typeof input === 'object' && 'operation' in input ? input.input : input;
  const operation = input && typeof input === 'object' && 'operation' in input ? input.operation : 'run';
  return { kind: 'tool', ok: true, operation, result: payload };
}

parentPort.on('message', (input) => {
  try { parentPort.postMessage(runTool(input)); }
  catch (error) { parentPort.postMessage({ kind: 'tool', ok: false, error: error instanceof Error ? error.message : String(error) }); }
});
