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
- ARCHITECTURE.md: ADDED

## Cooperative IA architecture

N04 is an independent IA node. The Mesh is the inter-nucleus interoperability layer, while the application/runtime remains the execution layer. N04 can offer capabilities to peers and can request/delegate work through `mesh-communication` and the existing peer client. HTTP is the current concrete transport; the transport registry remains extensible for WebView, loopback and realtime adapters without inventing an unavailable transport implementation.

## Validation state

The GitHub workflow is configured for push, pull_request and manual dispatch. Live N01<->N04 communication and provider-dependent capabilities still require the nuclei to be running together; they are not claimed merely because code compiles.

## Known implementation boundary

`artifact.analyze` remains an explicit `N04_ARTIFACT_ANALYZER_NOT_IMPLEMENTED` adapter because this repository does not contain a real standalone artifact-analysis engine. It is intentionally not replaced with a fake success response. The existing document/tool/AI-provider paths remain the source of truth.

## Dependency note

The requested Piscina optimization was evaluated against the repository's pnpm frozen-lockfile workflow. N04 currently uses the stable built-in Node `worker_threads` API so the upgrade does not introduce an unverified lockfile mutation. Piscina can be introduced later as a replaceable adapter after a lockfile-backed dependency update.

## Topology

N04 IN: N01, N02, N03, N05, N06
N04 OUT: N01, N02, N03, N05, N06

## Current branch

`upgrade/n04-hybrid-cooperative-v10`
