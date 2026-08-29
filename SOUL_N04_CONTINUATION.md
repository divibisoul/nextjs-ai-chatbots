# N04 continuation

The repository is the source of truth. Every future operation must first inspect the current branch/commit and accumulated directives, then mutate the repository only where a concrete divergence is found. No conversational declaration substitutes for a GitHub change.

Current invariant: capability registration is introspectable through `registeredCapabilities()` and `missingCapabilities()`, enabling automated detection of incomplete registration without deleting existing runtime behavior.
