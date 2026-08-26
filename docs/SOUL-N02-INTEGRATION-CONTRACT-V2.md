# N02 Integration Contract v2

N02 remains the conversation/interaction nucleus. Its existing chat, streaming, persistence and tool capabilities are preserved.

## Canonical identity
N02 peers are N01, N03, N04, N05 and N06. Legacy repository names must not be used as runtime peer identities.

## Five IN / five OUT
N02 has one logical IN and one logical OUT for each of the five peer nuclei. These are logical channels, not assumptions of live connectivity.

## Hybrid transport
Each logical channel is transport-neutral and may use IN_PROCESS, WEBVIEW_BRIDGE, LOOPBACK_HTTP, HTTP or REALTIME depending on deployment. N02 must not hard-code an AI provider as the transport or identity layer.

## Capability ownership
Conversation/interaction capabilities remain owned by N02. Document/tool capabilities owned elsewhere are invoked through the Mesh rather than duplicated or silently swallowed.

## Proof rule
A Mesh response is successful only after a destination capability handler actually executes and returns a correlated result. Presence of an endpoint or registry is not evidence of connectivity.

## Synergy
N02 is the natural interaction gateway for conversational requests and should consume context from N03, invoke tools through N04, use orchestration from N05 and request synthesis/governance from N06, while remaining reachable directly from every peer through its five channels.
