import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const n04Root = process.env.SOUL_N04_WORKDIR || process.cwd();
const n03Root = process.env.SOUL_N03_WORKDIR;
if (!existsSync(resolve(n04Root, 'node_modules/next/dist/bin/next'))) {
  throw new Error('N04 dependencies/build are required before the live peer E2E.');
}
if (!n03Root || !existsSync(resolve(n03Root, 'scripts/soul-mesh-server.ts'))) {
  throw new Error('SOUL_N03_WORKDIR must identify the pinned N03 source checkout.');
}

const n04Port = Number(process.env.SOUL_TEST_N04_PORT || 18404);
const n03Port = Number(process.env.SOUL_TEST_N03_PORT || 18403);
const n04Url = 'http://127.0.0.1:' + n04Port;
const n03Url = 'http://127.0.0.1:' + n03Port;
const secret = randomBytes(48).toString('hex');
const baseEnv = {
  ...process.env,
  NODE_ENV: 'production',
  AUTH_SECRET: process.env.AUTH_SECRET || 'ci-only-not-a-production-secret',
  POSTGRES_URL: process.env.POSTGRES_URL || 'postgresql://soulmesh:soulmesh@127.0.0.1:5432/soulmesh',
  SOUL_MESH_HMAC_SECRET: secret,
  SOUL_MESH_TOKEN: '',
  SOUL_MESH_N03_URL: n03Url,
  SOUL_MESH_HOST: '127.0.0.1',
};
const children = [];
const output = new Map();

function start(name, command, args, cwd, env) {
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  output.set(name, '');
  const collect = chunk => output.set(name, (output.get(name) + String(chunk)).slice(-20000));
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  child.on('error', error => collect(String(error)));
  return child;
}

function assertRunning(name, child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    throw new Error(name + ' exited before E2E completion.\n' + output.get(name));
  }
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function waitFor(name, child, probe) {
  let last = 'no response';
  for (let i = 0; i < 80; i += 1) {
    assertRunning(name, child);
    try {
      const result = await probe();
      if (result) return;
      last = 'probe returned an unexpected response';
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 250));
  }
  throw new Error(name + ' did not become ready: ' + last + '\n' + output.get(name));
}

function runClient(name, command, args, cwd, env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let captured = '';
    const collect = chunk => { captured = (captured + String(chunk)).slice(-20000); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', error => rejectPromise(new Error(name + ' could not start: ' + error.message)));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectPromise(new Error(name + ' timed out.\n' + captured));
    }, 20000);
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
  const n03 = start(
    'N03 real HTTP runtime',
    'bun',
    ['scripts/soul-mesh-server.ts'],
    n03Root,
    {
      ...baseEnv,
      SOUL_MESH_HOST: '127.0.0.1',
      SOUL_MESH_PORT: String(n03Port),
      SOUL_MESH_N04_URL: n04Url,
    },
  );
  const n04 = start(
    'N04 real Next.js runtime',
    process.execPath,
    [
      resolve(n04Root, 'node_modules/next/dist/bin/next'),
      'start',
      '--hostname', '127.0.0.1',
      '--port', String(n04Port),
    ],
    n04Root,
    {
      ...baseEnv,
      PORT: String(n04Port),
      HOSTNAME: '127.0.0.1',
      SOUL_MESH_N03_URL: n03Url,
    },
  );

  await waitFor('N03', n03, async () => {
    const health = await getJson(n03Url + '/mesh/health');
    return health.response.ok && health.body?.nucleus === 'N03'
      && health.body?.contractVersion === '1.1.0';
  });
  await waitFor('N04', n04, async () => {
    const response = await fetch(n04Url + '/api/soul-mesh', {
      method: 'GET',
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    return response.status === 405;
  });

  const n04Driver = [
    "import { sendTo } from './lib/soul-mesh/peer-client.ts';",
    "const r = await sendTo('N03', 'mesh.ping', { probe: 'N03_N04_REAL_PROCESS_PAIR' }, 5000, 0);",
    "if (r.kind !== 'response' || r.source !== 'N03' || r.target !== 'N04' || r.payload?.ok !== true || r.payload?.nucleus !== 'N03') throw new Error('N04_TO_N03_CONTRACT_OR_HMAC_FAILED: ' + JSON.stringify(r));",
    "console.log('N04_TO_N03_REAL_PROCESS_E2E_PASS ' + JSON.stringify({source:r.source,target:r.target,capability:r.capability,transport:'HTTP',requestAuthentication:'HMAC-SHA256',responseAuthentication:'HMAC-SHA256',payload:r.payload}));",
  ].join('\n');
  const n04Evidence = await runClient(
    'N04 real peer client → N03 actual HTTP server',
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', n04Driver],
    n04Root,
    { ...baseEnv, SOUL_MESH_N03_URL: n03Url },
  );
  if (!n04Evidence.includes('N04_TO_N03_REAL_PROCESS_E2E_PASS')) {
    throw new Error('N04 peer client did not produce the N04→N03 real-process pass marker.\n' + n04Evidence);
  }

  const n03Driver = [
    "import { createSoulMeshMessage } from './lib/soul-mesh/SoulMeshProtocol.ts';",
    "import { signSoulMeshMessage, verifySoulMeshHmac } from './src/mesh/SoulMeshHmac.ts';",
    "const secret = process.env.SOUL_MESH_HMAC_SECRET;",
    "const message = signSoulMeshMessage(createSoulMeshMessage({source:'N03',target:'N04',kind:'request',capability:'mesh.ping',payload:{probe:'N03_N04_REAL_PROCESS_PAIR'},meta:{runtime:'nexus-aeternum-fusion',transport:'HTTP',encoding:'json',version:'1.1.0'}}), secret);",
    "const response = await fetch(process.env.SOUL_MESH_N04_URL + '/api/soul-mesh', {method:'POST',headers:{'content-type':'application/json','x-soul-mesh-nonce':message.nonce,'x-soul-mesh-hmac':message.hmac},body:JSON.stringify(message),signal:AbortSignal.timeout(7000)});",
    "const body = await response.json();",
    "if (!response.ok || body.kind !== 'response' || body.source !== 'N04' || body.target !== 'N03' || body.payload?.ok !== true || body.payload?.nucleus !== 'N04') throw new Error('N03_TO_N04_CONTRACT_FAILED status=' + response.status + ' body=' + JSON.stringify(body));",
    "if (!verifySoulMeshHmac(body, secret)) throw new Error('N03_TO_N04_RESPONSE_HMAC_INVALID');",
    "console.log('N03_TO_N04_REAL_PROCESS_E2E_PASS ' + JSON.stringify({source:body.source,target:body.target,capability:body.capability,transport:'HTTP',requestAuthentication:'HMAC-SHA256',responseAuthentication:'HMAC-SHA256',payload:body.payload}));",
  ].join('\n');
  const n03Evidence = await runClient(
    'N03 authenticated client → N04 actual Next.js route',
    'bun',
    ['--eval', n03Driver],
    n03Root,
    { ...baseEnv, SOUL_MESH_N04_URL: n04Url },
  );
  if (!n03Evidence.includes('N03_TO_N04_REAL_PROCESS_E2E_PASS')) {
    throw new Error('N03 client did not produce the N03→N04 real-process pass marker.\n' + n03Evidence);
  }

  console.log(JSON.stringify({
    system: 'SOUL',
    stage: 'N03_N04_REAL_PROCESS_PAIR_E2E',
    status: 'PASS',
    evidence: {
      independentN03Server: 'N03 actual Bun HTTP process',
      independentN04Server: 'N04 actual Next.js production HTTP process',
      n04ClientToN03Server: n04Evidence.trim(),
      n03ClientToN04Route: n03Evidence.trim(),
      requestAuthentication: 'HMAC-SHA256',
      responseAuthentication: 'HMAC-SHA256',
      secret: 'ephemeral process environment; never persisted',
    },
    checkedAt: new Date().toISOString(),
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    system: 'SOUL',
    stage: 'N03_N04_REAL_PROCESS_PAIR_E2E',
    status: 'FAILED',
    error: error instanceof Error ? error.message : String(error),
    serverLogs: Object.fromEntries(output),
  }, null, 2));
  process.exitCode = 1;
} finally {
  await Promise.all(children.reverse().map(stop));
}
