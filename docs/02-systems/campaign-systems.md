# Campaign Systems — Executable Proof

**Status: implemented first slice, 2026-09-09.** This is the current rules contract, not validated final balance. The design blueprint owns the broader intended game.

## Map

New campaigns use the [continental geography contract](continental-geography.md): 72–192 territories, named provinces, forests, plains, highland passes and impassable unowned mountains. Each nation begins with four regions and a capital factory; starting fairness and continental pacing remain provisional.

## Joining

The creator claims seat zero. Other seats immediately act as simple bots and can be claimed with the campaign invite code while they still hold land. Claiming a seat halts its bot orders and lets the player select a faction. The campaign begins immediately; no ready/start lobby or reserved faction slots yet. All players see the complete map and army orders. Nations can share a faction.

## Time

A tick is one simulated hour. Normal mode ticks every real hour; test mode every ten seconds. The test host can advance an hour manually. A tick advances from the persisted due time only once, commits state, then schedules the next tick relative to completion. Browsers do not own time. Restart resets the next due time without advancing the world, explicitly pausing downtime rather than catching it up. Small scheduler delays can lengthen the real campaign; a strict wall-clock deadline is not implemented.

## Resources

Per owned region per hour: +0.25 industry, +0.12 fuel, +0.3 manpower. Factories add +2 industry; refineries add +2 fuel. Manpower caps at 200. Industry/fuel have no cap. Passive gains occur before construction completion, so a completed producer first pays on the following hour.

| Building | Industry cost | Hours | Effect |
|---|---:|---:|---|
| Factory | 36 | 8 | +2 industry/hour |
| Refinery | 28 | 6 | +2 fuel/hour |
| Supply depot | 24 | 6 | Local supply anchor; +2 hourly recovery |
| Fortifications | 30 | 8 | +35% region defense |

One building slot per region. Construction pays up front; occupied/queued slots reject duplicate requests. Capture cancels unfinished construction without refund; completed buildings transfer intact. Recruitment centers and airfields are future work.

## Armies, movement, supply, and combat

**Superseded by the implemented [armies and fronts contract](fronts-and-armies.md), 2026-09-09.** Nations now have line, assault, and mobile armies; fixed compositions influence combat, travel, and consolidation. Standing sectors divide defensive strength. Routes distinguish friendly redeployment from offensive corridors. Supply requires a connected capital/depot network, reserves are finite, and retreats use legal neighboring territory. Air support remains abstract. Exact values remain provisional.

## Bots

Unclaimed nations use the same army orders and route restrictions as players. Line armies cover nearby friendly frontier regions; other available formations choose a reachable hostile border using a friendly-travel search. Armies halt below their risk threshold and recover before resuming. Bots do not develop their economy or optimize depot placement. Claiming a seat stops every inherited army's route.

## Victory and history

Every controllable region contributes its area to its owner, with no quality multiplier. Mountains are excluded from the denominator. More than 50% for 48 consecutive simulated hours wins early. Otherwise the largest area after hour 672 wins; exact ties share the result. Dropping below a majority resets that countdown. Completed campaigns reject new orders and stop advancing.

The latest 250 dispatches persist with the campaign. The browser remembers the last observed hour per campaign and shows elapsed campaign hours on return. This is a rolling activity feed, not a durable complete campaign archive or map replay. Event messages identify captures, construction, orders, and fighting. Full per-player unread tracking is future work.
