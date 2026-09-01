# SOUL Cross-Nucleus Matrix — Live Architectural Memory

This file is shared memory for the six simultaneous engineering fronts. It records observed repository state and concrete synergy work. A commit or declaration is never treated as proof of runtime completion without validation evidence.

## Current nuclei

| Nucleus | Repository | Known role | Structural peer count | First fusion |
|---|---|---|---:|---|
| N01 | `divibisoul/aeternum-core-29` | cognitive/core coordination | 5 | N01×N02 |
| N02 | `divibisoul/Eternium-` | reasoning/specialized cognition | 5 | N01×N02 |
| N03 | `divibisoul/nexus-aeternum-fusion` | audio/speech transformation | 5 | N03×N04 |
| N04 | `divibisoul/nextjs-ai-chatbots` | execution/orchestration/parallel runtime | 5 | N03×N04 |
| N05 | `divibisoul/nextjs-ai-chatbot` | inference/conversation/application capabilities | 5 | N05×N06 |
| N06 | `divibisoul/nextjs-ai-chatbot-2000` | cognitive/tool/application support runtime | 5 | N05×N06 |

## Required peer topology

Every nucleus is structurally prepared for five bidirectional links. N07 is intentionally excluded from closure until the N01–N06 input/output topology is complete; N07 will then absorb the full communication surface and participate in N01+N06 fusion.

## Synergy discovery matrix

| A | B | Agents | Capabilities | Tools | Execution synergy | Emergent-function candidate | Status |
|---|---|---|---|---|---|---|---|
| N01 | N02 | core planner ↔ reasoning agents | cognition ↔ reasoning | shared context/tool surfaces | parallel analysis + synthesis | coordinated-cognitive-analysis | DISCOVER/IMPLEMENT on pair fronts |
| N03 | N04 | speech/audio agents ↔ execution agents | media ↔ task execution | audio + document/artifact/tool surfaces | media preprocessing in parallel with task preparation | multimodal-execution | DISCOVER |
| N05 | N06 | inference agents ↔ cognitive/support agents | inference/conversation ↔ support/tool/artifact/context | AI, documents, artifacts, tools | routed inference + delegated support | federated-intelligent-execution | ACTIVE |
| N02 | N03 | reasoning ↔ speech agents | semantic reasoning ↔ audio/speech | speech/tool composition | staged reasoning → speech | reasoning-to-voice pipeline | FUTURE CROSS-PAIR |
| N04 | N05 | executor ↔ inference | execution ↔ inference | runtime tools + AI pilot | planner/inference + parallel execution | adaptive-agent-workflow | FUTURE CROSS-PAIR |
| N05 | N06 | inference/conversation ↔ cognitive support | AI pilot + conversation + support.* | tool execution + documents + artifacts | bounded routing + fallback | federated-intelligent-execution | STRUCTURAL |

## Proven implementation discoveries

### N05/N06

- N06 peer topology explicitly includes N01, N02, N03, N04, N05 and N07 in its canonical peer bridge.
- N06 transport now preserves caller-supplied correlationId/traceId through the actual HTTP message path.
- N06 bounded inference scheduling no longer depends on an undeclared Piscina package; the scheduler provides deterministic in-process bounded parallelism while retaining a future adapter point for worker pools.
- N05 ownership policy now recognizes N07 as a valid consumer for inference, conversation, document, audio, speech, cognitive, tool and support families where appropriate.

## Super GPU target

`TASK → DECOMPOSITION → SCHEDULER → CAPABILITY ROUTER → PARALLEL EXECUTION → RESULT AGGREGATION → VALIDATION → FINAL RESULT`

Parallelism must be both inter-nucleus and intra-nucleus. N04 is a major executor, not the sole compute location. The final architecture is collective.

## Evidence policy

`DECLARED → REGISTERED → EXECUTABLE → INTEGRATED → VERIFIED → EXTERNALLY_VALIDATED`.

Use `STRUCTURALLY_VALIDATED — INTEGRATED_TEST_PENDING` when a live peer environment is unavailable. Never promote a state merely because documentation or a commit message says it is complete.

## Six-front handoff contract

Every active front must record:

- WHAT_CHANGED
- WHAT_WAS_FOUND
- WHAT_REMAINS
- WHAT_NEXT_AGENT_SHOULD_DO
- commit SHA
- validation result
- real blocker, if any

## Next architectural gate

1. Clear N05 and N06 CI/typecheck failures.
2. Verify all five bidirectional peer surfaces for N01–N06.
3. Complete pair-level synergy implementation for N01×N02, N03×N04 and N05×N06.
4. Build the cross-pair routing/composition layer.
5. Only then open N07 for final topology ingestion and N01+N06+N07 fusion.
