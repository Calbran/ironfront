# Project State

Read after AGENTS.md. Update this as the current save file; historical details belong in CHANGELOG.md and docs/session-notes.

## Current milestone

**Milestone 1: first persistent multiplayer proof implemented, 2026-09-09.** Approved name: Ironfront. Documentation mirrors Crownfall's organization. This is an early rules experiment, not the full MVP or a public launch.

## Latest interface update

**2026-09-09:** Campaign map fills the viewport and opens at continent fit (100%). Mouse-wheel zoom anchors beneath the cursor (35–600%); left/middle/right drag pans at every scale. Fit restores the full continent. Dragging does not issue a selection, and game polling preserves the camera. Nation information, region commands, dispatches, and session details share one closable left panel on desktop and phones.

Verification: typecheck/build and browser create/join/build/order flow pass. scripts/camera-smoke.mjs verifies viewport bounds, initial scale, cursor anchoring, drag-versus-click separation, polling persistence, fit, and left-aligned context/session content.

## Implemented

- React/Vite browser client with PixiJS continent rendering, inspection, zoom/pan, ownership boundaries, army counters, and objective arrows.
- Seeded connected continent with 72–192 territories, named provinces, rivers, decorative islands, forests, plains, highlands, and impassable unowned mountains. Existing saves retain their old geography.
- Campaign creation/joining, three selectable factions, claimable bot seats, private browser session keys.
- Single authoritative Fastify server with transactional SQLite campaign/session storage.
- Three mixed army presets (line/assault/mobile), divided sector defense, Hold/Advance/Redeploy/Reserve/Recover orders, persistent offensive corridors, consolidation, capital-connected depot supply, finite reserves, risk/fallback policies, and legal retreats. Abstract fuel-consuming air support remains.
- Industry/fuel/manpower, four building types, timed construction and automatic recovery.
- Polygon-area victory, provisional majority countdown, 672-hour deadline.
- Automatic clock, accelerated test mode, host advance control, deliberate downtime pause.
- Dispatch feed, mobile land-standings disclosure, accessible region selector.

## Verified

- TypeScript check and production build pass.
- Twenty-one Node tests pass, including two-session authorization, transactional rollback, persistence across reopen, duplicate-tick suppression, restart pause, generator invariants, construction, capture, and victory.
- Three deterministic bot fixtures run up to 672 ticks with finite/nonnegative resources and legal strength ranges. These are correctness fixtures, not a balance study.
- Desktop 1440×1000 and phone 390×844 browser flow: create, join with independent session, construct depot, issue advance; no page errors or horizontal overflow.
- npm install's final audit reports zero known vulnerabilities after upgrading the static-file plugin.
- Initial-proof review returned **ship — early playable proof**. The military-control extension independently returned **ship** after desktop/phone verification; its detector reported advisory design-metadata discrepancies, recorded in the military session note.

- Military browser flow on desktop and phone verifies army switching, sector/policy persistence, Reserve, Redeploy, Advance, and mountain blocking. Army status uses a phone-safe two-column layout. See `scripts/fronts-browser.ts` and the military session note.

## Running

npm run dev for development; npm run build then npm start for local production on 127.0.0.1:3000. Database: data/warfare.sqlite. No Tailscale deployment has been performed. Docker/Compose configuration is supplied but untested because Docker is unavailable here.

## Known limits

SQLite, not PostgreSQL/Drizzle. No recoverable accounts or session expiration/revocation. Three armies with fixed preset compositions, abstract air support, no recruitment/research. Full visibility. Local legal retreats and simplified rotating-priority multi-party combat. Bots do not develop economies. Generated starts have equal region counts but unequal area and unvalidated fairness. Test timings are deliberately much faster than proposed final offensives. Last 250 dispatches only. The primary browser chunk produces Vite's 500kB advisory; full renderer code splitting is deferred.

## Next

1. Play the proof and decide which five-minute decisions are satisfying.
2. Improve order/route previews, retreat behavior, and start fairness from feedback.
3. Playtest frontage, logistics, and unit roles together; add recruitment and a complete return report.
4. Add accounts and ready/start lobbies, then PostgreSQL/Drizzle deployment and recovery tests.
5. Validate accelerated and real-time campaign pacing before introducing diplomacy/research depth.

## Continental terrain update — 2026-09-09

Ironfront is the approved name. New maps use continuous procedural relief and zoom-dependent labels. Mountains block ownership, construction, army movement and supply, and do not count toward victory area. Passable land remains connected. Geography rules and compatibility are recorded in decision 004 and the continental geography contract. Larger-map pacing and start fairness are unvalidated.

Verification for continental terrain: `npm run typecheck`, all 21 simulation/persistence tests, and production build pass. `scripts/geography-smoke.mjs` passed desktop and phone creation, mountain inspection, zoom/detail, fit, and overflow checks with no page errors.

Latest playtest correction: default reduced to 96 territories and eight provinces, zoom-out extends to35%, borders are visible at overview, legacy polygon fills align with original borders, and wheel gestures transform cached geometry instead of rebuilding all detail each frame.

Density/camera verification: 21 tests, typecheck/build, geography96territories/22mountains/8provinces, camera regression, and desktop/phone checks pass. Sustained100-event zoom on192territories at1968×1450 measured median16.7ms/p9517.1ms frame intervals locally. Fresh independent review: ship for density/boundaries/camera; angular rivers remain a visual limitation.
