# SOUL — Parallel Pair Orchestration

## Purpose
This document extends the existing Soul AI Mesh architecture with a six-workstream engineering model. It does not replace or remove any existing nucleus implementation.

## Two simultaneous layers

### Engineering-time coordination
GitHub is the shared coordination plane for the six independent workstreams. Durable handoffs must contain:

- nucleus and pair;
- task identifier;
- current state;
- commit SHA / branch;
- capabilities added or changed;
- dependencies consumed;
- files/contracts that peers should reuse;
- risks or incompatibilities;
- next handoff.

### Runtime cooperation
Soul Mesh remains the runtime interoperability/control plane between N01–N06. Runtime messages retain source, target, capability, payload and correlationId, and may negotiate a compatible transport.

## Pair-first execution model

Work proceeds in simultaneous pairs rather than serial nucleus completion. Each pair has a concrete integration objective and a measurable composite capability.

### Wave A
- Pair A: N01 ↔ N02 — reasoning/orchestration foundation.
- Pair B: N03 ↔ N04 — perception/speech + execution/acceleration.
- Pair C: N05 ↔ N06 — application/service intelligence + planning/coordination.

Each pair evolves independently on its own branches and records reusable contracts in its repository. No pair waits for live end-to-end runtime availability to implement contracts, adapters, discovery, delegation, routing, authentication, correlation and recovery.

### Wave B
Cross-pair composition consumes the durable outputs of Wave A:

- (N01+N02) ↔ (N03+N04)
- (N03+N04) ↔ (N05+N06)
- (N05+N06) ↔ (N01+N02)

The objective is capability multiplication: the composite behavior must use capabilities from both sides rather than merely forwarding messages.

### Wave C
The six-node K6 topology is treated as one cooperative system. A nucleus may remain the specialist owner of its local capability while delegating complementary subtasks to discovered peers.

## Pair completion gates

A pair is structurally complete only when both sides provide:

1. identity;
2. discoverable capabilities;
3. inbound Mesh handling;
4. outbound Mesh client;
5. request/response correlation;
6. delegation or support-request path;
7. negotiated transport compatibility;
8. explicit failure handling and retry policy;
9. non-destructive compatibility with previously implemented work;
10. a durable handoff for the next pair.

## Capability multiplication rule

For a pair A+B, define:

`Composite(A,B) = local capabilities(A) + local capabilities(B) + delegated workflows(A↔B) + shared context/correlation + transport resilience`

A connection that only proves transport reachability does not satisfy the pair objective.

## Parallel branch safety

Parallel work must be additive. Never force-reset a branch or replace a peer implementation solely because another workstream evolved a different version. Reconcile differences explicitly and preserve compatible work.

## Scheduling principle

The work queue is dependency-aware:

- independent tasks run concurrently;
- tasks that consume another pair's contract wait only for that specific contract;
- live runtime validation is separated from structural implementation;
- a test environment outage must not block implementable tasks.

GitHub Actions can execute independent jobs concurrently and can use matrix strategies and reusable workflows to fan out repeated validation procedures. Reusable workflows support typed inputs, secrets and outputs; concurrency controls should be used only where shared resources require serialization.

## Handoff packet

Every completed or partially completed task should publish this machine-readable shape in the relevant GitHub coordination issue or repository document:

```yaml
nucleus: N04
pair: N03-N04
stage: implementation
status: ready-for-peer
branch: upgrade/n04-hybrid-cooperative-v10
commit: <sha>
capabilities_changed:
  - mesh-communication
  - tool-execution
dependencies:
  - N03: Soul Mesh protocol >= 1.1
peer_contracts:
  - inbound: /mesh/in/N04
  - outbound: N04 -> N03
risks:
  - live E2E requires both runtimes
next_handoff:
  owner: N03
  task: consume N04 capability descriptor and negotiate transport
```

## Definition of done

A nucleus is not declared structurally complete because one CI run passed. It is complete when its implementation, integration contracts, peer handoffs and documentation are internally consistent. Operational status is tracked separately and requires live runtime validation when the environment permits.

## N04 role

N04 remains the execution/acceleration specialist and Super GPU node. It must both offer its execution capabilities to peers and consume peer capabilities to enrich its own workflows. The N04 gateway therefore remains the canonical boundary: Mesh message → validation → processor → local or delegated capability → correlated result.
