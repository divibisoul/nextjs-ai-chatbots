# N04 Mesh Status

## Cumulative audit — 2026-08-29

The N04 repository was re-audited against the cumulative Soul directives: independent AI nucleus, common Soul Mesh interoperability layer, hybrid transport, five IN + five OUT peer topology, capability-to-runtime binding, cooperative offer/request/delegation, Super GPU execution, resilience, documentation and CI discipline.

### Structural state

- 15 capability contract: DECLARED AND ROUTED.
- Runtime binding: the advertised N04 capabilities are bound to concrete runtime handlers; unsupported provider-level features remain explicit rather than being represented as fake success.
- AI/tool runtime: CONNECTED to the repository's existing AI SDK, model provider and tools.
- Document runtime: CONNECTED to the existing `createDocument` / `updateDocument` tools.
- Artifact runtime: CONNECTED to the existing artifact handlers for supported artifact kinds and operations; required session and payload fields are validated.
- `artifact.analyze`: explicitly limited to the repository's available analyzer functionality; no fabricated external vision engine is claimed.
- `streaming`: TRANSPORT-BOUND; the existing chat streaming system is preserved and Mesh does not falsely convert a stream into a normal JSON result.
- Context orchestration: IMPLEMENTED with concurrent dispatch through the Super GPU scheduler.
- Batch and `parallel.map`: IMPLEMENTED through the Super GPU scheduler rather than plain unbounded `Promise.all` dispatch.
- Workflow orchestration: IMPLEMENTED as ordered multi-step dispatch.
- Scheduling: IMPLEMENTED as process-local delayed dispatch; persistence across restarts is intentionally not claimed.
- Scheduler: strengthened with bounded concurrency, three priority lanes (`mesh`, `internal`, `batch`), FIFO ordering within a lane, and configurable execution timeout.
- Super GPU execution fabric: IMPLEMENTED as an additive, backend-neutral acceleration layer with bounded parallel capacity, priority scheduling, timeout protection, failure accounting, batch mapping and runtime metrics. Default capacity follows Node `availableParallelism()` and is configurable with `N04_SUPER_GPU_CAPACITY`.
- Timeout accounting: HARDENED. A timed-out operation no longer falsely frees a Super GPU execution slot while its underlying promise is still running; capacity is released only when execution actually settles. This prevents hidden over-subscription after timeouts.
- Existing CPU worker pool: PRESERVED for isolated CPU-bound transforms using `worker_threads`; timeout termination releases its slot only after worker termination.
- Five IN + five OUT logical topology: CONFIGURED for N01, N02, N03, N05, N06.
- Cooperative AI architecture: PRESENT. N04 remains an independent IA and uses Soul Mesh as the interoperability/control plane for capability offers, support requests and work delegation.
- Hybrid transport policy: PRESENT. Supported transport families are negotiated without creating a parallel application API: `IN_PROCESS`, `WEBVIEW_BRIDGE`, `LOOPBACK_HTTP`, `HTTP`, `REALTIME`.
- Peer routing: environment-driven at request time, with per-peer URL/token and controlled defaults.
- TTL cache: IMPLEMENTED (5 min default) for selected read/idempotent paths; cache keys use deterministic serialization so object key ordering cannot create accidental misses.
- Priority semantics: recognized peer Mesh sources receive `mesh` priority; `batch.process` and `parallel.map` use the lowest `batch` lane.
- README: UPDATED with Super GPU architecture and cooperative-AI model.
- ARCHITECTURE.md: PRESENT.

## Capability reality map

| Capability | Structural implementation |
|---|---|
| `ai-pilot` | Existing AI SDK/provider runtime |
| `tool-execution` | Existing tool runtime |
| `artifact-processing` | Existing artifact handlers |
| `document-processing` | Existing document tools |
| `context-orchestration` | Super GPU concurrent dispatcher |
| `streaming` | Existing chat-stream transport boundary |
| `mesh-communication` | Hybrid peer transport + cooperative Mesh |
| `batch.process` | Super GPU batch mapping |
| `document.create` | Existing document creation tool |
| `document.edit` | Existing document update tool |
| `artifact.analyze` | Repository-native artifact metadata/content analysis |
| `tool.run` | Existing tool runtime |
| `workflow.execute` | Ordered multi-step dispatcher |
| `schedule.task` | Process-local delayed dispatcher |
| `parallel.map` | Super GPU parallel mapping |

## Architecture rule

Each N01–N06 nucleus remains an independent AI with its own agents and capabilities. Soul Mesh is the shared interoperability/control plane. N04 may offer capabilities, request support, delegate work and return correlated results. Hybrid transports carry the canonical Mesh message; no parallel application API is introduced.

## Engineering reality rule

A route is not considered implemented merely because it returns HTTP 200. N04 must resolve a requested capability to a real runtime function. Missing functionality is represented explicitly and never as fabricated successful work.

## Validation state

Live cross-nucleus communication and provider-backed operational workloads remain environment-dependent validation. Their absence does not block structural construction, consistent with the project's electrical/hydraulic-style build strategy. GitHub Actions is configured for pushes to `main`, pull requests targeting `main`, and manual dispatch.

PR #5 remains the structural integration PR. The branch and `main` have diverged since the PR was opened; the latest `main` contains later N04 protocol/security work while the structural branch intentionally preserves the richer hybrid transport contract. This divergence must be reconciled before merging; no destructive reset is authorized.

No green CI result is claimed until GitHub reports an actual run for the current branch head.

## Topology

N04 IN: N01, N02, N03, N05, N06
N04 OUT: N01, N02, N03, N05, N06

## Latest cumulative correction commits

- Super GPU engine: `b00e82c2fd53acb8d998a82caaece72885e5f1c9`
- Super GPU timeout hardening: `d8949f0c6063ba5a74fe7c0ba74e08fce5d010e7`
- Processor → Super GPU integration: `d557ebd46f8994e601fad180725b8ff6dee9f438`
- Super GPU documentation: `e57ee24ec6f31d34faef8546bd67d5f67887980`
- Timeout capacity correction: `3749a629a3d714ce58e44e1b370bcb1774bd83f4`
- Batch/parallel Super GPU routing: `f7130042061c131a5f2c8c593cc7e507328daf4f`
- Super GPU timeout regression test: `481212fab36bb48f04453a66d20cd8bc10518dcc`

## Remaining closure work

1. Obtain a real CI run for the current branch head and correct every reported failure.
2. Reconcile the branch with later mainline N04 protocol/security changes without losing the hybrid transport architecture or 15-capability work.
3. Validate N01↔N04 and the other peer paths when the nuclei can be run together.
4. Validate provider credentials for provider-backed AI workloads.
5. Exercise at least five representative capabilities through the real gateway.
6. Only after operational validation passes should N04 be called operationally closed; structural readiness is documented separately.
