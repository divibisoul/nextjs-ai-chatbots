# N07 Neural Fabric Handoff

N07 is the canonical orchestration/neural service. N04 retains execution/runtime ownership and consumes neural, prefrontal and distributed-compute capabilities via Soul Mesh.

Contract: `soul-mesh/1`, `1.1.0`; operations `neural.forward@1.0.0`, `neural.learn@1.0.0`.

Preserve correlationId, bounded finite-number payloads, nonce/HMAC, deadlines, transport resolution and explicit errors. Read current N07 `main` before changing the bridge because other fronts are concurrent.

WHAT_CHANGED: N04 bridge is part of the unified N07 Neural Fabric.
WHAT_REMAINS: exact-head CI plus live peer commissioning.
WHAT_NEXT_AGENT_SHOULD_DO: preserve N04 worker/execution ownership and validate neural delegation through N07 rather than copying N07 internals.
