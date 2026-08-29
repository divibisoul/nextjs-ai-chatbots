<a href="https://chat.vercel.ai/"><h1 align="center">Chat SDK</h1></a>

<p align="center">Chat SDK is a free, open-source template built with Next.js and the AI SDK.</p>

## N04 — Super GPU / Cooperative Execution Engine

N04 is the execution-oriented Soul nucleus and its **Super GPU software architecture**. N04 remains an independent AI with its own runtime, agents and capabilities. Soul Mesh is the interoperability/control plane through which N04 can offer work, request support, delegate work and return correlated results to N01, N02, N03, N05 and N06.

### Permanent engineering rule: every gap becomes work

Every inspected area — code, configuration, dependency, Mesh, runtime, transport, capability, agent, scheduler, cache, security, tests, CI, documentation or architecture — is compared against the cumulative Soul requirements. An incomplete or weak area is corrected, completed, strengthened, integrated and documented whenever technically possible. Existing functionality is preserved through minimal-diff changes. Live tests that require multiple running nuclei may remain pending, but that limitation never blocks constructible infrastructure and no test result is fabricated.

### 15 Mesh capabilities

`ai-pilot`, `tool-execution`, `artifact-processing`, `document-processing`, `context-orchestration`, `streaming`, `mesh-communication`, `batch.process`, `document.create`, `document.edit`, `artifact.analyze`, `tool.run`, `workflow.execute`, `schedule.task`, `parallel.map`.

All 15 capabilities are explicitly bound by the N04 processor/runtime. `artifact.analyze` is intentionally limited to repository-native metadata/content analysis; `streaming` remains coupled to the existing chat streaming transport instead of fabricating a synchronous JSON stream.

### Super GPU execution fabric

The Super GPU layer provides bounded parallel software orchestration, three priority lanes, deterministic caching, timeout protection, failure metrics and cooperative task dispatch. `availableParallelism()` determines default execution capacity and `N04_SUPER_GPU_CAPACITY` can tune it. Mesh work has highest priority, normal internal work follows, and batch/vector work uses the lowest lane.

This is a software execution/acceleration fabric, not a claim of physical GPU hardware. The existing Node.js `worker_threads` pool remains available for isolated CPU-bound transforms and is not used to pretend that session-bound application tools are running inside workers.

### Cache and resilience

The runtime includes a configurable TTL cache (5 minutes by default) with deterministic serialization. Mutating capabilities are not cached by default. Mesh requests use correlation validation, bounded retries and configurable timeouts. The N04 gateway requires Mesh token authentication by default; `MESH_AUTH_DISABLED=true` is the explicit test-only bypass. When `SOUL_MESH_HMAC_SECRET` is configured, canonical HMAC signing and verification add envelope integrity and timestamp-skew protection.

### Mesh topology

N04 exposes five logical IN channels (`N01`, `N02`, `N03`, `N05`, `N06`) and five corresponding OUT peers. The protocol supports `IN_PROCESS`, `WEBVIEW_BRIDGE`, `LOOPBACK_HTTP`, `HTTP`, and `REALTIME`; transport negotiation carries the canonical Soul Mesh message instead of creating a parallel application API.

### Cooperative AI interdependence

Each N01–N06 nucleus remains an independent AI. N04 can:

- advertise its capabilities to another nucleus;
- request support when N04 reaches an operational boundary;
- delegate work to the nucleus that owns a required capability;
- return correlated results to the originating nucleus.

The cooperative layer is implemented in `lib/soul-mesh/N04CooperativeMesh.ts` and is wired into `mesh-communication` without replacing the existing Mesh protocol.

### Runtime path

`N01/N02/N03/N05/N06 → Soul Mesh → N04 gateway → protocol/security validation → capability handler → Super GPU scheduler → real application function → correlated Mesh response`.

Cooperative work can additionally become `N04 → peer discovery/transport negotiation → peer capability → result → N04`, while preserving the same canonical message contract.

Batch and `parallel.map` dispatch independent capability calls through the bounded Super GPU scheduler. Workflow execution preserves step order. Scheduling is process-local and therefore intentionally ephemeral across restarts.

### Validation

CI runs `pnpm install --frozen-lockfile`, N04 Mesh typecheck, the N04 contract suite and the production build. Live communication with all nuclei remains an operational validation step when the runtimes are available together; it does not block structural construction.

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
