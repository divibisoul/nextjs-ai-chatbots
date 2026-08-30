# SOUL Failure-Antibody Protocol

## Purpose

This artifact makes the cumulative engineering directive executable as a repository-level rule for the N04 front and visible to every future parallel engineering front that reads the repository.

## Source of truth

GitHub is authoritative. Conversation history is context, not proof. Before each mutation, inspect the current repository state and preserve compatible work already present from other simultaneous fronts.

## Mandatory response to findings

Every actionable finding becomes an engineering action. Never stop at a diagnosis.

```text
DETECT
  ↓
DIAGNOSE
  ↓
RESEARCH VIABLE ALTERNATIVES
  ↓
CORRECT
  ↓
COMPLETE
  ↓
CONNECT
  ↓
OPTIMIZE
  ↓
VALIDATE
  ↓
DOCUMENT
  ↓
RE-AUDIT
```

## Findings covered

- missing
- incomplete
- fragile
- disconnected
- duplicated
- mocked
- declared but unimplemented
- implemented but unregistered
- implemented but unexposed
- implemented but unused
- inconsistent
- obsolete
- under-observed
- under-tested
- under-integrated

## Non-negotiable behavior

1. Do not merely report an actionable defect.
2. Locate the existing implementation before creating a replacement.
3. Prefer adapters and composition over duplication.
4. Preserve working behavior and interfaces unless a change is required for correctness or security.
5. Research alternatives when the first technical approach fails.
6. Do not mask failures to obtain a green CI result.
7. Do not claim runtime or CI success without evidence.
8. Re-audit after each mutation.
9. Leave a durable handoff for the other simultaneous fronts.

## Six-front coordination

The six SOUL nuclei may be developed in six parallel conversations. Each front must treat repository state as shared memory and must not assume another front did nothing merely because its work is absent from the current conversation.

Handoff minimum:

- WHAT_CHANGED
- WHAT_WAS_FOUND
- WHAT_REMAINS
- WHAT_NEXT_AGENT_SHOULD_DO
- commit
- branch
- affected nucleus/connection
- affected agents/capabilities/tools
- dependencies
- validation state
- commissioning state

## Fusion rule

Nucleus work and pair work can proceed simultaneously when compatible. Pair and higher-order fusion means composition of real agents, tools, capabilities, context and execution resources. Emergent capabilities must be technically justified, specified, implemented and validated; numerical multiplication is a discovery heuristic, not a reason to invent artificial features.

## Closure rule

A component is not considered complete because a file exists or documentation says it is complete. Structural closure requires the relevant implementation, registration, routing, interoperability, resilience, observability, validation and handoff evidence. Live commissioning may remain pending when the external runtime is unavailable, but structural work continues.
