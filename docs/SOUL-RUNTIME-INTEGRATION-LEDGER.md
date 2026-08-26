# N02 Runtime Integration Ledger

Canonical endpoint: `/api/soul-mesh`.

The endpoint invokes `handleMeshMessage` with the N02 handler registry. The runtime therefore has an executable mesh entry point. Live E2E connectivity still requires a deployed reachable runtime and a real request/response test.

Capabilities must remain discoverable through the global registry without moving ownership away from N02.
