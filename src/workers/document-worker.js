const { parentPort } = require('node:worker_threads');

function processDocument(input) {
  if (input && typeof input === 'object') {
    const { operation, input: payload } = input;
    if (operation === 'create') return { kind: 'document', ok: true, operation, result: { type: 'document', content: payload } };
    if (operation === 'edit') return { kind: 'document', ok: true, operation, result: { type: 'document', content: payload } };
  }
  return { kind: 'document', ok: true, operation: 'process', result: input };
}

parentPort.on('message', (input) => {
  try { parentPort.postMessage(processDocument(input)); }
  catch (error) { parentPort.postMessage({ kind: 'document', ok: false, error: error instanceof Error ? error.message : String(error) }); }
});
