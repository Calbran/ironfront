# 032 — Resource sites and city economy

## Accepted direction

Keep industry, fuel and manpower as the core currencies. Place extractable fuel deposits and industrial opportunities on the map; players establish production buildings after securing sites. Cities provide a substantial economic advantage. Home bases provide minimum baseline production regardless of starting terrain. Income is automatic rather than collected through clicks or individually controlled workers. Warehouses and depots store/distribute resources and supply rather than creating industry.

## Provisional sandbox tuning

| Site | Building | Industry cost | Hours | Hourly industry/fuel/manpower |
|---|---|---:|---:|---|
| Home base | Baseline | — | — | 2 / 1 / 1 |
| Fuel deposit | Drilling rig | 36 | 12 | 0 / 2 / 0 |
| Industrial site | Factory | 36 | 12 | 2 / 0 / 0 |
| Agricultural site | Agricultural works | 24 | 8 | 0 / 0 / 1 |
| Hamlet | Local workshop | 18 | 6 | 1 / 0 / 0 |
| City | Restored city works | 48 | 12 | 4 / 1 / 1 |

Sandbox starting stock is 80 industry, 40 fuel, 40 manpower. No stock cap is applied in this prototype; it does not replace the legacy campaign manpower cap. City restoration is a testable tuning choice, not a finalized requirement that every captured city must be restored. Agricultural manpower output abstracts support capacity, not instantaneous population creation.

## Implemented scope

Typed resource roles in timed placement and color legend. Local preview-only economic state allows control/connection simulation, legal construction, atomic payment and time advancement. Production accrues only for time after completion while controlled and connected. Lost control or connection suspends output; the timer continues in this sandbox. Reconnection does not retroactively pay for interrupted production. Selection changes/reset discard the local economy. No campaign commands, balances or saves are changed.

## Remaining gates

Authoritative capture/build commands, persisted operations, automatic campaign accrual, actual supply-path checks, storage/depot capacity, resource-specific geological/terrain suitability, depletion policy, recruitment sinks and cross-player fairness remain unimplemented. Current deposits are strategic placement proposals, not geology-derived deposits. Resource role correctness is enforced by typed site rules, not arbitrary player-chosen building types. Balance must test city snowballing and whether multiple minor sites remain a viable alternative.
