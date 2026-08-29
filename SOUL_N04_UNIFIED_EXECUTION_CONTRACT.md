# SOUL — N04 Unified Execution Contract

**Canonical directive:** this document consolidates the latest N04 requirements. It is additive to the existing implementation; it does not authorize deletion, rollback, or replacement of working code.

## 1. System model

N01–N06 are six independent IA nuclei. Each nucleus owns its agents, capabilities, runtime and local state. The Soul Mesh is the canonical interoperability layer for discovery, requests, responses, delegation and correlation. N04 may also negotiate the concrete transport already supported by the Mesh (HTTP, REALTIME, LOOPBACK_HTTP, WEBVIEW_BRIDGE or IN_PROCESS); this is hybrid transport, not a parallel API.

A connection is considered structurally complete only when it supports:

- ingress;
- identity (`N04`);
- capability/agent advertisement;
- egress;
- request/response correlation;
- discovery;
- delegation to another nucleus when local execution is insufficient;
- return of results to the requesting nucleus.

## 2. Non-destructive engineering rule

For every audit finding, do not stop at identifying the defect. Preserve correct behavior and then complete, connect, harden, optimize, test or document the affected area. Never invent a successful result for an unavailable implementation. Use an explicit structured capability error when a real implementation does not exist.

## 3. N04 execution engine / Super GPU

N04 remains the execution-oriented nucleus. Its runtime must provide:

- 15 advertised capabilities;
- real handler registration or explicit structured `CAPABILITY_NOT_IMPLEMENTED` adapters;
- HTTP Mesh ingress into the processor/runtime chain;
- cooperative delegation through the canonical Mesh;
- bounded parallel CPU execution using the existing worker-thread implementation;
- stable priority scheduling, with N01 Mesh work above internal batch work;
- task timeout and failure isolation;
- deterministic TTL caching for safe repeatable operations;
- rate limiting, circuit breaking, payload validation and correlation IDs;
- five logical IN peers and five logical OUT peers: N01, N02, N03, N05, N06;
- automatic N01 registration/advertisement when configured;
- documentation and CI coverage.

The phrase “Super GPU” is an architectural role: N04 provides parallel execution and orchestration. It must not claim GPU hardware acceleration unless the runtime actually uses a GPU.

## 4. Capability contract

Original capabilities:

1. `ai-pilot`
2. `tool-execution`
3. `artifact-processing`
4. `document-processing`
5. `context-orchestration`
6. `streaming`
7. `mesh-communication`

Expanded capabilities:

8. `batch.process`
9. `document.create`
10. `document.edit`
11. `artifact.analyze`
12. `tool.run`
13. `workflow.execute`
14. `schedule.task`
15. `parallel.map`

Each capability must resolve to an actual implementation path or a structured, honest not-implemented response. `CAPABILITY_HANDLER_NOT_REGISTERED` is not an acceptable terminal state for a declared capability.

## 5. Execution chain

`N01 → Soul Mesh → N04 ingress → validation → priority scheduler → Nucleus04Processor → capability handler → local worker/orchestrator/cache OR cooperative delegation → response → correlation back to requester`.

No separate parallel API contract is to be introduced merely to bypass Mesh interoperability.

## 6. Hybrid cooperative IA

N04 can both offer work and request work. When a requested capability is available locally, local execution is preferred. When it is not available locally, the cooperative layer discovers a capable peer, negotiates an available transport, sends a correlated Mesh request and returns the peer result. The implementation must never silently downgrade a missing capability to a fake success.

This enables compositions such as:

`N1 reasoning → N2 specialist analysis → N3 transformation → N4 execution → N6 planning → N1 result`.

The exact route is dynamic and capability-driven rather than hard-coded to a single nucleus.

## 7. Six-front parallel work model

The six ChatGPT workstreams are treated as parallel engineering fronts. GitHub is the shared source of truth and coordination surface. Each front must leave durable state for the other fronts:

- current branch and latest commit;
- files changed;
- completed work;
- verified facts and unresolved failures;
- explicit next actions for the receiving front;
- dependencies/blockers that require another nucleus.

Pair work is additive: two nuclei can be advanced together so their agents/capabilities become complementary and multiplicative. Pair completion must not erase the individual nucleus backlog. When a pair is structurally ready, the next pair may advance concurrently.

## 8. Audit loop — start → middle → closure → handoff

Every N04 pass follows one complete loop:

1. Read the real GitHub state.
2. Compare it against this contract and prior N04 requirements.
3. Inventory every incomplete, inconsistent, weak or disconnected area.
4. Fix the area directly in the repository without destructive rollback.
5. Strengthen the area with the most appropriate existing architecture/tooling.
6. Add tests or deterministic validation where possible.
7. Update documentation and the workstream ledger.
8. Inspect the resulting repository state again.
9. Record what remains, if anything, and the exact next action.
10. Only then hand the nucleus to the next workstream.

Operational E2E tests may remain pending until the six nuclei are running together; that is a validation boundary, not permission to stop structural engineering.

## 9. Definition of done for N04

N04 is structurally closed only when all applicable repository-level items are true: capability registry is complete; execution chain is connected; worker pool/orchestration/priority/cache/resilience are implemented; K6 logical IN/OUT topology is represented; cooperative hybrid delegation is present; N01 registration is configured; CI workflow is configured for push, pull request and manual dispatch; typecheck, contract tests and build pass in CI; README, MESH_STATUS and ARCHITECTURE describe the real state; and any unavailable external/provider/E2E condition is explicitly marked pending rather than falsely claimed complete.

## 10. Handoff record

Current nucleus: **N04**

Current branch: `upgrade/n04-hybrid-cooperative-v10`

Latest known commit before this contract update: `706b51447ac13ec12de024118e72bca6641c074b`

Next receiving fronts should read this contract first, then inspect the live repository state and continue from the remaining ledger rather than restarting the audit.
