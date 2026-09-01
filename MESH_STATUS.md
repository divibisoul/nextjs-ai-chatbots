# N04 Soul Mesh Status

## Identity
- Nucleus: N04
- Role: application, conversation, tool, document and artifact execution
- Canonical protocol: `soul-mesh/1`
- Contract: `1.1.0`

## Existing implementation retained
- `app/api/soul-mesh/route.ts`: authenticated Mesh request entrypoint.
- `app/api/soul-mesh/handshake/route.ts`: peer handshake.
- `lib/soul-mesh/SoulMeshClient.ts`: outbound request/response transport.
- `lib/soul-mesh/Nucleus04HybridCapabilityBridge.ts`: adapter from existing N04 runtime to Mesh.
- `lib/soul-mesh/SoulMeshAgentRegistry.ts`: local agent dispatch.
- `lib/soul-mesh/SoulMeshCapabilities.ts`: canonical N04 remote capabilities.

## Integration state
- N04 canonical identity: `N04`.
- Handshake now accepts N01, N02, N03, N05, N06 and N07.
- When a caller supplies `contractVersion`, N04 rejects versions other than its current `1.1.0` contract rather than silently adapting.
- N04 remote capabilities are derived from the capability registry; non-remote capabilities are not advertised as remote executors.

## Acceptance state
- Mesh infrastructure: PRESENT
- N04 runtime bridge: PRESENT
- Canonical identity: VERIFIED IN SOURCE
- N07 handshake boundary: PREPARED
- Real N03 -> N04 E2E: PENDING LIVE PEER EXECUTION
- Real N07 -> N04 E2E: PENDING FINAL N07 FUSION
- CI/build proof: DEPENDENT ON REPOSITORY ACTION RUNS

## Runtime truth

Source-level support is not treated as proof of live integration. A capability becomes operationally accepted only after the real peer is reachable and an end-to-end request/response with preserved correlation succeeds.
