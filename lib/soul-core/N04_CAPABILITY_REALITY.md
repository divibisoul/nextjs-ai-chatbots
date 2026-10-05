# N04 capability reality map

This file is an engineering ledger, not a replacement for existing implementations. It is reconciled against the current GitHub tree and must be revalidated after runtime changes.

| Capability | Current bridge | Real implementation available in repository | Status |
|---|---|---|---|
| ai-pilot | Nucleus04MeshRuntime | AI SDK + myProvider | CONNECTED |
| tool-execution | Nucleus04MeshRuntime | Nucleus04ToolRegistry + existing tools | CONNECTED |
| artifact-processing | Nucleus04MeshRuntime | delegated tool boundary | DELEGATED; requires concrete artifact tool payload |
| document-processing | Nucleus04MeshRuntime | existing document tools | CONNECTED THROUGH TOOL BOUNDARY |
| context-orchestration | Nucleus04MeshRuntime | context envelope | CONNECTED; orchestration semantics can expand |
| streaming | Nucleus04MeshRuntime | existing chat streaming transport | DELEGATED; Mesh route must not fabricate a stream |
| mesh-communication | Nucleus04MeshRuntime | peer-client | CONNECTED |
| batch.process | N04CompositionRuntime | bounded concurrent execution over registered N04 capabilities | IMPLEMENTED; CI verification pending |
| document.create | Nucleus04MeshRuntime | createDocument | CONNECTED |
| document.edit | Nucleus04MeshRuntime | updateDocument | CONNECTED |
| artifact.analyze | N04CompositionRuntime + standalone `ArtifactAnalyzer.ts` | deterministic metadata/hash analysis of supplied artifact payload | IMPLEMENTED; standalone component added; parity with resident execution covered by CI; scope limited to supplied payload evidence |
| tool.run | Nucleus04MeshRuntime | Nucleus04ToolRegistry | CONNECTED |
| workflow.execute | N04CompositionRuntime | dependency-aware bounded workflow executor | IMPLEMENTED; CI verification pending |
| schedule.task | N04CompositionRuntime | delayed execution with explicit process-local durability boundary | IMPLEMENTED; non-durable by design |
| parallel.map | N04CompositionRuntime | bounded concurrent map over registered N04 capabilities | IMPLEMENTED; CI verification pending |

## Engineering rule

The Mesh must not advertise a capability as fully implemented merely because a route exists. A capability is considered connected only when the route resolves to an existing runtime implementation. Where no implementation exists, the adapter returns an explicit error instead of a false success.

## Parallelism reality

The current HEAD contains an explicit bounded-concurrency composition runtime and now also contains a standalone `N04WorkerPool.ts` that exposes the same bounded worker semantics for independent reuse and testing. The resident `N04CompositionRuntime` path remains intact for compatibility; no existing execution capability was removed or silently replaced.

This runtime provides CPU/in-process bounded concurrency only. It must not be advertised as SuperGPU hardware execution; distributed GPU execution remains owned by the existing N07 SuperGPU control plane and requires its own runtime evidence.

## Non-destructive policy

Existing application tools and Mesh modules remain intact. This ledger records the verified integration boundary and intentionally leaves unsupported execution paths explicit rather than masking them.

## Additive component reconciliation — 2026-10-05

The previously missing named components are now present: `lib/soul-core/N04WorkerPool.ts` and `lib/soul-core/ArtifactAnalyzer.ts`. Existing inline `boundedMap` and `analyzeArtifact` implementations remain preserved in `N04CompositionRuntime`; `N04DedicatedComponents.test.ts` verifies the standalone artifact analyzer is behaviorally aligned with resident execution. No dependency install or lockfile mutation was introduced.
