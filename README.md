<a href="https://chat.vercel.ai/"><h1 align="center">Chat SDK</h1></a>

<p align="center">Chat SDK is a free, open-source template built with Next.js and the AI SDK.</p>

## N04 — Super GPU / Execution Engine

N04 is the execution-oriented Soul nucleus and one independent IA in the six-nucleus cooperative system. Its Mesh contract advertises 15 capabilities and its runtime provides explicit handlers/adapters for execution, documents, artifacts, orchestration, streaming and Mesh paths. The original application remains intact; the N04 layer is additive.

### 15 Mesh capabilities

`ai-pilot`, `tool-execution`, `artifact-processing`, `document-processing`, `context-orchestration`, `streaming`, `mesh-communication`, `batch.process`, `document.create`, `document.edit`, `artifact.analyze`, `tool.run`, `workflow.execute`, `schedule.task`, `parallel.map`.

### Super GPU execution

N04 uses Node.js `worker_threads` with a bounded worker pool sized from `availableParallelism()`. Independent CPU-heavy work can run concurrently, while orchestration, priority scheduling, timeout handling and result aggregation remain in the N04 runtime. “Super GPU” describes the software execution role; it does not claim physical GPU acceleration without a GPU backend.

### Cooperative IA + hybrid transport

N01–N06 are independent IAs with their own agents and capabilities. The Soul Mesh is the canonical interoperability layer. N04 can both offer work to peers and request/delegate work when a capability is better supplied by another nucleus. Existing transport negotiation is hybrid and additive (`HTTP`, `REALTIME`, `LOOPBACK_HTTP`, `WEBVIEW_BRIDGE`, `IN_PROCESS`); no parallel API contract replaces Mesh.

A cooperative chain can therefore compose capabilities across nuclei, for example: `N1 reasoning → N2 specialist analysis → N3 transformation → N4 execution → N6 planning → N1 result`.

### Mesh topology

N04 exposes five logical IN channels (`N01`, `N02`, `N03`, `N05`, `N06`) and five corresponding OUT peers. Discovery, negotiated transport and correlation IDs provide the concrete request/response path.

### Six-front engineering coordination

The six simultaneous engineering workstreams use GitHub as the durable coordination surface. Each workstream records its branch/commit, changed files, completed work, verified facts, unresolved gaps and explicit next actions so another workstream can continue without restarting. Pair work is additive: complementary nuclei are strengthened together and then handed forward.

The canonical consolidated directive is `SOUL_N04_UNIFIED_EXECUTION_CONTRACT.md`.

### Validation

CI runs `pnpm install --frozen-lockfile`, Mesh typecheck, the N04 contract suite and the web build. Runtime validation with all other nuclei, external providers and real network endpoints remains an operational step when the nuclei are running together; repository code does not claim those live conditions merely from compilation.

See `ARCHITECTURE.md` and `MESH_STATUS.md` for the implementation ledger and current boundaries.

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
