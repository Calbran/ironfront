# Live Three.js campaign integration and soak test

Experimental branch only. Add `?renderer=three` to the regular game URL, or select **Three.js live · experimental** in a campaign. Pixi remains the default and can be selected again. Lobby previews retain Pixi.

## Integration

The existing App owns authentication, polling, command queues and campaign panels. The new map consumes its player-filtered World and dispatches existing selection, local movement and attack callbacks. It never resolves movement, combat or capture. A worker builds static scenery once per campaign; server polls update the live unit layer without resetting the camera or rebuilding terrain. Owner-colored instanced infantry follow interpolated authoritative positions; vehicle forces currently use simple model proxies. Firing traces use server action/target/fire state and a reused vertex buffer. Destroyed or no-longer-visible squads are removed from the overlay on the next snapshot. Squad markers support selection and enemy attack, box selection addresses friendly army groups, and fog uses the server's visible-region list.

This is an initial campaign adapter, not complete Pixi feature parity. Settlement-specific context menus and some visual overlays are not yet ported; keep Pixi for those interactions. The regular Command panel remains available. Model submission is capped at 2,048 infantry per nation and 2,048 vehicle proxies; squad markers remain as a fallback above that visual capacity. No new command or server rule was added.

## Test method

`scripts/live-campaign-soak.ts` runs a real Fastify/SQLite campaign server on isolated port 3191 with an in-memory store and an ephemeral credential, then drives the production browser build. No existing database, session or campaign is used. `SOAK_MINUTES` defaults to 30; use a small value only for integration smoke checks. `CHROMIUM_PATH` can override the local Chrome executable.

The fixture starts four engagements, nine armies and 57 squads, including an unengaged reserve used to test precise movement. The script verifies a mouse-selected squad, a right-click Move request and resulting stored order, movement after an explicit server tactical step, later rendered position updates, right-click Attack, strategy mode, a Pixi/Three round trip and phone viewport overflow. The accelerated tactical step is used only in the initial command check. The soak uses normal wall-clock campaign pace.

During the soak the server advances tactics every second and the existing App polls every three seconds. Camera focus cycles among four battle regions and continent view, with pan, winter and strategy changes. Recurring authenticated Move/Hold requests exercise command persistence. Four-second requestAnimationFrame samples are collected about every twenty seconds. Server tick/store durations and request-handler durations are measured separately from browser frame intervals. The script records progress to `/private/tmp/ironfront-live-soak/progress.json` and writes final results only after completing the run.

## Interpretation limits

A local desktop browser with a phone-size viewport is not real phone validation. Short sampled intervals do not observe every frame of the session. JS heap varies with garbage collection; attached geometry/instance buffer estimates exclude texture bytes, drivers and other browser allocations. GPU process memory and GPU timer queries are not measured. Server timings include an in-memory SQLite store, not production disk/network latency. This 57-squad real campaign complements the separate 8,000-soldier rendering-only stress test; it is not an 8,000-squad server benchmark.

## Recorded local result

The 30-minute run completed in 1,803 seconds with 90 sampled intervals, 30 recurring commands, four active engagements and 57 squads. All interaction checks, renderer round trip and phone overflow check passed; no page errors occurred. Sample p95 frame intervals ranged from 16.8–18.7 ms, with zero sampled frames above 33.4 ms. JS heap ranged from 43.5–66.8 MiB and returned toward its lower range repeatedly. Continent geometry estimates stabilized at 17.16 MiB / 400 geometries / four textures as detail chunks were released. These observations do not constitute a total GPU-memory leak proof.

The isolated server recorded 1,807 ticks: p95 8.51 ms, maximum 44.02 ms. Across 676 requests, handler p95 was 17.52 ms. See [raw run](live-campaign-performance-results.json). This run preceded the preview-only landscape pass and minor live UI fixes (strategy labels, ownership border refresh and Command-panel placement taps); the final build receives a shorter integration smoke afterward.

The final production-build smoke also passed selection, Move/Attack dispatch, authoritative/rendered movement, strategy, renderer round trip and phone width with no page errors. TypeScript and production build passed; Vite retains its large-chunk advisory. The game/server suite passed all 106 tests during integration.
