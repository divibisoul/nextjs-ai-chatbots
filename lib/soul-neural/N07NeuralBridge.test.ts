import { strict as assert } from "node:assert";
import test from "node:test";
import { N07NeuralBridge } from "./N07NeuralBridge";

async function hmacHex(data: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2,"0")).join("");
}

test("N04 consumes signed canonical N07 neural parameters", async () => {
  const originalFetch = globalThis.fetch;
  const secret = "1234567890abcdef";
  const response = {
    version:"1.0", contractVersion:"1.1.0", messageId:"msg-params", source:"N07", target:"N04",
    timestamp: Date.now(), nonce:"nonce-response", correlationId:"corr-params", type:"TASK_RESULT",
    capability:"neural.parameters", payload:{}
  };
  const params = {
    size:8, learning_rate:.05, optimizer:"adam", regularization:1e-6, gradient_clip:1, heads:1, batch_cache:128,
    layers:[{activation:"tanh",dropout_rate:0}]
  };
  const signedPayload = JSON.stringify(response);
  // The bridge signs the canonical response structure in the source, not the JSON object as emitted.
  const wire = JSON.stringify({
    version:"1.0", contractVersion:"1.1.0", messageId:"msg-params", source:"N07", target:"N04",
    timestamp:response.timestamp, nonce:"nonce-response", correlationId:"corr-params", type:"TASK_RESULT",
    payload:{capability:"neural.parameters",payload:{}}
  });
  const signature = await hmacHex(wire, secret);
  globalThis.fetch = async () => new Response(JSON.stringify({
    protocol:"soul-mesh/1", contractVersion:"1.1.0", id:"msg-params", correlationId:"corr-params",
    timestamp:response.timestamp, status:"ok", payload:{}, metadata:{parameters:JSON.stringify(params)}
  }), {status:200,headers:{"content-type":"application/json","x-soul-mesh-nonce":"nonce-response","x-soul-mesh-hmac":signature}});
  try {
    const bridge = new N07NeuralBridge("N04",{baseUrl:"http://n07.test",secret});
    const actual = await bridge.parameters("corr-params");
    assert.equal(actual.size,8);
    assert.equal(actual.optimizer,"adam");
    assert.equal(actual.layers[0].activation,"tanh");
    void signedPayload;
  } finally { globalThis.fetch = originalFetch; }
});
