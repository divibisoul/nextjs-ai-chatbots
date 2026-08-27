const { parentPort } = require('node:worker_threads');
parentPort.on('message', async (input) => parentPort.postMessage({ kind: 'tool', ok: true, input }));
