# Starting-zone fallback and multi-seed audit

Implemented bounded deterministic repair in the isolated pacing study. Filter original candidates for sampled 60-unit base footprint legality and existing-settlement clearance. Players with no passing choice try up to twenty nearby non-mountain, unreserved regions, with up to five local samples and 1,800 world-unit separation from other candidate bases. Recompute placement and accept a relocation only when it gives the player a passing choice without eliminating another player's viability. Publish only passing candidates. Failure is explicit, not a guarantee that every seed can be solved. Base footprint and separation remain provisional.

## Observed results

All times are movement-only hours at the existing preview-only 6× multiplier. Ranges cover all published candidate sites, not just each zone center.

| Seed | Candidates by player | Fuel hours | Industry hours | Nearest added city hours | Candidates sharing resource exit region |
|---|---|---|---|---|---|
| Meridian | 2 / 5 / 4 / 1 | 2.53–3.56 | 2.28–3.03 | 5.00–12.59 | 2 |
| Boreal | 2 / 5 / 2 / 5 | 2.42–3.24 | 2.11–3.09 | 10.10–17.98 | 0 |
| Ironfront | 5 / 5 / 5 / 5 | 2.56–3.12 | 2.55–3.06 | 8.48–60.20 | 5 |
| Survey-1 | 5 / 2 / 4 / 4 | 2.55–3.09 | 2.57–3.06 | 4.87–13.92 | 0 |
| Survey-2 | 3 / 4 / 4 / 4 | 2.46–3.16 | 2.38–3.34 | 5.18–72.60 | 8 |

Meridian's failed Player 2 zone moves from Cinderwick to Valford. Boreal moves two players, Ironfront four, Survey-1 two and Survey-2 none. Every published candidate meets the expansion and three-nearby-objective gate. City access does not determine approval, per the user's unequal-city-access direction.

## Limits and next decisions

Shared exit-region counts indicate that at least two resource routes leave the starting region through the same adjacent region. This is a coarse concentration warning, not a bridge-width, articulation-point or defensibility analysis. Actual tactical chokepoints, supply routing and economic balance are not certified. City distances count newly placed shared regional cities, not legacy settlements. The largest city-access differences warrant review before live campaign integration.

Sampling does not prove every point inside a base footprint or zone is valid. Only displayed candidate points are offered after validation. Search order can affect which viable fallback wins; no equal-position claim is made. Existing ownership is untouched because this remains a preview. No live production, campaign deployment or save mutation is introduced.

Validation: two focused regression tests pass, including five seeded audits, immutable input, deterministic repair and every published fuel/industry route within target. Typecheck and production build pass (existing bundle-size warning). Browser confirms Meridian produces 21 objectives with 12/12 published candidates passing and displays the repaired zone. Full campaign regression suite was not rerun for this isolated preview.
