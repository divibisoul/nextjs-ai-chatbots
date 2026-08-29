<a href="https://chat.vercel.ai/"><h1 align="center">Chat SDK</h1></a>

<p align="center">Chat SDK is a free, open-source template built with Next.js and the AI SDK.</p>

## N04 — Super GPU / Execution Engine

N04 is the execution-oriented Soul nucleus. Its Mesh contract advertises 15 capabilities and the runtime routes those capabilities to real application functions where they exist. The original application remains intact; the N04 layer is additive.

### 15 Mesh capabilities

`ai-pilot`, `tool-execution`, `artifact-processing`, `document-processing`, `context-orchestration`, `streaming`, `mesh-communication`, `batch.process`, `document.create`, `document.edit`, `artifact.analyze`, `tool.run`, `workflow.execute`, `schedule.task`, `parallel.map`.

`artifact.analyze` is explicitly marked unavailable until a standalone analyzer exists. `streaming` remains coupled to the existing chat streaming transport. Neither path fabricates a successful result.

### Parallel execution

N04 uses Node.js `worker_threads` with a bounded pool sized from `availableParallelism()`. The pool provides CPU parallelism, timeout protection and priority scheduling. It is not presented as a physical GPU; a future GPU backend can be attached without changing the Mesh contract.

### Cache and priority

The runtime includes a configurable TTL cache (default 5 minutes). The processor avoids caching mutating capabilities such as document edits. N01-originated Mesh requests receive higher scheduling priority than internal work.

### Mesh topology

N04 exposes five logical IN channels (`N01`, `N02`, `N03`, `N05`, `N06`) and five corresponding OUT peers. Existing hybrid HTTP/WebSocket/WebView transport layers remain additive and are not replaced.

### Cooperative AI interdependence

Each N01–N06 nucleus remains an independent AI with its own agents and capabilities. Soul Mesh is the common interoperability/control plane, not a replacement application API. N04 can explicitly:

- offer its capabilities to another nucleus;
- request support from a peer when N04 reaches an operational boundary;
- delegate work to the nucleus that owns a required capability;
- return correlated results to the originating nucleus.

The implementation lives in `lib/soul-mesh/N04CooperativeMesh.ts` and is wired into the existing `mesh-communication` capability in `Nucleus04Processor`. It preserves the existing Mesh protocol and five IN/five OUT topology.

### Hybrid transport

The protocol supports `IN_PROCESS`, `WEBVIEW_BRIDGE`, `LOOPBACK_HTTP`, `HTTP`, and `REALTIME`. Transport negotiation remains capability-neutral: the transport carries the canonical Soul Mesh message rather than creating a parallel API. The existing multiplexer/fallback path remains intact, and unsupported transport availability is never claimed as a live connection.

### Runtime path

`N01/N02/N03/N05/N06 → Soul Mesh → N04 gateway → protocol validation → capability handler → real application function → correlated Mesh response`.

For cooperative work, the path can additionally become `N04 → peer discovery/transport negotiation → peer capability → result → N04`, while preserving the same canonical message contract.

Batch and `parallel.map` dispatch independent handler calls concurrently. Workflow execution preserves step order. Scheduling is process-local and therefore ephemeral by design.

### Validation

CI runs `pnpm install --frozen-lockfile`, Mesh typecheck, the N04 contract suite and the production build. Live communication with the other nuclei remains an operational validation step when all runtimes are available; it does not block structural construction.

See `ARCHITECTURE.md`, `MESH_STATUS.md` and `lib/soul-core/N04_CAPABILITY_REALITY.md` for the implementation ledger.

## Features

- Next.js App Router
- AI SDK
- shadcn/ui and Tailwind CSS
- Data persistence with Postgres/Vercel Blob
- Auth.js

## Running locally

Use the environment variables in `.env.example` and run:

```bash
pnpm install
pnpm dev
```
