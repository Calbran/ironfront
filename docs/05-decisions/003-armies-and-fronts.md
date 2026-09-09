# Decision 003: Mixed armies and coherent fronts

**Status:** accepted implementation direction, 2026-09-09. The user approved the proposed roster and front-line plan with “sounds good for now, implement it.” Numerical tuning remains provisional.

## Decision

Command a small number of mixed armies built around infantry, motorized infantry, artillery, and armor. Defend limited connected sectors with strength divided across frontage. Separate friendly redeployment from deliberate offensive corridors. Require consolidation after conquest and connected, finite-range supply. Give reserves standing responses, and give defenders risk thresholds and legal fallback routes. Remove distant emergency relocation. Keep ownership-based victory and asynchronous management.

## Shipped scope

Three fixed presets per nation, three-region local sectors, automatic ground reserve response, persisted corridor/risk/fallback state, consolidation, capital-connected depot relays, finite reserves, legal retreats, and compatible save upgrades. See [the rules contract](../02-systems/fronts-and-armies.md) for actual behavior and provisional values.

## Deferred and unvalidated

Recruitment and configurable composition; actual fighter/bomber units and area missions; more sophisticated supply roots; simultaneous multi-party combat. The concurrent larger-continent work changes the scale at which supply/frontage must be tested. No balance validation is claimed.
