# N04 Soul Mesh Status

## Identity
- Nucleus: N04
- Role: application, conversation, tool, document and artifact execution
- Canonical protocol: `soul-mesh/1`

## Existing implementation retained
- `app/api/soul-mesh/route.ts`: authenticated Mesh request entrypoint.
- `app/api/soul-mesh/handshake/route.ts`: peer handshake.
- `lib/soul-mesh/SoulMeshClient.ts`: outbound request/response transport.
- `lib/soul-mesh/Nucleus04HybridCapabilityBridge.ts`: adapter from existing N04 runtime to Mesh.
- `lib/soul-mesh/SoulMeshAgentRegistry.ts`: local agent dispatch.
- `lib/soul-mesh/SoulMeshCapabilities.ts`: canonical N04 remote capabilities.
- Existing tests and transport registry are preserved.

## Integration correction
- Previous handshake identified the nucleus as `chatbots` and required `target=chatbots`.
- This was incompatible with the canonical N01-N06 protocol and prevented N03 from performing a valid N03 -> N04 handshake.
- Handshake now requires `target=N04`, accepts N01/N02/N03/N05/N06 as peers, and returns N04's actual remotely exposed capabilities and HTTP transport.

## N03 interoperability
N03 can now discover and handshake with N04 using:
- endpoint: `/api/soul-mesh/handshake`
- protocol: `soul-mesh/1`
- source: `N03`
- target: `N04`

After handshake, N03 can use the existing `/api/soul-mesh` POST route with a canonical `SoulMeshMessage` and the configured `SOUL_MESH_TOKEN`.

## Acceptance state
- Existing Mesh infrastructure: PRESENT
- Existing N04 runtime bridge: PRESENT
- Canonical N04 identity: CORRECTED
- N03 handshake compatibility: CORRECTED
- Real N03 -> N04 runtime E2E: PENDING LIVE PEER EXECUTION
- CI/build proof: PENDING

No existing N04 capability or runtime was duplicated or removed.
