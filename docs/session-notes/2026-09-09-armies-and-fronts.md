# Armies and coherent fronts — 2026-09-09

The owner approved implementing the discussed first military slice. Added three mixed presets; frontage-limited standing defense; legal persisted offensive/redeployment routes; capture consolidation; capital-connected supply and depot relays with finite isolated reserves; risk, fallback, and automatic traveling reserves; and loss/surrender instead of distant relocation.

The API validates all new command shapes and ownership. Store upgrades old saves without replacing geography or sessions. Old orders halt for review under the new rules. Active nations receive additional army presets. Fixed composition, abstract air support, and no recruitment remain explicit limits.

Ten new simulation tests cover the roster, supply cutoffs, depot isolation, fresh capture supply interruption, legal corridors, consolidation, sector dilution/deployment delay, reserve travel, surrender, legal retreat, and idempotent migration. An additional API/store test covers sector/policy validation, transactional rejection, and deterministic route/deployment state across reopen. With the concurrent continent integration, all 21 Node tests pass; typecheck and build pass. The existing Vite chunk advisory remains.

The browser script `scripts/fronts-browser.ts` verified army switching, sector assignment, risk/fallback, Reserve, reload, Redeploy, Advance, impassable mountain rejection, and mobile Hold, with no page errors. The first screenshot review identified army fact overflow on phones; the facts now use two columns and sector settings are collapsed by default. Final screenshots are under `.impeccable/review/fronts-desktop.png` and `fronts-mobile.png`.

The design detector ran once across changed UI sources. It reported advisory palette/type-ramp discrepancies against existing design metadata, mostly in pre-existing CSS; the newly added 12px route summary follows the incumbent compact text. No claim of a clean detector pass or balance validation is made.

Concurrent work in the map task introduced the Ironfront name and larger continental geography. Integration preserved its files, excluded mountains from movement/supply, and added selected-army/route/active-defense display props. Three armies, three-region sectors, and four-edge supply need joint large-continent pacing playtests.

Independent finish review returned **ship — bounded military-interface extension**, with no material findings in the army controls. Keyboard-only/screen-reader flows were not separately exercised; game balance remains unvalidated. The review noted black canvas margins in the separate geography renderer and that task was notified with screenshot evidence.
