import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const n04Root = process.env.SOUL_N04_WORKDIR || process.cwd();
const n05Root = process.env.SOUL_N05_WORKDIR;
for (const [name, root] of [['N04', n04Root], ['N05', n05Root]]) {
  if (!root || !existsSync(resolve(root, 'node_modules/next/dist/bin/next'))) {
    throw new Error(name + ' production dependencies/build are required before the real-process E2E.');
  }
}

const n04Port = Number(process.env.SOUL_TEST_N04_PORT || 18404);
const n05Port = Number(process.env.SOUL_TEST_N05_PORT || 18505);
const n04Url = 'http://127.0.0.1:' + n04Port;
const n05Url = 'http://127.0.0.1:' + n05Port;
const secret = process.env.SOUL_MESH_HMAC_SECRET || randomBytes(48).toString('hex');
const token = process.env.SOUL_MESH_TOKEN || randomBytes(32).toString('hex');
const databaseUrl = process.env.POSTGRES_URL?.trim();
if (!databaseUrl) {
  throw new Error('SOUL_MESH_E2E_REAL_POSTGRES_URL_REQUIRED: configure the healthy PostgreSQL service; synthetic URLs are not accepted.');
}

const commonEnv = {
  ...process.env,
  NODE_ENV: 'production',
  AUTH_SECRET: process.env.AUTH_SECRET || randomBytes(32).toString('hex'),
  POSTGRES_URL: databaseUrl,
  SOUL_MESH_HMAC_SECRET: secret,
  SOUL_MESH_TOKEN: token,
  SOUL_MESH_HOST: '127.0.0.1',
};
const children = [];
const logs = new Map();

function start(name, root, port, peers) {
  const child = spawn(process.execPath, [
    resolve(root, 'node_modules/next/dist/bin/next'),
    'start',
    '--hostname', '127.0.0.1',
    '--port', String(port),
  ], {
    cwd: root,
    env: {
      ...commonEnv,
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      ...peers,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  logs.set(name, '');
  const collect = chunk => logs.set(name, (logs.get(name) + String(chunk)).slice(-24000));
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  child.on('error', error => collect(String(error)));
  return child;
}

function assertRunning(name, child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    throw new Error(name + ' exited before E2E completion.\n' + logs.get(name));
  }
}

async function getJson(url, withBearer = false) {
  const headers = withBearer ? { authorization: 'Bearer ' + token } : {};
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function waitFor(name, child, probe) {
  let last = 'no response';
  for (let i = 0; i < 80; i += 1) {
    assertRunning(name, child);
    try {
      const ready = await probe();
      if (ready) return;
      last = 'probe returned an unexpected response';
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 250));
  }
  throw new Error(name + ' did not become ready: ' + last + '\n' + logs.get(name));
}

function runClient(name, root, driver, timeoutMs = 20000) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', driver], {
      cwd: root,
      env: {
        ...commonEnv,
        SOUL_MESH_N04_URL: n04Url,
        SOUL_MESH_N05_URL: n05Url,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let captured = '';
    const collect = chunk => { captured = (captured + String(chunk)).slice(-24000); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', error => rejectPromise(new Error(name + ' could not start: ' + error.message)));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectPromise(new Error(name + ' timed out.\n' + captured));
    }, timeoutMs);
    child.on('exit', code => {
      clearTimeout(timer);
      if (code === 0) resolvePromise(captured);
      else rejectPromise(new Error(name + ' exited with ' + code + '.\n' + captured));
    });
  });
}

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise(resolveExit => child.once('exit', resolveExit)),
    new Promise(resolveDelay => setTimeout(resolveDelay, 4000)),
  ]);
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}

try {
  const n04 = start('N04 actual Next.js production process', n04Root, n04Port, {
    SOUL_MESH_N05_URL: n05Url,
  });
  const n05 = start('N05 actual Next.js production process', n05Root, n05Port, {
    SOUL_MESH_N04_URL: n04Url,
  });

  await Promise.all([
    waitFor('N04', n04, async () => {
      const response = await fetch(n04Url + '/api/soul-mesh', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      });
      return response.status === 405;
    }),
    waitFor('N05', n05, async () => {
      const result = await getJson(n05Url + '/api/soul-mesh', true);
      return result.response.ok
        && result.body?.nucleus === 'N05'
        && result.body?.contractVersion === '1.1.0';
    }),
  ]);

  const n04Driver = [
    "import * as peerClientModule from './lib/soul-mesh/peer-client.ts';",
    "const sendTo = peerClientModule.sendTo ?? peerClientModule.default?.sendTo;",
    "if (typeof sendTo !== 'function') throw new Error('N04_SEND_TO_EXPORT_MISSING');",
    "const r = await sendTo('N05', 'mesh.ping', { probe: 'N04_N05_REAL_PROCESS_PAIR' }, 7000);",
    "if (r.kind !== 'response' || r.source !== 'N05' || r.target !== 'N04' || r.payload?.ok !== true || r.payload?.nucleus !== 'N05') throw new Error('N04_TO_N05_CONTRACT_OR_HMAC_FAILED: ' + JSON.stringify(r));",
    "console.log('N04_TO_N05_REAL_PROCESS_E2E_PASS ' + JSON.stringify({source:r.source,target:r.target,capability:r.capability,transport:'HTTP',requestAuthentication:'HMAC-SHA256',responseAuthentication:'HMAC-SHA256',bearerAuthentication:'sent with HMAC',payload:r.payload}));",
  ].join('\n');
  const n04Evidence = await runClient('N04 peer client → N05 actual Next.js route', n04Root, n04Driver);
  if (!n04Evidence.includes('N04_TO_N05_REAL_PROCESS_E2E_PASS')) {
    throw new Error('N04 peer client did not produce the N04→N05 real-process pass marker.\n' + n04Evidence);
  }

  const bearerOnlyEnvelope = {
    protocol: 'soul-mesh/1',
    contractVersion: '1.1.0',
    id: 'n05-bearer-only-attempt',
    correlationId: 'n04-bearer-only-rejection',
    source: 'N05',
    target: 'N04',
    kind: 'request',
    capability: 'mesh.ping',
    payload: { probe: 'bearer-only-must-be-rejected' },
    timestamp: Date.now(),
    meta: {
      runtime: 'n05-n06-real-process-e2e',
      transport: 'HTTP',
      encoding: 'json',
      version: '1.1.0',
      traceId: 'n04-bearer-only-rejection',
    },
  };
  const bearerOnlyResponse = await fetch(n04Url + '/api/soul-mesh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(bearerOnlyEnvelope),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  const bearerOnlyBody = await bearerOnlyResponse.json().catch(() => null);
  if (bearerOnlyResponse.status !== 401 || bearerOnlyBody?.error !== 'UNAUTHORIZED') {
    throw new Error('N04_BEARER_ONLY_HMAC_BYPASS: actual production server did not reject a bearer-only message with HMAC configured.');
  }
  const bearerOnlyEvidence = 'N04_BEARER_ONLY_HMAC_REJECTED ' + JSON.stringify({
    target: 'N04 actual Next.js production process',
    status: bearerOnlyResponse.status,
    error: bearerOnlyBody.error,
    hmacHeaderSent: false,
    accepted: false,
  });

  const n05Driver = [
    "import * as adapterModule from './lib/soul-mesh/adapter.ts';",
    "const sendToNucleus = adapterModule.sendToNucleus ?? adapterModule.default?.sendToNucleus;",
    "if (typeof sendToNucleus !== 'function') throw new Error('N05_SEND_TO_NUCLEUS_EXPORT_MISSING');",
    "const r = await sendToNucleus('N04', 'mesh.ping', { probe: 'N04_N05_REAL_PROCESS_PAIR' }, 7000);",
    "if (!r || r.ok !== true || r.nucleus !== 'N04') throw new Error('N05_TO_N04_CONTRACT_OR_HMAC_FAILED: ' + JSON.stringify(r));",
    "console.log('N05_TO_N04_REAL_PROCESS_E2E_PASS ' + JSON.stringify({source:'N05',target:'N04',capability:'mesh.ping',transport:'HTTP',requestAuthentication:'HMAC-SHA256',responseAuthentication:'HMAC-SHA256',payload:r}));",
  ].join('\n');
  const n05Evidence = await runClient('N05 peer client → N04 actual Next.js route', n05Root, n05Driver);
  if (!n05Evidence.includes('N05_TO_N04_REAL_PROCESS_E2E_PASS')) {
    throw new Error('N05 peer client did not produce the N05→N04 real-process pass marker.\n' + n05Evidence);
  }

  console.log(JSON.stringify({
    system: 'SOUL',
    stage: 'N04_N05_REAL_PROCESS_PAIR_E2E',
    status: 'PASS',
    evidence: {
      independentN04Server: 'actual Next.js production HTTP process',
      independentN05Server: 'actual Next.js production HTTP process',
      bearerOnlyRejectedByN04: bearerOnlyEvidence,
      n04ClientToN05Server: n04Evidence.trim(),
      n05ClientToN04Server: n05Evidence.trim(),
      requestAuthentication: 'HMAC-SHA256',
      responseAuthentication: 'HMAC-SHA256',
      bearerAuthentication: 'ephemeral CI token sent and validated on N05-bound traffic',
      secrets: 'ephemeral process environment; never persisted',
    },
    checkedAt: new Date().toISOString(),
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    system: 'SOUL',
    stage: 'N04_N05_REAL_PROCESS_PAIR_E2E',
    status: 'FAILED',
    error: error instanceof Error ? error.message : String(error),
    serverLogs: Object.fromEntries(logs),
  }, null, 2));
  process.exitCode = 1;
} finally {
  await Promise.all(children.reverse().map(stop));
}
