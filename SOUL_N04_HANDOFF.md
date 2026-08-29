# N04 Handoff Contract

## Current engineering objective

Keep N04 as a high-throughput execution nucleus while making its capabilities composable with N01–N06 through the existing Soul Mesh and hybrid transport layer.

## Completed in this pass

- Added a capability synergy planner that derives cooperative compositions without replacing local capabilities.
- Added cumulative operational directives covering six independent AI nuclei, hybrid interoperability, delegation, capability synergy, six-front coordination, Super-GPU execution and explicit validation states.

## Next implementation targets

1. Bind the processor's declared capabilities to the runtime adapters instead of placeholder acknowledgements.
2. Expose capability registration/introspection so CI can detect declared-but-unregistered handlers.
3. Route cooperative execution through the existing N04CooperativeOrchestrator and negotiated transport.
4. Keep worker execution, priority and cache behind stable interfaces so local and delegated work share one execution contract.
5. Record capability-to-implementation mappings and unresolved environment-only validations in MESH_STATUS.md.

## Handoff rule

A later engineering front must read this file and the repository state before making changes. It must continue from the latest commit rather than recreating or deleting prior work.
