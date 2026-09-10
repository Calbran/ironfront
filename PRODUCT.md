# Ironfront

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated through the accepted recommendation: TypeScript, React, Vite, PixiJS, Node.js/Fastify. PostgreSQL is the intended hosted database. The first local proof uses Node's SQLite driver because Docker/PostgreSQL are unavailable on the development machine; this is an implementation concession, not a new product requirement.

## Users
Friends and strangers playing a shared browser campaign around work, sleep, and ordinary life.

## Product Purpose
A lightweight asynchronous conquest game lasting approximately one month. Log in, understand how the front changed, issue a few plans, develop a nation, and leave.

## Operating Context
The authoritative server continues while browsers are closed. Initial hosting is the user's home PC with Tailscale. Short sessions should be useful. Frequent checking must not become mandatory.

## Capabilities and Constraints
Procedurally generated continent with regions; map scales with players. Victory is land owned, not key-zone scoring. Simple buildings, infantry, artillery, land vehicles, and aircraft. Persistent standing orders. Multiple selectable factions with approachable differences. Exact timings, balance, land-area versus region-count scoring, and early-victory rules remain provisional.

## Brand Commitments
Cold War military silhouettes, Victorian identity, and steampunk engineering. Simple unit representations. Ironfront is the name selected by the owner on September 9, 2026. Faction names are provisional. User chose direct code implementation for this proof.

## Evidence on Hand
Design discussion from September 9, 2026. Crownfall's documentation organization is the structural reference, not its game mechanics or code. No approved concept artwork exists.

## Product Principles
- Land conquest is the primary goal.
- Plans outlast the player's session.
- Return summaries explain consequences.
- A few readable choices outweigh intricate management.
- Keep accepted direction, proposed tuning, and implemented behavior separate.

## Countries and visible warfare — accepted direction, 2026-09-09

The continent should read as countries containing territories and cities. Territories can have several cities according to their size, with one territorial capital. Warfare should be visible through small moving squad dots/icons, firing effects, and readable active engagements, presenting an aerial view while battles unfold over the asynchronous campaign pace. See decision 008 for the distinction between accepted creative direction, proposed control rules, and current implementation.
