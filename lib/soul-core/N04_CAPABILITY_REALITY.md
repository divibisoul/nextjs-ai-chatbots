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
| artifact.analyze | N04CompositionRuntime | deterministic metadata/hash analysis of supplied artifact payload | IMPLEMENTED; scope limited to supplied payload evidence |
| tool.run | Nucleus04MeshRuntime | Nucleus04ToolRegistry | CONNECTED |
| workflow.execute | N04CompositionRuntime | dependency-aware bounded workflow executor | IMPLEMENTED; CI verification pending |
| schedule.task | N04CompositionRuntime | delayed execution with explicit process-local durability boundary | IMPLEMENTED; non-durable by design |
| parallel.map | N04CompositionRuntime | bounded concurrent map over registered N04 capabilities | IMPLEMENTED; CI verification pending |

## Engineering rule

The Mesh must not advertise a capability as fully implemented merely because a route exists. A capability is considered connected only when the route resolves to an existing runtime implementation. Where no implementation exists, the adapter returns an explicit error instead of a false success.

## Parallelism reality

The current HEAD contains an explicit bounded-concurrency composition runtime. It is not a separate `N04WorkerPool`; the bounded workers live in `N04CompositionRuntime` and execute registered N04 capability handlers. This is an active Super GPU implementation gap, not a completed feature.

This runtime provides CPU/in-process bounded concurrency only. It must not be advertised as SuperGPU hardware execution; distributed GPU execution remains owned by the existing N07 SuperGPU control plane and requires its own runtime evidence.

## Non-destructive policy

Existing application tools and Mesh modules remain intact. This ledger records the verified integration boundary and intentionally leaves unsupported execution paths explicit rather than masking them.
