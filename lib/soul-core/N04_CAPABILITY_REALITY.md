# N04 capability reality map

This file is an engineering ledger, not a replacement for existing implementations.

| Capability | Current bridge | Real implementation available in repository | Status |
|---|---|---|---|
| ai-pilot | Nucleus04MeshRuntime | AI SDK + myProvider | CONNECTED |
| tool-execution | Nucleus04MeshRuntime | Nucleus04ToolRegistry + existing tools | CONNECTED |
| artifact-processing | Nucleus04MeshRuntime | delegated tool boundary | DELEGATED; requires concrete artifact tool payload |
| document-processing | Nucleus04MeshRuntime | existing document tools | CONNECTED THROUGH TOOL BOUNDARY |
| context-orchestration | Nucleus04MeshRuntime | context envelope | CONNECTED; orchestration semantics can expand |
| streaming | Nucleus04MeshRuntime | existing chat streaming transport | DELEGATED; Mesh route does not fabricate a stream |
| mesh-communication | Nucleus04MeshRuntime | peer-client | CONNECTED |
| batch.process | Nucleus04MeshRuntime | Promise.all over registered handlers | CONNECTED |
| document.create | Nucleus04MeshRuntime | createDocument | CONNECTED |
| document.edit | Nucleus04MeshRuntime | updateDocument | CONNECTED |
| artifact.analyze | Nucleus04MeshRuntime | no standalone analyzer located | EXPLICIT PENDING (no fake success) |
| tool.run | Nucleus04MeshRuntime | Nucleus04ToolRegistry | CONNECTED |
| workflow.execute | Nucleus04MeshRuntime | batch dispatcher | CONNECTED |
| schedule.task | Nucleus04MeshRuntime | in-process timer | CONNECTED (ephemeral scheduler) |
| parallel.map | Nucleus04MeshRuntime | Promise.all over registered handlers | CONNECTED |

## Engineering rule

The Mesh must not advertise a capability as fully implemented merely because a route exists. A capability is considered connected only when the route resolves to an existing runtime implementation. Where no implementation exists, the adapter returns an explicit error instead of a false success.

## Parallelism

N04WorkerPool uses Node worker_threads and availableParallelism(). This provides CPU parallelism; it is not a GPU. GPU acceleration must be added later through an actual GPU-capable backend rather than by naming CPU workers a GPU.

## Non-destructive policy

Existing application tools and Mesh modules remain intact. This ledger is additive and records the real integration boundary discovered during the N04 audit.
