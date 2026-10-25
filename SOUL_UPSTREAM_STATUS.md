# N04 — Public upstream integration status
**Snapshot:** 2026-10-25 · **Inspected N04 main:** `34bf30c707d7e384fe4bfd4efc60533cadb0a007`  
**Audit branch:** `audit/ai-nucleus-status-2026-10-25`

## Source pinned

| Public source | Pinned SHA | Function | State |
|---|---|---|---|
| [Browser Use](https://github.com/browser-use/browser-use) | `302d8fcb245a7a63fb7531a4734c9ce3c7792779` | Browser automation behind N04's tool/security boundary | Adapter, runner and tests exist; live provider call is not verified |

N04’s primary AI/provider/tool/document runtime remains authoritative. Browser Use must be exposed as a typed tool/capability, not as another SOUL ingress.

## Catalog mismatch and audit correction

- Current main `integrations/capability-boundary.json` had `upstream_capability_sources: []`, despite `.gitmodules` pinning Browser Use and the source having `lib/soul-core/BrowserUseAdapter.ts`, `scripts/browser_use_runner.py`, and `lib/soul-core/BrowserUseAdapter.test.ts`.
- On this isolated audit branch, the boundary was updated additively to `upstream_capability_sources: ["browser-use"]` in commit `db80711df855b3876d6f421ce008aa37200da817`. **N04 main is unchanged; no PR has been opened.**
- Adapter source labels runtime `DEGRADED` until enabled and source/policy/provider conditions are satisfied. The runner restricts provider choices and browser domains, but the actual request result must be tested, not assumed.

## Required hardening and evidence

1. Verify Python import resolves to the pinned Browser Use source or a reproducible dependency with known matching version; no silent import from an unrelated user/global site-packages.
2. Enforce explicit domain allowlists for any real browsing capability, bounded steps/time, session isolation and sanitized result evidence.
3. Run a deterministic contract test with the runner blocked when disabled and a separate online smoke test only when provider credentials and the browser runtime are explicitly configured.
4. Verify a real tool result through N04 handler → N07 Mesh → N04 response with owner, status and correlation preserved. A browser description/probe is not execution evidence.

**Gate:** `ADAPTER_BOUND / RUNTIME_UNVERIFIED`; the catalog correction waits for exact-head tests before promotion.
