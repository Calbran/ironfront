# Grand-campaign map scale — 2026-09-09

Owner requested a larger world and wider territory-size variance without increasing management through many small territories. Version 4 doubles both dimensions (4,800 × 3,200 at four nations), keeps eight territories per nation, and widens seeded growth speeds to 0.5–3.0. The sampled 80th/20th-percentile area ratio increases from 2.4–3.8 to 5.0–9.1. Land area is about four times the measured earlier baseline.

A two-player Meridian regression exposed initial expansion claiming multiple chokepoints and leaving later nations in small pockets. Capital choice now prefers components with four available regions; expansion prefers peripheral neighbors before junctions. Existing starting-count tests pass, and a ten-seed four-player spot check had four starting regions per nation. Starting-area balance is still provisional.

Maximum zoom is now 1200%. Old saved geography is preserved; create a new campaign for the larger world. Economy, supply hops, movement/range scaling and the 28-day timer are not rebalanced by this pass, so scale alone does not prove the desired campaign pace.

Validation: `npm run typecheck`, all 13 test files and `npm run build` pass. Desktop/phone isolated browser checks verify 4/8-nation preview sizes/counts, exact preview/campaign geography agreement, 1200% zoom, Fit and no page errors/overflow. Reviewed `.impeccable/review/grand-preview-1440.png`. A local Boreal generation measured 393ms for four nations and 789ms for eight; this is a spot measurement, not a performance guarantee. Preview generation remains in its worker.
