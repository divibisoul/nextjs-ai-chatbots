# N04 Mesh Status

## Structural upgrade — 2026-08-29

- 15 capability contract: DECLARED AND ROUTED.
- Runtime binding: the advertised N04 capabilities are bound to concrete runtime handlers; unsupported provider-level features remain explicit rather than being represented as fake success.
- AI/tool runtime: CONNECTED to the repository's existing AI SDK, model provider and tools.
- Document runtime: CONNECTED to the existing `createDocument` / `updateDocument` tools.
- Artifact runtime: CONNECTED to the existing artifact handlers for supported artifact kinds and operations; required session and payload fields are validated.
- `artifact.analyze`: explicitly limited to the repository's available artifact metadata/content analysis; no fabricated external vision engine is claimed.
- `streaming`: TRANSPORT-BOUND; the existing chat streaming system is preserved and Mesh does not falsely convert a stream into a normal JSON result.
- Context orchestration: IMPLEMENTED as dispatch of declared subtasks with concurrent result aggregation.
- Batch and `parallel.map`: IMPLEMENTED with concurrent dispatch through the runtime handler graph.
- Workflow orchestration: IMPLEMENTED with ordered multi-step dispatch.
- Scheduling: IMPLEMENTED as process-local delayed dispatch; persistence across restarts is intentionally not claimed.
- Scheduler: strengthened with bounded concurrency, three priority lanes (`mesh`, `internal`, `batch`), FIFO ordering within a lane, and configurable execution timeout.
- Five IN + five OUT logical topology: CONFIGURED for N01, N02, N03, N05, N06.
- Cooperative AI architecture: PRESENT. N04 remains an independent IA and uses Soul Mesh as the interoperability/control plane for capability offers, support requests and work delegation.
- Hybrid transport policy: PRESENT. Supported transport families are negotiated without creating a parallel application API: `IN_PROCESS`, `WEBVIEW_BRIDGE`, `LOOPBACK_HTTP`, `HTTP`, `REALTIME`.
- Peer routing: environment-driven at request time, with per-peer URL/token and controlled defaults.
- TTL cache: IMPLEMENTED (5 min default) for selected read/idempotent paths; cache keys now use deterministic serialization so object key ordering cannot create accidental misses.
- Priority semantics: all recognized peer Mesh sources N01–N06 receive `mesh` priority; `batch.process` and `parallel.map` use the lowest `batch` lane.
- README: UPDATED.
- ARCHITECTURE.md: PRESENT.

## Engineering reality rule

A route is not considered implemented merely because it returns HTTP 200. N04 must resolve a requested capability to a real runtime function. Missing functionality is represented explicitly and never as fabricated successful work.

## Validation state

Live cross-nucleus communication and provider-backed operational workloads remain environment-dependent validation. Their absence does not block structural construction. GitHub Actions is configured to run on pushes to `main`, pull requests targeting `main`, and manual dispatch. The open structural PR is #5.

The latest structural changes on this branch strengthen the scheduler and processor semantics without changing N01, N02, N03, N05 or N06.

## Topology

N04 IN: N01, N02, N03, N05, N06
N04 OUT: N01, N02, N03, N05, N06

## Current structural commits

- Agent/runtime bridge: `4631438011a57e405bd8c78e7a819ca750a15374`
- Priority scheduler hardening: `427926a59b984a07f5baf14fd72e778c161617b7`
- Processor priority/cache hardening: `b6aaf9ad3cb0e0cb456b1c4aedebb8530a5407ba`

## Remaining environment validation

1. Run N01 and N04 together and validate correlated request/response.
2. Validate provider credentials for provider-backed AI workloads.
3. Exercise real workloads through the five inbound and five outbound peer paths.
4. Validate timeout behavior against a deliberately slow provider/worker.
5. Only after those environment tests pass should N04 be called operationally closed; structural readiness is already documented separately.
