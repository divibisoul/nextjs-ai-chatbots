# N04 Mesh Status

## Structural upgrade — 2026-08-27

- 15 capability contract: DECLARED AND ROUTED
- Runtime binding: every advertised capability now has a concrete registered handler; a handler may still return a structured capability-level limitation when the underlying feature is not present.
- AI/tool runtime: CONNECTED to the repository's existing AI SDK, model provider and tools.
- Document runtime: CONNECTED to the existing `createDocument` / `updateDocument` tools.
- Artifact runtime: CONNECTED to the existing artifact handlers for `text`, `code`, `image` and `sheet` create/update operations; required session and payload fields are validated.
- `artifact.analyze`: PENDING BY DESIGN — the repository has artifact generation/update handlers but no standalone artifact analysis engine. The Mesh reports `CAPABILITY_NOT_IMPLEMENTED` instead of fabricating success.
- `streaming`: TRANSPORT-BOUND — the existing chat streaming system is preserved. Mesh request/response returns a structured transport requirement rather than pretending a stream is a normal JSON result.
- Context orchestration: IMPLEMENTED as real dispatch of declared subtasks with concurrent result aggregation.
- Batch and `parallel.map`: IMPLEMENTED with concurrent dispatch through the runtime handler graph.
- Workflow orchestration: IMPLEMENTED with ordered multi-step dispatch.
- Scheduling: IMPLEMENTED as process-local delayed dispatch; persistence across process restarts is intentionally not claimed.
- Parallel worker execution: IMPLEMENTED with Node `worker_threads` for isolated CPU-bound transforms.
- Worker resilience: IMPLEMENTED with bounded concurrency, priority, timeout and worker termination/recovery.
- Five IN + five OUT logical topology: CONFIGURED for N01, N02, N03, N05, N06.
- N01 registration/discovery: PRESENT in the N04 Mesh layer.
- TTL cache: IMPLEMENTED (5 min default) and restricted to read/idempotent runtime paths in the processor.
- Priority queue: IMPLEMENTED; N01 Mesh requests receive higher priority than internal processor work.
- README: UPDATED.
- ARCHITECTURE.md: PRESENT.

## Cooperative AI architecture

N04 is an independent AI nucleus. Soul Mesh remains the common protocol/control plane, while peer communication may negotiate a compatible transport instead of being restricted to a single HTTP path. The hybrid policy is implemented in `lib/soul-mesh/HybridInteropPolicy.ts` and builds on the existing transport registry/multiplexer.

Supported transport families are negotiated per peer: `IN_PROCESS`, `WEBVIEW_BRIDGE`, `LOOPBACK_HTTP`, `HTTP`, and `REALTIME`. The decision is bidirectional and capability-neutral: the transport carries Soul Mesh messages; it does not create a parallel application API.

N04 exposes an explicit cooperative contract in `lib/soul-mesh/N04CooperativeMesh.ts`. It supports three operational directions over the same Soul Mesh protocol: capability offers to peers, support requests when N04 needs another nucleus, and work delegation when another nucleus owns the requested capability. Every operation retains peer identity, capability, payload, return nucleus and correlation metadata.

N04 peer routing is environment-driven at request time rather than captured during module import. Each peer may have its own URL and token through `SOUL_MESH_N01_URL` + `SOUL_MESH_N01_TOKEN` through `SOUL_MESH_N06_URL` + `SOUL_MESH_N06_TOKEN`, with `SOUL_MESH_URL_DEFAULT` and `SOUL_MESH_TOKEN` as controlled fallbacks. This permits independently booted IAs to be reconfigured without rebuilding the process.

This means N01–N06 can remain independent IAs while gaining a complete interoperability layer: discovery → transport negotiation → request/support/delegation → capability execution → correlated response. If a preferred transport is unavailable, the existing hybrid fallback mechanism can select another mutually supported transport; if none exists, the system reports that explicitly rather than fabricating connectivity.

## Engineering reality rule

A route is not considered a capability implementation merely because it returns HTTP 200. N04 must resolve the requested capability to a real runtime function. Missing functionality is reported explicitly and is never represented as successful fake work.

## Validation state

The latest GitHub Actions run for commit `745b428c69372f0261e8f67e8af3eb66fe02d123` failed in the N04 contract-test step after `pnpm install` and TypeScript typecheck succeeded; the web build was skipped because the test step failed. A deterministic Node/tsx test-runner correction was committed as `2f44ef67161da6b36eb78a522d3f58d7452f3185`, followed by dynamic peer routing/authentication hardening in `a5abf0d9050e291f211f913a336ed5fb59f1e3d1`. The new commit must be validated by the next GitHub Actions run before CI can be called green.

Live N01↔N04 communication, provider-backed credentials and real operational workloads remain environment-dependent validation steps. Their absence does not block structural construction.

## Topology

N04 IN: N01, N02, N03, N05, N06
N04 OUT: N01, N02, N03, N05, N06

## Current structural commits

- Runtime bridge: `dc9c1a64e3b5ed29769331246c9486e843fe310e`
- Processor binding: `bfd00676d76f29f71dc9e1901714abc740b58540`
- Worker resilience: `d8600d346290f02b5104ec6649e200ec7b653681`
- Runtime handler hardening: `b0264064c94f30e7e096926a0d8028b491aff057`
- Capability binding regression test: `da2b2227b366c0a292c074352c6c6a1e84b2888d`
- Hybrid interoperability policy: `383a27b799ddc974f4936ae4ec7152da78de9ef7`
- Cooperative peer support/delegation: `3f8d88d633d25932a58d5aa8ec42eefef2ffe489`
- Cooperative correlation hardening: `5237b0281671c419f523959b4bff62b5ac2a2210`
- Deterministic Mesh contract test runner: `2f44ef67161da6b36eb78a522d3f58d7452f3185`
- Dynamic peer routing/authentication: `a5abf0d9050e291f211f913a336ed5fb59f1e3d1`
