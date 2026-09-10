# Calmer squad motion — 2026-09-09

The owner reported fast, random-looking shuffling. Found periodic offsets in representative soldier positions and a feedback loop between formation attraction and per-frame separation. Removed the offsets, compute separation on deterministic desired slots, then interpolate rendered positions toward those targets. Stable ID ordering avoids reshuffling on reordered snapshots. Slowed center following to a minimum 2.8-second time constant and soldier following to 0.9 seconds.

No tactical speed, weapon range, damage or strategic travel duration changed. Region arrivals retain their explicit relocation behavior. Reduced motion still immediately shows confirmed positions. New tests verify idle stability even with a moving action, forward-only slow movement and snapshot-order invariance; existing tests retain separation, polling continuity and cleanup checks.

Validation: typecheck, complete eight-file test suite and production build pass. Existing build chunk advisory remains. Browser validation uses scripts/tactics-browser.ts with an isolated in-memory campaign.

Desktop 1440px and phone 390px battle checks passed: live engagement, polling, squad telemetry, selection/orders and no page errors or horizontal overflow.
