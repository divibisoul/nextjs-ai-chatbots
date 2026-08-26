# Soul Nucleus 04 Integration

This marker records the Nucleus 04 integration pass without removing existing functionality.

## Role

Nucleus 04 provides AI orchestration, tool execution, artifact/document capabilities, persistence, and Soul Mesh integration. AI providers remain adapters; the Soul is not coupled to a single provider.

## Integration contract

- Preserve existing AI tools and application behavior.
- Expose capabilities through the Soul Mesh layer.
- Keep provider-specific implementations behind adapters.
- Preserve the existing 5-IN/5-OUT logical peer model.
- Treat this repository as one component of the eventual six-core Android APK/system.

## Audit status

The repository has been explicitly registered for the Nucleus 04 fusion pass. Existing directories and capabilities are preserved; subsequent commits should modify them incrementally with tests.
