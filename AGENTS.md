# Working on Ironfront

Read README.md, PROJECT_STATE.md, and docs/README.md first. Read the relevant design/system document before changing mechanics.

## Authority

User decisions outrank proposals. Every design record distinguishes accepted direction, provisional tuning, and shipped behavior. Land owned is the default victory measure. Do not introduce weighted key-zone scoring. Keep management light and asynchronous. Crownfall is a documentation-structure reference, not a source of gameplay requirements.

## Implementation

TypeScript throughout. Pure simulation and generation in packages/game-core; trusted commands, scheduling, and persistence in apps/api; presentation in apps/web. Clients never resolve combat or mutate campaign authority. Keep state transitions atomic. Do not expose session keys in logs or public state.

Run npm run typecheck, npm test, and npm run build for gameplay/server changes. Test invariants and restart behavior, not mirrored implementation. Verify changed interfaces in a browser. Keep PROJECT_STATE.md current and append CHANGELOG.md/session notes after meaningful work. Record new durable choices in docs/05-decisions. Never present provisional balance as validated.
