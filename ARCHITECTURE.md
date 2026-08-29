# N04 Architecture — Super GPU

## System model

N04 is one independent IA nucleus inside a six-nucleus cooperative system. N01–N06 own their own agents, capabilities and runtime. The Soul Mesh is the canonical interoperability layer for discovery, delegation, request/response and correlation.

## Runtime flow

`Mesh request → N04 ingress → validation → priority scheduler → Nucleus04Processor → capability handler → worker/orchestrator/cache OR cooperative delegation → correlated response`.

The HTTP Mesh endpoint is the current concrete ingress/transport. Existing transport negotiation remains additive so the same Mesh contract can use HTTP, REALTIME, LOOPBACK_HTTP, WEBVIEW_BRIDGE or IN_PROCESS where both sides support it. No parallel API contract is required.

## 15 capabilities

Original: `ai-pilot`, `tool-execution`, `artifact-processing`, `document-processing`, `context-orchestration`, `streaming`, `mesh-communication`.

Expanded: `batch.process`, `document.create`, `document.edit`, `artifact.analyze`, `tool.run`, `workflow.execute`, `schedule.task`, `parallel.map`.

A declared capability must resolve to a real implementation path or an explicit structured not-implemented result. Registration alone is not evidence that an external provider or peer is reachable.

## Parallelism / Super GPU

`N04WorkerPool` bounds concurrent CPU worker threads using Node's `availableParallelism()`. Document, artifact and tool workloads use worker entrypoints where appropriate. `parallel.map` and `batch.process` fan out independent work and aggregate results. Mesh requests originating at N01 receive higher scheduling priority than internal work.

The Super GPU designation means parallel execution/orchestration at the software-runtime level. It does not claim physical GPU acceleration unless an actual GPU backend is configured.

Workers are intended for CPU-heavy JavaScript work; network/database I/O remains in the application runtime rather than being moved into workers unnecessarily.

## Cache and resilience

`N04TtlCache` defaults to 300000 ms and can be configured with `N04_CACHE_TTL_MS`. Keys include capability and serialized input. Side-effecting operations are excluded from unsafe result caching.

Gateway protections include peer rate limiting, execution timeout, circuit breaking, payload-size validation and correlation IDs.

## Hybrid cooperative IA

N04 first attempts local execution for capabilities it owns. For work it cannot perform locally, the cooperative layer discovers a peer that advertises the capability, negotiates a common transport and sends a correlated Mesh request. This allows agent/capability composition across nuclei without replacing the canonical Mesh.

Example cooperative chain:

`N1 reasoning → N2 specialist analysis → N3 transformation → N4 execution → N6 planning → N1 result`.

The exact path is capability-driven; it is not hard-coded to one peer.

## K6 topology

N04 has five logical IN channels and five logical OUT peers:

- IN: N01, N02, N03, N05, N06
- OUT: N01, N02, N03, N05, N06

Discovery and peer addressing determine the concrete endpoint. Correlation IDs preserve request/response identity.

## Six-front engineering coordination

The six simultaneous engineering conversations are treated as independent workstreams sharing GitHub as the durable coordination surface. Every completed pass must leave branch/commit, changed files, completed work, verified facts, unresolved gaps and explicit next actions. Pair work is additive: two nuclei can be strengthened together so their agents and capabilities become complementary and reusable by subsequent pairs.

The complete rules are defined in `SOUL_N04_UNIFIED_EXECUTION_CONTRACT.md`.

## Audit / closure loop

Every N04 pass follows: inspect real repository → compare against the unified contract and prior requirements → inventory every gap → correct/complete/harden each applicable area → validate → document → re-inspect → hand off with an explicit remaining ledger. Operational six-nucleus E2E validation can remain pending until the nuclei are running together, but that boundary never stops repository-level engineering.

## Honest boundary

`artifact.analyze` remains an explicit `N04_ARTIFACT_ANALYZER_NOT_IMPLEMENTED` adapter because the repository does not contain a real standalone artifact-analysis engine. No fake success path is used.
