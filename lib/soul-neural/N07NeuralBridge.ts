export type NeuralOperation =
  | "neural.forward@1.0.0"
  | "neural.learn@1.0.0"
  | "neural.parameters@1.0.0";

export type NeuralParameters = {
  size: number;
  learning_rate: number;
  optimizer: string;
  regularization: number;
  gradient_clip: number;
  heads: number;
  batch_cache: number;
  layers: Array<Record<string, unknown>>;
};

export type NeuralRequest = {
  operation: NeuralOperation;
  payload: number[];
  correlationId?: string;
  deadlineMs?: number;
};

export type NeuralResponse = {
  traceId: string;
  correlationId: string;
  payload?: number[];
  data?: unknown;
  status?: string;
  parameters?: NeuralParameters;
};

const PROTOCOL = "soul-mesh/1" as const;
const CONTRACT = "1.1.0" as const;
const TYPE = "CAPABILITY_REQUEST";

const env = () =>
  ((globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env ?? {});

const id = (prefix: string): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
};

const hmac = async (data: string, secret: string): Promise<string> => {
  if (secret.length < 16) throw new Error("SOUL_MESH_HMAC_SECRET must contain at least 16 characters");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("");
};

type Envelope = {
  protocol: string;
  contractVersion: string;
  id: string;
  messageId: string;
  correlationId: string;
  source: string;
  target: string;
  kind: string;
  type: string;
  capability: string;
  payload: Record<string, unknown>;
  timestamp: number;
  nonce: string;
};

const wire = (e: Envelope) => JSON.stringify({
  protocol: e.protocol,
  contractVersion: e.contractVersion,
  id: e.id,
  correlationId: e.correlationId,
  source: e.source,
  target: e.target,
  kind: e.kind,
  capability: e.capability,
  payload: e.payload,
  timestamp: e.timestamp,
  transport: null,
  meta: null,
  nonce: e.nonce,
});

const responseWire = (value: Record<string, unknown>, nonce: string) => JSON.stringify({
  version: "1.0",
  contractVersion: CONTRACT,
  messageId: String(value.id ?? value.messageId ?? ""),
  source: "N07",
  target: "N04",
  timestamp: Number(value.timestamp ?? 0),
  nonce,
  correlationId: String(value.correlationId ?? ""),
  type: String(value.kind ?? "response") === "error" ? "ERROR" : "TASK_RESULT",
  payload: {
    capability: String(value.capability ?? ""),
    payload: value.payload ?? {},
  },
});

export class N07NeuralBridge {
  private readonly url: string;
  private readonly secret: string;
  private readonly timeout: number;

  constructor(
    private readonly source: "N04",
    options: { baseUrl?: string; secret?: string; timeoutMs?: number } = {},
  ) {
    this.url = (options.baseUrl ?? env().SOUL_N07_URL ?? "").replace(/\/$/, "");
    this.secret = options.secret ?? env().SOUL_MESH_HMAC_SECRET ?? "";
    this.timeout = options.timeoutMs ?? 15000;
    if (!this.url) throw new Error("SOUL_N07_URL is required");
  }

  async invoke(request: NeuralRequest): Promise<NeuralResponse> {
    if (
      request.operation !== "neural.parameters@1.0.0" &&
      (!Array.isArray(request.payload) ||
        request.payload.length === 0 ||
        request.payload.some(value => !Number.isFinite(value)))
    ) {
      throw new Error("neural payload must contain finite numbers");
    }

    const correlationId = request.correlationId?.trim() || id("corr");
    const messageId = id("msg");
    const timestamp = Date.now();
    const nonce = id("nonce");
    const capability = request.operation.split("@")[0];
    const payload = { capability, payload: { values: request.payload } };
    const envelope: Envelope = {
      protocol: PROTOCOL,
      contractVersion: CONTRACT,
      id: messageId,
      messageId,
      correlationId,
      source: this.source,
      target: "N07",
      kind: "request",
      type: TYPE,
      capability,
      payload,
      timestamp,
      nonce,
    };

    const signature = await hmac(wire(envelope), this.secret);
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.max(1, request.deadlineMs ?? this.timeout),
    );

    try {
      const response = await fetch(`${this.url}/api/soul-mesh`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-soul-contract-version": CONTRACT,
          "x-soul-correlation-id": correlationId,
          "x-soul-mesh-nonce": nonce,
          "x-soul-mesh-hmac": signature,
        },
        body: JSON.stringify({ ...envelope, hmac: signature }),
        signal: controller.signal,
      });
      const result = await response.json() as Record<string, any>;
      if (!response.ok) {
        throw new Error(String(result.error ?? result.payload?.error ?? `N07 Mesh request failed: ${response.status}`));
      }
      if (
        String(result.protocol) !== PROTOCOL ||
        String(result.contractVersion) !== CONTRACT ||
        String(result.correlationId) !== correlationId
      ) {
        throw new Error("N07 Mesh response contract/correlation mismatch");
      }

      const responseNonce = response.headers.get("x-soul-mesh-nonce")?.trim() || String(result.nonce ?? "");
      const responseSignature = response.headers.get("x-soul-mesh-hmac")?.trim() || String(result.hmac ?? "");
      if (!responseNonce || !responseSignature) throw new Error("N07 Mesh response HMAC credentials missing");
      const responseTimestamp = Number(result.timestamp);
      if (!Number.isFinite(responseTimestamp) || Math.abs(Date.now() - responseTimestamp) > 30000) {
        throw new Error("N07 Mesh response timestamp outside accepted clock skew");
      }
      if (await hmac(responseWire(result, responseNonce), this.secret) !== responseSignature) {
        throw new Error("N07 Mesh response HMAC mismatch");
      }

      const resultPayload = result.payload as Record<string, any> | undefined;
      const values = Array.isArray(resultPayload?.values)
        ? resultPayload.values
        : Array.isArray(resultPayload?.payload?.values)
          ? resultPayload.payload.values
          : Array.isArray(result.payload?.values)
            ? result.payload.values
            : undefined;

      const metadata = result.metadata as Record<string, unknown> | undefined;
      let parameters: NeuralParameters | undefined;
      const rawParameters = metadata?.parameters;
      if (typeof rawParameters === "string" && rawParameters.trim()) {
        try {
          parameters = JSON.parse(rawParameters) as NeuralParameters;
        } catch {
          throw new Error("N07 Mesh neural parameters payload is invalid JSON");
        }
      }

      return {
        traceId: String(result.id ?? result.messageId ?? messageId),
        correlationId,
        payload: values?.map(Number),
        data: result.payload,
        status: String(resultPayload?.status ?? result.status ?? "ok"),
        parameters,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  forward(payload: number[], correlationId?: string) {
    return this.invoke({
      operation: "neural.forward@1.0.0",
      payload,
      correlationId,
    });
  }

  learn(input: number[], target: number[], correlationId?: string) {
    if (input.length === 0 || input.length !== target.length) {
      throw new Error("input and target dimensions must match");
    }
    return this.invoke({
      operation: "neural.learn@1.0.0",
      payload: [...input, ...target],
      correlationId,
    });
  }

  async parameters(correlationId?: string): Promise<NeuralParameters> {
    const response = await this.invoke({
      operation: "neural.parameters@1.0.0",
      payload: [],
      correlationId,
    });
    if (!response.parameters) throw new Error("N07 Mesh neural parameters missing");
    return response.parameters;
  }
}
