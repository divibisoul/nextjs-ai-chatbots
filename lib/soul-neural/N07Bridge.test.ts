import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { N07CognitiveBridge } from './N07CognitiveBridge';
import { N07NeuralBridge } from './N07NeuralBridge';

const secret = 'n07-test-secret-0123456789';
const hex = (data:string) => createHmac('sha256', secret).update(data, 'utf8').digest('hex');

test('N04 cognitive bridge emits the canonical N07 request and verifies the signed response', async () => {
  const correlationId = 'corr-n04-test';
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    const headers = new Headers(init?.headers);
    const unsigned = JSON.stringify({ protocol:body.protocol, contractVersion:body.contractVersion, id:body.id, correlationId:body.correlationId, source:body.source, target:body.target, kind:body.kind, capability:body.capability, payload:body.payload, timestamp:body.timestamp, transport:null, meta:null, nonce:body.nonce });
    assert.equal(body.hmac, hex(unsigned));
    assert.equal(headers.get('x-soul-mesh-hmac'), body.hmac);
    assert.equal(headers.get('x-soul-mesh-nonce'), body.nonce);
    const response = { protocol:'soul-mesh/1', contractVersion:'1.1.0', id:'n07-response', correlationId, source:'N07', target:'N04', kind:'response', capability:'cognitive.execute', payload:{ values:[4,9], status:'ok' }, timestamp:Date.now() };
    const responseNonce = 'response-nonce';
    const responseUnsigned = JSON.stringify({ version:'1.0', contractVersion:'1.1.0', messageId:response.id, source:'N07', target:'N04', timestamp:response.timestamp, nonce:responseNonce, correlationId, type:'TASK_RESULT', payload:{ capability:'cognitive.execute', payload:response.payload } });
    const responseHmac = hex(responseUnsigned);
    return new Response(JSON.stringify({ ...response, nonce:responseNonce, hmac:responseHmac }), { status:200, headers:{ 'content-type':'application/json', 'x-soul-mesh-nonce':responseNonce, 'x-soul-mesh-hmac':responseHmac } });
  };
  try {
    const result = await new N07CognitiveBridge('https://n07.test', secret).execute({ payload:[2,3], correlationId, operation:'square' });
    assert.equal(result.correlationId, correlationId);
    assert.deepEqual(result.payload, [4,9]);
  } finally { globalThis.fetch = oldFetch; }
});

test('N04 neural bridge propagates the exact operation and correlation', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.protocol, 'soul-mesh/1');
    assert.equal(body.contractVersion, '1.1.0');
    assert.equal(body.source, 'N04');
    assert.equal(body.target, 'N07');
    assert.equal(body.kind, 'request');
    assert.equal(body.capability, 'neural.forward');
    const response = { protocol:'soul-mesh/1', contractVersion:'1.1.0', id:'n07-response', correlationId:body.correlationId, source:'N07', target:'N04', kind:'response', capability:'neural.forward', payload:{ values:[1,2], status:'ok' }, timestamp:Date.now() };
    const nonce = 'response-nonce-2';
    const unsigned = JSON.stringify({ version:'1.0', contractVersion:'1.1.0', messageId:response.id, source:'N07', target:'N04', timestamp:response.timestamp, nonce, correlationId:response.correlationId, type:'TASK_RESULT', payload:{ capability:'neural.forward', payload:response.payload } });
    const signature = hex(unsigned);
    return new Response(JSON.stringify({ ...response, nonce, hmac:signature }), { status:200, headers:{ 'content-type':'application/json', 'x-soul-mesh-nonce':nonce, 'x-soul-mesh-hmac':signature } });
  };
  try {
    const result = await new N07NeuralBridge('N04', { baseUrl:'https://n07.test', secret }).forward([1,2], 'corr-neural-test');
    assert.equal(result.correlationId, 'corr-neural-test');
    assert.deepEqual(result.payload, [1,2]);
  } finally { globalThis.fetch = oldFetch; }
});


test('N04 neural bridge consumes canonical N07 neural parameters and preserves feedback metadata', async () => {
  const oldFetch = globalThis.fetch;
  let feedbackSeen = false;
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    if (body.capability === 'learning.feedback') {
      feedbackSeen = true;
      assert.deepEqual(body.payload.payload, {
        values:[0.75,0.9], target:'N07', capability:'neural.forward',
        outcome:'success', provenance:'mesh-observed'
      });
    }
    const response = {
      protocol:'soul-mesh/1', contractVersion:'1.1.0', id:'n07-parameters', correlationId:body.correlationId,
      source:'N07', target:'N04', kind:'response', capability:body.capability,
      payload:{}, metadata:{parameters:JSON.stringify({
        size:8, learning_rate:0.05, optimizer:'adam', regularization:0.000001,
        gradient_clip:1, heads:1, batch_cache:128, layers:[{activation:'tanh',dropout_rate:0}]
      })}, timestamp:Date.now()
    };
    const nonce='response-parameters';
    const unsigned=JSON.stringify({
      version:'1.0', contractVersion:'1.1.0', messageId:response.id, source:'N07', target:'N04',
      timestamp:response.timestamp, nonce, correlationId:response.correlationId, type:'TASK_RESULT',
      payload:{capability:response.capability,payload:response.payload}
    });
    const signature=hex(unsigned);
    return new Response(JSON.stringify({...response,nonce,hmac:signature}),{
      status:200,headers:{'content-type':'application/json','x-soul-mesh-nonce':nonce,'x-soul-mesh-hmac':signature}
    });
  };
  try {
    const bridge = new N07NeuralBridge('N04',{baseUrl:'https://n07.test',secret});
    const actual = await bridge.parameters('corr-parameters-test');
    assert.equal(actual.size,8);
    assert.equal(actual.optimizer,'adam');
    assert.equal(actual.layers[0].activation,'tanh');
    await bridge.feedback(0.75,0.9,'N07','neural.forward','success','mesh-observed','corr-feedback-test');
    assert.equal(feedbackSeen,true);
  } finally { globalThis.fetch = oldFetch; }
});
