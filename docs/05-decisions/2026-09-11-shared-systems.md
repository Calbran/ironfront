# Shared systems and preview parity

Accepted 2026-09-11 following repeated divergence between city battle and country slice unit presentation.

Reusable behavior has one implementation owner. Scenes and previews adapt state into its contract; they do not copy behavior. A feature is complete only when required consumers use it and affected-consumer checks pass. Exceptions must be named and tracked as gaps.

The [shared-system standards](../03-technical/shared-system-standards.md) contain the ownership map, contracts, consumer inventory and required workflow. AGENTS.md makes that workflow mandatory. Shared tactical presentation is the first enforced migration; this decision does not claim full campaign mechanics parity.
