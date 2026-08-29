# N04 Mesh Status

## Structural upgrade

- 15 capability contract: IMPLEMENTED
- Runtime handler registry: IMPLEMENTED
- HTTP Mesh endpoint -> processor -> capability adapter -> response: CONNECTED
- Parallel worker execution: IMPLEMENTED with Node worker_threads
- Worker timeout and priority queue: IMPLEMENTED
- Batch and parallel.map: IMPLEMENTED
- Workflow orchestration: IMPLEMENTED
- Five IN + five OUT logical topology: CONFIGURED
- N01/N02/N03/N05/N06 peer addressing: CONFIGURED through environment/discovery
- N01 registration capability advertisement: IMPLEMENTED
- TTL cache: IMPLEMENTED (5 min default; side-effecting Mesh/tool/scheduling operations excluded)
- Peer rate limiting: IMPLEMENTED (100 requests/minute)
- Peer circuit breaker: IMPLEMENTED (5 consecutive failures / 60s)
- Payload limit: IMPLEMENTED (1 MB)
- Correlation ID propagation: IMPLEMENTED by the canonical Mesh protocol
- README: UPDATED
- ARCHITECTURE.md: UPDATED
- Unified execution contract: ADDED (`SOUL_N04_UNIFIED_EXECUTION_CONTRACT.md`)

## Cooperative IA architecture

N04 is an independent IA node. N01–N06 are treated as independent nuclei with their own agents/capabilities. The Soul Mesh is the canonical interoperability layer. N04 can offer capabilities to peers and can request/delegate work through `mesh-communication` and the existing peer client. Transport negotiation remains hybrid and additive: HTTP, REALTIME, LOOPBACK_HTTP, WEBVIEW_BRIDGE and IN_PROCESS are represented by the existing transport contract; no parallel API contract is introduced.

Local execution is preferred when N04 owns the requested capability. If the work is outside N04's local capability set, the cooperative layer can discover a capable peer, negotiate a supported transport, issue a correlated request and return the peer result.

## Parallel workstream coordination

GitHub is the durable coordination surface for the six simultaneous engineering fronts. Each front must leave its branch/commit, changed files, completed work, verified facts, unresolved failures and explicit next actions. Pair work is additive: completed pair capabilities should strengthen both nuclei and expose reusable contracts to subsequent pairs without deleting individual backlogs.

The canonical cross-front rules are in `SOUL_N04_UNIFIED_EXECUTION_CONTRACT.md`.

## Validation state

The GitHub workflow is configured for push, pull_request and manual dispatch. Repository-level validation is covered by the N04 typecheck, contract tests and build steps in CI. Live N01<->N04 communication, provider reachability and full six-nucleus E2E behavior require the nuclei to be running together; they are not claimed merely because code compiles.

## Known implementation boundary

`artifact.analyze` remains an explicit `N04_ARTIFACT_ANALYZER_NOT_IMPLEMENTED` adapter because this repository does not contain a real standalone artifact-analysis engine. It is intentionally not replaced with a fake success response. The existing document/tool/AI-provider paths remain the source of truth.

## Dependency note

The requested Piscina optimization was evaluated against the repository's pnpm frozen-lockfile workflow. N04 currently uses the stable built-in Node `worker_threads` API so the upgrade does not introduce an unverified lockfile mutation. Piscina can be introduced later as a replaceable adapter after a lockfile-backed dependency update.

## Topology

N04 IN: N01, N02, N03, N05, N06
N04 OUT: N01, N02, N03, N05, N06

## Audit rule

Every future N04 audit must follow: inspect real GitHub state → compare with the unified contract → enumerate all gaps → fix/complete/harden each applicable gap → validate → document → re-inspect → hand off with explicit next actions. Finding an error is not the completion condition; correcting and strengthening it is.

## Current branch

`upgrade/n04-hybrid-cooperative-v10`

## Latest contract commit

`177bba991941c7915d02268a5acfab271adc73f8` — 2026-08-29
