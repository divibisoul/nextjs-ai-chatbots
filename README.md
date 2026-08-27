<a href="https://chat.vercel.ai/"><h1 align="center">Chat SDK</h1></a>

<p align="center">Chat SDK is a free, open-source template built with Next.js and the AI SDK.</p>

## N04 — Super GPU / Execution Engine

N04 is the execution-oriented Soul nucleus. Its Mesh contract now advertises 15 capabilities and its runtime has explicit handlers for the execution, document, artifact, orchestration, streaming and Mesh paths. The original application remains intact; the N04 layer is additive.

### 15 Mesh capabilities

`ai-pilot`, `tool-execution`, `artifact-processing`, `document-processing`, `context-orchestration`, `streaming`, `mesh-communication`, `batch.process`, `document.create`, `document.edit`, `artifact.analyze`, `tool.run`, `workflow.execute`, `schedule.task`, `parallel.map`.

### Parallel execution

N04 uses Node.js `worker_threads` with a bounded worker pool sized from `availableParallelism()`. This is a dependency-free CPU parallelism layer.

### Cache and priority

The runtime includes a configurable TTL cache (default 5 minutes) and a priority queue that gives Mesh requests originating at N01 higher scheduling priority than internal batch work.

### Mesh topology

N04 exposes five logical IN channels (`N01`, `N02`, `N03`, `N05`, `N06`) and five corresponding OUT peers. Existing hybrid Mesh transports remain additive and are not replaced.

### Validation

CI runs `pnpm install --frozen-lockfile`, Mesh typecheck and the N04 contract suite. Runtime validation with the other nuclei remains a separate operational step when the nuclei are running together.

See `ARCHITECTURE.md` and `MESH_STATUS.md` for the implementation ledger.

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
