# Working on Ironfront

Read README.md, PROJECT_STATE.md, and docs/README.md first. Read the relevant design/system document before changing mechanics.

## Authority

User decisions outrank proposals. Every design record distinguishes accepted direction, provisional tuning, and shipped behavior. Land owned is the default victory measure. Do not introduce weighted key-zone scoring. Keep management light and asynchronous. Crownfall is a documentation-structure reference, not a source of gameplay requirements.

## Implementation

TypeScript throughout. Pure simulation and generation in packages/game-core; trusted commands, scheduling, and persistence in apps/api; presentation in apps/web. Clients never resolve combat or mutate campaign authority. Keep state transitions atomic. Do not expose session keys in logs or public state.

Three.js is the production renderer for the campaign, country and tactical game. The campaign is one continuous, persistent battlefield: combat happens in place on the campaign map, never through a launch-battle flow, separate encounter page or detached result handoff. Put all new gameplay presentation and interaction work on the Three.js path. Pixi is archived at `/legacy.html` for historical comparison and saved-data recovery only; do not add features, parity work or new dependencies to it. `/country-slice.html` is an isolated test harness whose systems must be integrated into the campaign rather than linked as a game mode. A change is not integrated until it works through the production Three.js campaign entry at `/` and every applicable shared tactical consumer.

Run npm run typecheck, npm test, and npm run build for gameplay/server changes. Test invariants and restart behavior, not mirrored implementation. Verify changed interfaces in a browser. Keep PROJECT_STATE.md current and append CHANGELOG.md/session notes after meaningful work. Record new durable choices in docs/05-decisions. Never present provisional balance as validated.

## Shared-system changes

Read [shared-system standards](docs/03-technical/shared-system-standards.md) before changing reusable gameplay, presentation, generation or UI. Identify the implementation owner and all consumers; change the owner and adapters together. Previews and tests must reuse shared systems, not copy them. Completion requires affected-consumer checks, an updated ownership/inventory entry for new consumers, and an explicit report of any parity gaps. Never claim a system is standardized merely because models or constants are shared.
