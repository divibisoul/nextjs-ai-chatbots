# N04 → N07 Neural Federation

N04 exposes shared neural workloads through `lib/soul-neural/N07NeuralBridge.ts`. The bridge uses Soul Mesh contract `1.1.0`, HMAC-SHA256, correlation, nonce, timeout and finite-value validation.

N04 remains the execution/processor owner for its local workloads; N07 provides the shared neural execution fabric used across nuclei.
