const { parentPort } = require('node:worker_threads');
parentPort.on('message', async (input) => parentPort.postMessage({ kind: 'artifact', ok: true, input }));
