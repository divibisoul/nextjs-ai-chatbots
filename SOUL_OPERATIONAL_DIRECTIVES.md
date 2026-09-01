# SOUL — Operational Directives (Cumulative Master Layer)

This document is additive to all previous SOUL directives. It is the shared architectural memory for the six engineering fronts and must never be interpreted as cancellation of earlier requirements.

## 1. Execution rule

PRESERVE → AUDIT → CORRECT → COMPLETE → CONNECT → CROSS → FUSE → OPTIMIZE → VALIDATE → DOCUMENT → ADVANCE.

A discovered failure is an action item, not a stopping condition. Do not merely report a missing, broken or disconnected area when repository-level correction is safely possible. Inspect existing implementations, adapt them, register them, expose them, test them and update the shared state.

Never claim a change worked until the GitHub state and the resulting CI/test evidence confirm it. If a proposed fix fails, diagnose the new evidence and continue with an alternative. Never mask errors or manufacture green status.

## 2. Source of truth and six-front coordination

GitHub is the source of truth. Six simultaneous engineering fronts may modify different nuclei or adjacent architectural layers. Before writing, inspect the current branch/default-branch state, recent relevant commits, existing documentation and current implementation. Do not overwrite work merely because another conversation did not mention it.

Every front records WHAT_CHANGED, WHAT_WAS_FOUND, WHAT_REMAINS and WHAT_NEXT_AGENT_SHOULD_DO, including nucleus, connection, commit, dependencies and real blockers.

## 3. Six independent IAs

N01–N06 are independent AI nuclei. Each nucleus is simultaneously treated as:

- an AI runtime;
- an agent host;
- a capability provider;
- a tool provider;
- a specialized processor;
- a service provider for peers;
- a service consumer of peers;
- a component of the distributed SOUL architecture.

Each nucleus must expose, directly or through canonical adapters, Identity, Agents, Capabilities, Tools, Context, Memory, Execution, Input, Output, Discovery, Delegation, Response and Observability.

## 4. Canonical Soul Mesh

Soul Mesh is the semantic interoperability layer. Do not create a competing API architecture. Strengthen the existing Mesh with adapters, gateways and transport resolution where needed.

The canonical flow is:

DISCOVERY → CAPABILITY DISCOVERY → TASK ROUTING → DELEGATION → EXECUTION → RESPONSE → CORRELATION → COMPOSITION.

Transport is selected beneath the message contract and may use IN_PROCESS, WEBVIEW_BRIDGE, LOOPBACK_HTTP, HTTP, REALTIME or event/PubSub mechanisms where justified by the existing runtime.

## 5. Five bidirectional peer links

Each nucleus must be structurally prepared for five bidirectional peer relationships. Every link must support, where applicable, request/response, delegation, discovery, capability invocation, correlationId, authentication, timeout, retry, tracing, rate limiting and fallback.

Structural completeness is distinct from live external validation: use STRUCTURALLY_VALIDATED — INTEGRATED_TEST_PENDING when the whole distributed environment is not simultaneously available.

## 6. Synergy analysis

For every relevant pair, analyze:

agents × agents;
tools × tools;
capabilities × capabilities;
context × context;
execution × execution;
AI × AI.

Ask what the combination can do that neither side can do alone. Do not invent functions simply to increase counts. A derived capability requires a technical basis, contract, inputs, outputs, participating nuclei/agents/tools, dependencies, execution mode, traceability and tests.

## 7. Fusion levels

First-level pair analysis: N01×N02, N03×N04, N05×N06.

Second-level fusion: (N01×N02)×(N03×N04), (N03×N04)×(N05×N06), plus justified cross-combinations.

Final fusion: N01×N02×N03×N04×N05×N06, producing cooperative capabilities, federated agents, distributed execution, validation and recovery.

## 8. Super GPU / SOUL SUPERCOMPUTE

Super GPU is distributed parallel computation, not a physical GPU. The target architecture is:

TASK → DECOMPOSITION → SCHEDULER → CAPABILITY ROUTER → PARALLEL EXECUTION → RESULT AGGREGATION → VALIDATION → FINAL RESULT.

Use inter-nucleus and intra-nucleus parallelism. N04 remains a major execution engine with workers, queues, prioritization, caching, batching, workflows and observability, but Super GPU is the collective N01–N06 system rather than an N04-only feature.

## 9. Dynamic composition and federation

Capabilities may be composed dynamically when compatible. Temporary federated agent teams may assign Planner, Researcher, Analyzer, Executor, Validator and Synthesizer roles to the most suitable nuclei.

When a nucleus reaches a limitation, execute:

detect limitation → discover capability → select peer → delegate → receive result → continue.

Do not return NOT_IMPLEMENTED before checking the Mesh for an authoritative peer or fallback.

## 10. Auto-routing

Routing should consider capability fit, specialization, current load, latency, availability, priority, computational cost, dependencies and reliability. Parallel branches should be executed concurrently when there is no dependency between them, followed by aggregation and validation.

## 11. Cache, resilience and observability

Safe cache keys should include capability, payload/context identity, model, tool, version and source nucleus. Peer paths should use bounded timeout, retry/backoff, circuit breaking, correlation, tracing, validation, size/rate controls, authentication and worker recovery where relevant.

The system should answer: who is available, who can perform a capability, who is busy, which route was selected, which agents/tools participated, elapsed time, failure location and fallback path.

## 12. CI and time boundaries

CI is evidence, not a blocker. Every workflow must have bounded execution time appropriate to its scope. When CI fails, inspect the actual failing step/log, correct it, rerun and iterate. Warnings must be distinguished from errors. A task is not closed while the relevant validation is red unless a genuine environment blocker is explicitly documented.

Use execution time and progress evidence to avoid indefinite loops or premature delivery. Delivery should happen after verification, not merely after code writing.

## 13. Shared synergy matrix

Maintain a repository-level architecture matrix containing:

Nucleus A | Nucleus B | Agents | Capabilities | Tools | Synergy | Emergent Function | Implementation | Status

This matrix is architectural memory for the six fronts and must be updated as discoveries and implementations accumulate.

## 14. Closure states

DECLARED → REGISTERED → EXECUTABLE → INTEGRATED → VERIFIED → EXTERNALLY_VALIDATED.

A nucleus is CLOSED only when its structure, failures, capabilities, agents, tools, Mesh, inputs, outputs, delegation, discovery, security, resilience, CI, documentation, synergy map and peer interfaces satisfy the agreed criteria.

A pair is CLOSED only when both nuclei are robust and their A↔B agents, tools, capabilities, discovery, delegation, composition and justified parallel execution paths are implemented and validated.

## 15. N07 rule

N07 is intentionally deferred until N01–N06 interfaces, inputs and outputs have been mapped. When opened, N07 must receive the complete communication topology and then participate in the planned N01+N06 fusion, including tool and capability fusion, without deleting working functionality.
