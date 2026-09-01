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
| batch.process | Nucleus04MeshRuntime | handler-level batch composition documented in prior work | STRUCTURAL; runtime proof required |
| document.create | Nucleus04MeshRuntime | createDocument | CONNECTED |
| document.edit | Nucleus04MeshRuntime | updateDocument | CONNECTED |
| artifact.analyze | Nucleus04MeshRuntime | no standalone analyzer located | PENDING; no fake success |
| tool.run | Nucleus04MeshRuntime | Nucleus04ToolRegistry | CONNECTED |
| workflow.execute | Nucleus04MeshRuntime | workflow/batch dispatch path | STRUCTURAL; runtime proof required |
| schedule.task | Nucleus04MeshRuntime | in-process timer concept | STRUCTURAL; ephemeral scheduler requires runtime proof |
| parallel.map | Nucleus04MeshRuntime | composition path documented | STRUCTURAL; runtime proof required |

## Engineering rule

The Mesh must not advertise a capability as fully implemented merely because a route exists. A capability is considered connected only when the route resolves to an existing runtime implementation. Where no implementation exists, the adapter returns an explicit error instead of a false success.

## Parallelism reality

The current HEAD contains parallel/composition contracts but **does not contain the previously claimed `N04WorkerPool` file**. Therefore CPU worker-pool execution is not currently proven by a dedicated worker-pool implementation in this repository. This is an active Super GPU implementation gap, not a completed feature.

The eventual SOUL Super GPU remains a logical distributed parallel-processing fabric. A future worker pool or equivalent executor must be connected to the real N04 runtime and tested before it is advertised as executable capability.

## Non-destructive policy

Existing application tools and Mesh modules remain intact. This ledger records the verified integration boundary and intentionally leaves unsupported execution paths explicit rather than masking them.
