# N04 Mesh Status

## Structural upgrade — 2026-08-27

- 15 capability contract: DECLARED AND ROUTED
- Real runtime handlers: CONNECTED for AI, tools, documents, orchestration, Mesh and scheduling
- `artifact.analyze`: EXPLICIT PENDING — no standalone artifact analyzer exists in the repository; the runtime refuses fake success
- `streaming`: PRESERVED through the existing chat streaming transport; Mesh request path returns an explicit transport-required error instead of fabricating a stream
- Parallel worker execution: IMPLEMENTED with Node `worker_threads`
- Worker resilience: IMPLEMENTED with bounded concurrency, priority, timeout and worker termination/recovery
- Batch and `parallel.map`: IMPLEMENTED with real concurrent handler dispatch
- Workflow orchestration: IMPLEMENTED for ordered multi-step dispatch
- Five IN + five OUT logical topology: CONFIGURED for N01, N02, N03, N05, N06
- N01 registration/discovery: PRESENT in the N04 Mesh layer
- TTL cache: IMPLEMENTED (5 min default) and restricted to read/idempotent runtime paths in the processor
- Priority queue: IMPLEMENTED; N01 Mesh requests receive higher priority
- README: UPDATED
- ARCHITECTURE.md: PRESENT

## Engineering reality rule

A route is not considered a capability implementation merely because it returns HTTP 200. N04 must resolve the requested capability to a real runtime function. Missing functionality is reported as `CAPABILITY_NOT_IMPLEMENTED`; it is never represented as a successful fake result.

## Validation state

GitHub CI is the authoritative build/typecheck/contract validation. Live N01↔N04 communication and provider-backed operational tests remain pending until the nuclei are running together. This does not block structural construction.

## Dependency note

The requested Piscina optimization was evaluated against the repository's pnpm frozen-lockfile workflow. The current pool uses stable Node `worker_threads` without introducing an unverified dependency/lockfile change. Piscina can be introduced later as a replaceable adapter when its lockfile is intentionally updated.

## Topology

N04 IN: N01, N02, N03, N05, N06
N04 OUT: N01, N02, N03, N05, N06

## Current structural commits

- Runtime bridge: `dc9c1a64e3b5ed29769331246c9486e843fe310e`
- Processor binding: `bfd00676d76f29f71dc9e1901714abc740b58540`
- Worker resilience: `d8600d346290f02b5104ec6649e200ec7b653681`
