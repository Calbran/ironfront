# Decision 002: Server-authoritative browser proof

**Status:** engineering choice for the first proof, 2026-09-09.

## Context

The recommended TypeScript web stack fits the game. The owner asked to begin implementation and chose direct code rather than a concept-image round. The development machine has Node 25 but no Docker command.

## Decision

Use React/Vite/PixiJS, Fastify, and a pure TypeScript simulation. Persist with built-in SQLite for the first runnable slice; retain PostgreSQL/Drizzle as the hosted target. A single server process owns time and mutation. Pausing during server downtime is intentional. Polling is sufficient.

## Consequences

The first proof can run without external services. SQLite JSON state is a replaceable repository adapter, not a scalable distributed architecture. There is no claim that PostgreSQL or public-launch authentication has shipped. Tests must exercise independent sessions, unauthorized commands, persistence, and duplicate tick suppression.
