# Server squad fire model — September 10, 2026

Implemented in `squadFire.ts` and the campaign tactical resolver. This replaces per-squad enemy sorting and continuous generic damage with spatial queries, retained targets, seeded volleys, weapon-versus-target effectiveness, reload state, and delayed armor/artillery impacts. Damage and suppression are accumulated before casualties are applied.

## Timing and authority

The fixed step is 1/40 campaign hour. At the test pace of one campaign hour per 10 real seconds this is four exchanges per second. Normal campaign pace is intentionally slower: the same simulation step takes 90 real seconds. This preserves campaign-time combat semantics instead of silently speeding up normal battles. Partial steps, RNG, magazine/reload state and queued impacts persist in saves. No viewer or visibility flag changes simulation fidelity. The API scheduler polls at 250 ms, with a per-campaign due-time gate to avoid redundant writes between eligible steps. Normal startup/restart pause behavior remains.

## Damage and geometry

Living strength determines firepower. Sampled hits account for range, moving orders, suppression and exposure. Existing morale, faction, supply, entrenchment and regional defense modifiers remain. Rifles have 0.005 effectiveness against armor; armor and artillery have distinct soft-target and armor profiles. Values are provisional, not balance-validated. Reloads and supplies are abstract; there is no individual ammunition inventory.

Saved `Region.fireObstacles` supplies polygon geometry and exposure: 0 blocks a firing line, 0.5 represents low cover, 1 is open. Saved ridge obstacles block; scrapyard obstacles reduce exposure; water does not stop shots. Buildings must be supplied as physical polygons by their owning map/city generator. The 3D city diorama is a separate preview and is not automatically connected to this campaign geometry or combat state.

Line-of-fire results are cached by exact endpoint positions; obstacle-content changes rebuild the index. Cache entries are bounded. Targets are retained while valid, explicit orders take priority, and alternate visible enemies are considered before out-of-range approach targets. Searches are bounded to local buckets; they do not sort all enemies. Very distant forces still use the existing strategic movement system.

Tank/artillery hits enqueue a short delayed event at the aimed position. On impact, enemies within the radius receive distance-scaled damage with obstruction checks; moving targets can escape. This is not physical projectile simulation. Existing client firing effects remain cosmetic and are not yet synchronized to individual queued shell events. Event impact processing uses the engagement's units; very large single engagements may warrant an additional impact spatial-query optimization.

## Local microbenchmark

`node --import tsx scripts/combat-benchmark.ts` measures sustained targeting, cached visibility, volleys and damage aggregation. Each battle has 13 squads; strength is replenished between exchanges to maintain workload. After 20 warm-up iterations, 100 iterations are sampled. This is not a full server benchmark: movement, queued impacts, persistence, networking and map generation are excluded.

| Battles | Squads | Median step | 95th-percentile step |
| ---: | ---: | ---: | ---: |
| 100 | 1,300 | 2.71 ms | 5.07 ms |
| 500 | 6,500 | 14.35 ms | 19.30 ms |
| 1,000 | 13,000 | 39.90 ms | 47.17 ms |

Measured once on the local Windows development machine. Whole-server capacity and multiplayer balance remain unverified.

Validation: 188 tests passed, including split-update equivalence, persisted reload/RNG, cover, armor, target retention and delayed impacts. Type checking and production build passed (existing bundle-size warning).
