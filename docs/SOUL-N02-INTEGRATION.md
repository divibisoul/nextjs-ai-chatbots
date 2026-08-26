# Soul ↔ Nucleus 02

Nucleus 02 is the reusable conversational/tooling capability provider. The Soul does not expose it as a standalone chatbot. The Soul Chat Pilot routes ordinary conversation to the nucleus and routes explicit capabilities to the same provider.

## Capabilities

- `document.create`
- `document.update`
- `document.suggestions`
- `environment.weather`

## Mesh model

```text
Soul / AI Pilot
      |
      v
Nucleus 02 Capability Router
      |
      +--> document.create
      +--> document.update
      +--> document.suggestions
      +--> environment.weather
      |
      v
existing Nucleus 02 implementations
```

The existing tools remain owned by Nucleus 02. Other nuclei consume the capabilities through the Soul Mesh instead of copying their implementations.

## Chat role

The chat surface is a pilot/interface, not the identity of the Soul. It supplies conversation, context, tool selection and streaming while the global Soul router determines which nucleus owns an executable capability.

## Cross-nucleus expansion

Capabilities are marked inbound/outbound for later transport integration. This registration does not claim that a live cross-repository transport is already connected; transport, authentication/authorization, correlation IDs, ACKs and health checks must be verified before an E2E route is considered active.
