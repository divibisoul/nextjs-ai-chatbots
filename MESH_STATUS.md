# N04 Mesh Status

## Structural upgrade — 2026-08-29

- 15 capability contract: DECLARED AND ROUTED.
- Runtime binding: the advertised N04 capabilities are bound to concrete runtime handlers; unsupported provider-level features remain explicit rather than being represented as fake success.
- AI/tool runtime: CONNECTED to the repository's existing AI SDK, model provider and tools.
- Document runtime: CONNECTED to the existing `createDocument` / `updateDocument` tools.
- Artifact runtime: CONNECTED to the existing artifact handlers for supported artifact kinds and operations; required session and payload fields are validated.
- `artifact.analyze`: explicitly limited to the repository's available analyzer functionality; no fabricated external vision engine is claimed.
- `streaming`: TRANSPORT-BOUND; the existing chat streaming system is preserved and Mesh does not falsely convert a stream into a normal JSON result.
- Context orchestration: IMPLEMENTED as dispatch of declared subtasks with concurrent result aggregation.
- Batch and `parallel.map`: IMPLEMENTED with concurrent dispatch through the runtime handler graph.
- Workflow orchestration: IMPLEMENTED with ordered multi-step dispatch.
- Scheduling: IMPLEMENTED as process-local delayed dispatch; persistence across restarts is intentionally not claimed.
- Scheduler: strengthened with bounded concurrency, three priority lanes (`mesh`, `internal`, `batch`), FIFO ordering within a lane, and configurable execution timeout.
- Super GPU execution fabric: IMPLEMENTED as an additive, backend-neutral acceleration layer with bounded parallel capacity, priority scheduling, timeout protection, failure accounting, batch mapping and runtime metrics. Default capacity follows Node `availableParallelism()` and is configurable with `N04_SUPER_GPU_CAPACITY`.
- Existing CPU worker pool: PRESERVED for isolated CPU-bound transforms using `worker_threads`; it remains available underneath the higher-level Super GPU orchestration layer.
- Five IN + five OUT logical topology: CONFIGURED for N01, N02, N03, N05, N06.
- Cooperative AI architecture: PRESENT. N04 remains an independent IA and uses Soul Mesh as the interoperability/control plane for capability offers, support requests and work delegation.
- Hybrid transport policy: PRESENT. Supported transport families are negotiated without creating a parallel application API: `IN_PROCESS`, `WEBVIEW_BRIDGE`, `LOOPBACK_HTTP`, `HTTP`, `REALTIME`.
- Peer routing: environment-driven at request time, with per-peer URL/token and controlled defaults.
- TTL cache: IMPLEMENTED (5 min default) for selected read/idempotent paths; cache keys use deterministic serialization so object key ordering cannot create accidental misses.
- Priority semantics: all recognized peer Mesh sources N01–N06 receive `mesh` priority; `batch.process` and `parallel.map` use the lowest `batch` lane.
- README: UPDATED with Super GPU architecture and future accelerator-backend seam.
- ARCHITECTURE.md: PRESENT.

## Engineering reality rule

A route is not considered implemented merely because it returns HTTP 200. N04 must resolve a requested capability to a real runtime function. Missing functionality is represented explicitly and never as fabricated successful work.

## Structural progress

The latest branch upgrades add the Super GPU execution fabric without deleting or replacing the existing processor, scheduler, worker pool, Mesh protocol, hybrid transport or cooperative-AI layer. The processor now passes work through the Super GPU scheduler while retaining the established priority queue, preserving backward compatibility and creating a clear acceleration seam for future native GPU backends.

## Validation state

Live cross-nucleus communication and provider-backed operational workloads remain environment-dependent validation. Their absence does not block structural construction. GitHub Actions is configured to run on pushes to `main`, pull requests targeting `main`, and manual dispatch. The open structural PR is #5.

The branch still requires the next GitHub Actions execution to establish the current CI result after the latest commits. No green result is claimed until GitHub reports it.

## Topology

N04 IN: N01, N02, N03, N05, N06
N04 OUT: N01, N02, N03, N05, N06

## Current structural commits

- Super GPU engine: `b00e82c2fd53acb8d998a82caaece72885e5f1c9`
- Super GPU timeout hardening: `d8949f0c6063ba5a74fe7c0ba74e08fce5d010e7`
- Processor → Super GPU integration: `d557ebd46f8994e601fad180725b8ff6dee9f438`
- Super GPU documentation: `e57ee24ec6f31d34faef8546bd67d5f67887980`

## Remaining environment validation

1. Run N01 and N04 together and validate correlated request/response.
2. Validate provider credentials for provider-backed AI workloads.
3. Exercise real workloads through the five inbound and five outbound peer paths.
4. Validate timeout behavior against a deliberately slow provider/worker.
5. Validate at least five representative capabilities through the real gateway.
6. Only after those environment tests pass should N04 be called operationally closed; structural readiness is documented separately.
