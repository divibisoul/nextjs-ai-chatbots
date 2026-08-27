# N04 Architecture — Super GPU

## Runtime flow

Mesh request → Nucleus04Processor → priority scheduler → capability handler → worker/orchestrator/cache → response.

## Parallelism

`N04WorkerPool` bounds concurrent worker threads using Node's `availableParallelism()`. Document, artifact and tool workloads are isolated into separate worker entrypoints. `parallel.map` and `batch.process` fan out independent tasks and aggregate results.

Workers are intended for CPU-heavy JavaScript work; network/database I/O should remain in the application runtime rather than being moved to workers.

## Scheduling

Mesh requests identified with `metadata.source === N01` receive priority over internal work. The queue is stable within each priority class.

## Cache

`N04TtlCache` defaults to 300000 ms and can be configured with `N04_CACHE_TTL_MS`. Cache keys include capability and serialized input.

## Mesh

The existing hybrid Mesh transport is preserved. N04's topology declares five logical IN channels and five OUT peers: N01, N02, N03, N05 and N06. Discovery advertises the complete N04 capability set.

## Honest boundary

A handler being registered means the runtime path exists. It does not claim that an external provider, peer nucleus or production endpoint is reachable. Those require operational validation when the nuclei are running together.
