# N04 Soul Mesh Status

## Identity
- Nucleus: N04
- Role: independent AI nucleus for application, conversation, tool, document, artifact and execution workloads
- Canonical protocol: `soul-mesh/1`
- Cooperative model: N04 is both a capability provider and a capability consumer; it can offer work, request peer support, delegate work and correlate responses.

## Cumulative engineering directive
Every area is audited against the accumulated Soul requirements. A divergence is not merely reported: when technically possible it is corrected, strengthened, integrated and documented without destructive reset. Live multi-nucleus validation is tracked separately and never fabricated.

## Structural upgrade implemented
- 15 capability contract: DECLARED.
- 15 runtime paths: EXPLICITLY REGISTERED.
- Existing AI provider/model runtime: RETAINED.
- Existing tool runtime: RETAINED.
- Document creation/editing: BOUND to existing document tools.
- Artifact processing: BOUND to existing artifact/tool paths.
- `artifact.analyze`: repository-native metadata/content analysis; no fake external vision provider is claimed.
- Streaming: remains bound to the existing chat streaming transport.
- Batch/context/parallel execution: bounded by the N04 Super GPU software scheduler.
- Workflow execution: ordered multi-step dispatch.
- Scheduling: process-local delayed dispatch; persistence across restart is not claimed.

## Super GPU
`lib/soul-core/N04SuperGpuEngine.ts` provides bounded parallel software execution, three priority lanes (`mesh`, `internal`, `batch`), configurable capacity from Node `availableParallelism()`, timeout protection, FIFO ordering within a priority and runtime metrics. It is an acceleration/orchestration fabric, not a claim of physical GPU hardware.

The existing worker-thread infrastructure remains available for isolated CPU-bound transforms. Session-bound application tools stay in the application runtime rather than being falsely represented as worker execution.

## Mesh topology and cooperation
- IN: N01, N02, N03, N05, N06.
- OUT: N01, N02, N03, N05, N06.
- Hybrid transport families preserved: `IN_PROCESS`, `WEBVIEW_BRIDGE`, `LOOPBACK_HTTP`, `HTTP`, `REALTIME`.
- Peer requests validate protocol, correlation and return route.
- N04 can offer capabilities, request support and delegate work through `N04CooperativeMesh.ts`.

## Security
- Mesh token authentication is required by the N04 gateway unless `MESH_AUTH_DISABLED=true` is explicitly set for controlled testing.
- Optional canonical HMAC envelope protection is supported by `SOUL_MESH_HMAC_SECRET`.
- HMAC verification enforces timestamp skew and timing-safe comparison.
- Outbound peer requests can sign the same canonical envelope.

## Cache
`N04TtlCache` provides a five-minute configurable TTL for selected read/idempotent operations. Deterministic serialization prevents accidental cache misses from object-key ordering; mutating operations are not cached by default.

## CI
GitHub Actions runs frozen dependency installation, Mesh typecheck, N04 contract tests and production build for pull requests targeting `main`, pushes to `main`, and manual dispatch.

The first validation run exposed a real frozen-lockfile divergence. The manifest was corrected to match the repository lockfile rather than weakening CI or generating an unrelated dependency graph. A subsequent run must validate the current head after GitHub refreshes the pull-request merge ref.

## Current branch
`upgrade/n04-final-cooperative-super-gpu`

## Current acceptance state
- Architecture: STRUCTURALLY IMPLEMENTED.
- 15 capabilities: ROUTED.
- Cooperative AI layer: IMPLEMENTED.
- Hybrid Mesh topology: CONFIGURED.
- Authentication/HMAC: IMPLEMENTED.
- CI: VALIDATION IN PROGRESS; latest observed run exposed lockfile state before the manifest correction.
- Live N01↔N04 and full K6 runtime validation: PENDING because all nuclei cannot currently be run together.

N04 is not declared operationally closed until the current CI head is green and live validation is subsequently performed when the six runtimes are available.
