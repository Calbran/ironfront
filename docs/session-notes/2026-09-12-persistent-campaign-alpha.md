# Persistent campaign alpha — 2026-09-12

## Delivered

The main entry now opens the actual shared country/tactical Three.js scene in a versioned persistent campaign. It contains one detailed city, ten additional places, connected roads/bridges, farmland and woodland over a 6,000 × 3,600 model-unit region. Six Meridian groups and eight Crown groups represent 64 individual units. The API owns continuous combat, saves, background advancement, visibility, territory occupation and supply-funded physical sandbags. Browser and test pages share the same unit presentation, effects, audio and country combat owner. The country test retains its own scenario controls; production has no encounter-launch action or deadline.

Existing SQLite worlds, tokens and test saves were preserved. New alpha worlds and generated geography use separate tables. Previous abstract campaign saves remain accessible through the archived entry. Nothing was committed or pushed during this pass.

## Validation

- Typecheck passed. Production build passed; the existing large-chunk warning remains.
- Full suite: **349/349 tests passed**, approximately 241 seconds. New regressions cover generated geometry, continuous combat beyond 600 seconds, bounded saved backlog, occupation/supply invariance across polling and serialization, enemy/event privacy and anonymous hearing, physical sandbags/tank crushing, atomic SQLite rollback/reopen, enemy-order rejection and server progression with no polling.
- Production browser smoke: real right-click movement changed authoritative positions; the build UI placed sandbags and charged supplies; reload preserved the same structure and running campaign; hidden enemies stayed absent; an 800-pixel viewport had no horizontal document overflow. No browser errors.
- Shared consumer browser checks: the country slice deployed and ran its original encounter; the full-city diorama loaded. No browser errors. Shared city/country presentation and combat regression tests passed.
- Local performance sample after warm-up: 120 authoritative ticks covering 30 simulated seconds, median **17.87 ms**, p95 **26.56 ms**, maximum **37.38 ms**. A four-second close-city Chrome frame sample had median **6.1 ms**, p95 **6.2 ms**. This is one small campaign on the local desktop, not sustained multiplayer load or a validated 1k/2k unit ceiling.
- Before caching, the first combat update spent about two seconds regenerating woodland samples. Immutable landscape samples and base sight are now reused; the forest index is warmed during setup, and dynamic sandbags no longer rebuild woodland geometry.

Reproduce the main browser check after building with `node --import tsx scripts/campaign-alpha-browser.mjs`. It runs on port 3193 with an in-memory database and writes screenshots/results under `.impeccable/review/campaign-alpha`. Optional `CHROMIUM_PATH` selects the browser. Sound events use the established shared pipeline; this pass did not independently judge perceived audio quality by listening.

## Next work, in order

1. Add reserve/reinforcement production and server-owned squad recruitment, with dynamic roster growth through the same presentation contract. The current alpha starts with a fixed roster and has no replacement pool.
2. Connect multiplayer seats, explicit faction ownership and authorized subscriptions to this continuous world. Do not revive detached battles or treat the archived multiplayer proof as integrated.
3. Extend the provisional territorial supplies into the intended supply/economy rules. Integrate wire, trenches, warehouses and operational artillery through shared authoritative construction contracts.
4. Add a strategic opponent director and longer playtest sessions. Existing autonomy handles nearby combat/support, not a full campaign plan.
5. Benchmark multiple simultaneous fights/worlds and sustained camera movement before expanding geography or unit counts. Introduce measured spatial scheduling/instancing and restart catch-up improvements while retaining one authority and stable unit identities.

See decision 055 and the campaign-alpha integration inventory for the exact connected/pending boundary. Capture duration, supply rates and starting deployment are provisional.

## Live-server correction after handoff

The user reported Route not found when selecting Establish command at port 5173. The frontend was current, but port 3000 was still a plain node --import tsx API process started before the new routes existed. The isolated browser test passed while the live process remained stale; a health endpoint check did not establish route parity.

Restarted only the identified API process in tsx watch mode from D:\ironfront, using the existing database. The Vite process and all existing saves were preserved. Verified the actual 5173 browser flow: Establish command returned HTTP 200, the campaign canvas and unit controls appeared, and no browser errors occurred. Removed only the disposable verification campaign using its new token hash and creation timestamp.

Development handoffs must verify the changed route through the actual frontend proxy, not just /api/health or an isolated test server. Use the watched API during development so source changes reach the running service.
