<a href="https://chat.vercel.ai/"><h1 align="center">Chat SDK</h1></a>

<p align="center">Chat SDK is a free, open-source template built with Next.js and the AI SDK.</p>

## N04 — Super GPU / Execution Engine

N04 is the execution-oriented Soul nucleus. Its Mesh contract advertises 15 capabilities and the runtime now routes those capabilities to real application functions where they exist. The original application remains intact; the N04 layer is additive.

### 15 Mesh capabilities

`ai-pilot`, `tool-execution`, `artifact-processing`, `document-processing`, `context-orchestration`, `streaming`, `mesh-communication`, `batch.process`, `document.create`, `document.edit`, `artifact.analyze`, `tool.run`, `workflow.execute`, `schedule.task`, `parallel.map`.

`artifact.analyze` is explicitly marked unavailable until a standalone analyzer exists. `streaming` remains coupled to the existing chat streaming transport. Neither path fabricates a successful result.

### Parallel execution

N04 uses Node.js `worker_threads` with a bounded pool sized from `availableParallelism()`. The pool provides CPU parallelism, timeout protection and priority scheduling. It is not presented as a physical GPU; a future GPU backend can be attached without changing the Mesh contract.

### Cache and priority

The runtime includes a configurable TTL cache (default 5 minutes). The processor avoids caching mutating capabilities such as document edits. N01-originated Mesh requests receive higher scheduling priority than internal work.

### Mesh topology

N04 exposes five logical IN channels (`N01`, `N02`, `N03`, `N05`, `N06`) and five corresponding OUT peers. Existing hybrid HTTP/WebSocket/WebView transport layers remain additive and are not replaced.

### Runtime path

`N01 → Mesh HTTP endpoint → protocol validation → capability handler → real application function → Mesh response`.

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
