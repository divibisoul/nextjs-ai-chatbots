const { parentPort } = require('node:worker_threads');
parentPort.on('message', async (input) => parentPort.postMessage({ kind: 'document', ok: true, input }));
