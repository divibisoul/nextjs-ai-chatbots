# SOUL — Six-Front Coordination Contract

## Purpose

The six nucleus workstreams may advance concurrently. GitHub is the shared coordination bus between independent engineering conversations. A workstream must publish durable state here (or in its repository's equivalent coordination issue/file) instead of assuming another conversation knows its progress.

## Operating model

- N01–N06 remain independent IAs with their own agents/capabilities.
- Soul Mesh remains the runtime interoperability layer; GitHub coordination is the engineering-time control plane, not a replacement runtime API.
- Each workstream may inspect the latest repository state of another nucleus before depending on it.
- A completed task is published with: nucleus, task, status, commit SHA, affected capabilities, dependencies, and next handoff.
- A receiving workstream consumes the handoff and continues its own work without waiting for the originating conversation.
- Never delete another nucleus' work merely to simplify integration. Prefer additive adapters, compatibility layers, migrations, and deprecation.

## Double-connection rule

Work is organized in simultaneous pairs. For every pair, the goal is not merely transport connectivity but capability multiplication:

1. discover each IA's capabilities;
2. identify complementary capabilities;
3. create bidirectional request/response delegation;
4. preserve correlation IDs and provenance;
5. expose the resulting composite capability to the next pair;
6. publish the handoff in GitHub.

The combined result of two connected pairs must be treated as a higher-level integration candidate, not as four unrelated links.

## Handoff schema

```yaml
nucleus: N04
workstream: execution
status: active|blocked|ready|verified
commit: <sha>
capabilities_added: []
capabilities_connected: []
peer_dependencies: []
open_risks: []
next_handoff:
  target: N01-N06
  action: <specific next action>
  required_from_peer: []
``` 

## N4 responsibility

N4 publishes execution/runtime improvements and consumes capability announcements from peers. N4 must not claim real runtime communication is verified merely because the GitHub handoff exists; runtime verification remains a separate state.

## Engineering acceleration

GitHub Actions should be used for deterministic checks, reusable workflows, matrix/parallel jobs, artifacts, and explicit workflow dependencies. This allows the six fronts to validate independently while sharing durable outputs. GitHub documents that independent jobs run in parallel by default and that reusable workflows can be called by multiple jobs; concurrency controls should be used only where serialization is actually required.
