# N04 Mesh Status

## Cumulative audit — 2026-08-29

The N04 repository is governed by the cumulative Soul directives: independent AI nucleus, common Soul Mesh interoperability layer, hybrid transport, five IN + five OUT peer topology, capability-to-runtime binding, cooperative offer/request/delegation, Super GPU execution, resilience, documentation and CI discipline.

## Permanent engineering directive — audit, complete, evolve, verify

This directive is additive and does not cancel or replace any previous N04 requirement.

For every area inspected — code, configuration, dependency, Mesh, runtime, transport, capability, agent, scheduler, cache, security, tests, CI, documentation or architecture — the real repository state is compared against the cumulative requirements. An incomplete or weak area is corrected, completed, strengthened, integrated and documented whenever technically possible. Existing functionality is preserved through minimal-diff changes. Live multi-nucleus validation is recorded separately and is never fabricated.

## Structural state

- 15 capability contract: DECLARED AND ROUTED.
- Runtime binding: all 15 advertised capabilities now have explicit runtime handlers or explicit transport-bound behavior; no new capability is left to fall through to `CAPABILITY_HANDLER_NOT_REGISTERED`.
- AI/tool runtime: CONNECTED to the repository's existing AI SDK, provider, models and tools.
- Document runtime: CONNECTED to the existing document creation/update tools.
- Artifact runtime: CONNECTED to the existing artifact handlers for supported artifact kinds and operations; `artifact.analyze` reports repository-native metadata/content analysis rather than inventing a vision provider.
- Streaming: TRANSPORT-BOUND to the existing chat streaming system; Mesh does not fabricate a synchronous stream result.
- Context orchestration: IMPLEMENTED with concurrent dispatch through the Super GPU scheduler.
- Batch and `parallel.map`: IMPLEMENTED through bounded Super GPU scheduling.
- Workflow orchestration: IMPLEMENTED as ordered multi-step capability dispatch.
- Scheduling: IMPLEMENTED as process-local delayed dispatch; persistence across restarts is intentionally not claimed.
- Super GPU execution fabric: IMPLEMENTED as bounded parallel software orchestration using Node `availableParallelism()`, three priority lanes, timeout protection, metrics and configurable capacity. This is an execution/acceleration layer, not a claim of physical GPU hardware.
- Existing worker-thread pool: PRESERVED for isolated CPU-bound transforms; it is not used to fake execution of session-bound application tools.
- Five IN + five OUT logical topology: CONFIGURED for N01, N02, N03, N05, N06.
- Cooperative AI architecture: PRESENT. N04 remains an independent IA and can offer capabilities, request support, delegate work and return correlated results through Soul Mesh.
- Hybrid transport policy: PRESENT for `IN_PROCESS`, `WEBVIEW_BRIDGE`, `LOOPBACK_HTTP`, `HTTP`, `REALTIME` without creating a parallel application API.
- Outbound peer path: environment-driven per-peer URL/token with retry and correlation validation.
- Mesh security: token authentication is mandatory by default at the N04 gateway; `MESH_AUTH_DISABLED=true` is the explicit test-only bypass. Optional HMAC signing/verification is available through `SOUL_MESH_HMAC_SECRET` with canonical envelope signing and clock-skew protection.
- TTL cache: IMPLEMENTED for selected read/idempotent paths with deterministic keys; mutating work is not cached by default.
- README: UPDATED.
- ARCHITECTURE.md: PRESENT.

## Capability reality map

| Capability | Structural implementation |
|---|---|
| `ai-pilot` | Existing AI SDK/provider runtime |
| `tool-execution` | Existing controlled tool runtime |
| `artifact-processing` | Existing artifact handlers |
| `document-processing` | Existing document tools |
| `context-orchestration` | Super GPU concurrent dispatcher |
| `streaming` | Existing chat-stream transport boundary |
| `mesh-communication` | Hybrid peer transport + cooperative Mesh |
| `batch.process` | Super GPU bounded batch mapping |
| `document.create` | Existing document creation tool |
| `document.edit` | Existing document update tool |
| `artifact.analyze` | Repository-native artifact metadata/content analyzer |
| `tool.run` | Existing controlled tool runtime |
| `workflow.execute` | Ordered multi-step dispatcher |
| `schedule.task` | Process-local delayed dispatcher |
| `parallel.map` | Super GPU bounded parallel mapping |

## Cooperative AI model

Each N01–N06 nucleus remains an independent AI with its own agents and capabilities. Soul Mesh is the shared interoperability/control plane. N04 is therefore both a service provider and a service consumer: it can advertise work it owns, request work from another nucleus when needed, delegate work to a peer and correlate the response back to the originating request.

## Validation state

GitHub Actions is configured for pushes to `main`, pull requests targeting `main`, and manual dispatch. Structural code changes are being validated through the N04 contract suite and production build in CI. Live N01↔N04 and full K6 communication remains environment-dependent and is intentionally pending until the nuclei can be run together. No live result is fabricated.

## Current integration branch

`upgrade/n04-cooperative-super-gpu-v1` is the cumulative N04 hardening line built from the latest structural-close state available to this workstream. The repository also contains later divergent N04 protocol/security commits on another line; those changes were audited and the compatible HMAC hardening was integrated here without destructive reset of the Super GPU/cooperative architecture.

## Latest corrections in this workstream

- `15ea683841f44a7ec2ebc5147e4f4155e0457a1d` — register every advertised capability against runtime handlers.
- `08e63805d0e68a9d721be51b5a7bf1a425e2d736` — add canonical HMAC verification.
- `3bf3c0532e874f5ae58fb0c9a224c24af5490c5f` — enforce Mesh authentication and optional HMAC at gateway.
- `7e570aaa990cfc1ac7d762a3775d181e5fc064c2` — sign outbound Mesh envelopes when HMAC is configured.

## Remaining closure work

1. Obtain and inspect a real CI run for the current branch head; correct every reported failure.
2. If CI is green, perform live multi-nucleus validation when N01–N06 can be run together.
3. Validate provider credentials and representative workloads through the real gateway.
4. Reconcile any remaining divergent mainline protocol changes only when their merge preserves the cumulative N04 architecture.
5. Operational closure must remain distinct from structural readiness until live validation is available.
