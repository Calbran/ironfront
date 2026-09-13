# Tech Stack and Architecture

## Target and first slice

React/TypeScript/Vite for controls; Three.js for the campaign, country and tactical world; d3-delaunay for region geometry; Node.js/Fastify for trusted HTTP commands; a pure TypeScript rules module. PixiJS is retained only by the archived `/legacy.html` renderer. PostgreSQL with Drizzle remains the intended hosted database. The executable first proof uses built-in SQLite with a synchronous single-process transactional store. Docker is not installed in the development environment; the proof must be runnable without it.

## Repository

- apps/web: browser client and map renderer.
- apps/api: HTTP boundary, bearer sessions, clock, SQLite persistence.
- packages/game-core: typed state, seeded generation, commands, simulation.
- tests: rules, API authorization, persistence, and scheduling checks.

## Authority and persistence

Server validates every command. State is stored as one versioned JSON document per campaign in SQLite; sessions are separate. Mutations execute synchronously inside a transaction. Each tick checks its persisted due time, advances one hour, saves the complete resulting state, and schedules the next due time. One process owns SQLite. No Redis or distributed worker is needed for this slice.

On startup unfinished campaigns schedule their next tick from startup time: downtime pauses campaign time. This intentionally does not replay a long home-PC outage. Online browser absence never pauses the clock. Test pace is 10 seconds/hour; normal pace is 3,600 seconds/hour. Test hosts can manually advance an hour.

## Networking

REST commands plus polling. Same-origin production static files and API. Development Vite proxies /api to Fastify. Session tokens are cryptographically random bearer capabilities stored in the browser; only their hashes are persisted. Invite codes permit claiming open seats; they do not authorize existing nations. The proof has no password/account recovery flow. Game map and army information are public to campaign participants, as there is no fog yet.

## Migration path

Replace the store with PostgreSQL/Drizzle migrations and per-campaign row locking before operating multiple application processes. Keep simulation and command contracts. Add real accounts, expiration/revocation, membership management, command idempotency keys, observability, backups, and matchmaking before public launch. This migration is planned, not shipped.
