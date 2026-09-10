# Armies and coherent fronts

**Accepted direction, 2026-09-09:** implement the proposed small mixed-army roster, sector defense, deliberate offensive corridors, consolidation, connected supply, reserves, and legal retreats. Land owned remains the victory measure. **Implemented:** the first playable rules below. **Provisional:** all compositions, modifiers, ranges, thresholds, and timing; these are test hypotheses, not validated balance.

## Command model and units

A nation starts with three mixed armies, each with 100 aggregate strength. Players command armies rather than individual battalions. Composition is a fixed preset, with proportional abstract losses/replenishment; recruitment, changing composition, and separate equipment inventories are not implemented.

| Preset | Infantry | Motorized infantry | Artillery | Armor |
|---|---:|---:|---:|---:|
| Line | 70 | 0 | 25 | 5 |
| Assault | 35 | 10 | 25 | 30 |
| Mobile | 10 | 55 | 10 | 25 |

Infantry and motorized infantry provide defensive staying power and shorten consolidation. Motorized formations with at least 40 motorized composition traverse friendly plains/forest in two hours when fueled. Ordinary legs take four hours; highlands take six. Armor contributes most offense on plains and less in forests/highlands; fuel shortages weaken vehicles. Artillery raises offensive power, reduces fortification and entrenchment advantages, and erodes entrenchment during combat. Ground movement and combat consume vehicle fuel. Air support remains the existing automatic combat toggle; fighters, bombers, airfields, and standing air missions are deferred.

## Sectors and standing defense

A sector contains the headquarters region and up to two adjacent friendly regions. Changing it orders Hold, clears the offensive route, removes entrenchment, and takes four hours to deploy. Until ready, the army defends headquarters only. On Hold, effective strength is divided equally among covered regions. Six hours of holding build maximum entrenchment. Recover, Reserve, and moving armies defend only their current region.

Coverage is captured before arrivals resolve, so collapsing one part of a sector cannot give another simultaneous attack the entire army's strength. Regional garrisons and allocated field defenders share incoming damage. A defeated remote detachment collapses that army's extended sector while it regroups; surviving forces remain at headquarters. This is a deliberate coarse abstraction, not independently positioned battalions.

Reserve watches its assigned sector for an adjacent hostile standing offensive. It selects a threatened region, travels along a friendly route at normal speed, and switches to Hold on arrival. It does not teleport and does not automatically return to its former station. Players may reposition it or assign Reserve again.

## Travel, attack, capture

Redeploy routes exclusively through friendly territory. Advance can cross friendly land and the objective owner's territory (including neutral land), but cannot use an unrelated third nation's land as transit. The accepted route is stored as remaining region IDs and rendered as a corridor. Its next leg is checked each hour; a third-party ownership change or illegal edge halts the order for review. Orders do not silently choose a new corridor.

The attacker remains in its source region during combat. Ownership changes only after the garrison and the region's field defense are defeated or withdraw, with a surviving attacker. A capture leaves six garrison and takes 3–8 hours to consolidate, shortened by infantry content (current presets take 5–6). While the army's current region consolidates it cannot continue an Advance. Newly captured regions can receive connected supply but cannot pass it onward, and their garrison does not regenerate until consolidation finishes. Redeployment through friendly land remains possible.

Mountains from the continent generator are impassable, cannot be controlled or developed, and do not contribute to available conquest area. There is no naval movement or military access agreement.

## Supply and momentum

The original capital supplies up to four region edges through friendly land. A connected, consolidated depot relays a further four edges. Depots cannot independently create supply in an isolated pocket; losing the original capital interrupts this initial national supply model.

Armies normally carry twelve reserve hours; a depot supports up to twenty-four locally. A supplied army replenishes two reserve hours per tick. An isolated army consumes one per tick, plus one per line-army combat or two per assault/mobile combat. Offensives pause below three reserves; low reserves also reduce attack power. Unsupplied armies cannot replenish strength. At zero reserve, an isolated army loses two strength per hour and attempts a legal withdrawal. A trapped army eventually reaches zero and is removed as destroyed/surrendered. Local depot reserves are finite; captured buildings remain intact.

Supply reach, frontage, force count, economy, and campaign duration need joint playtesting on the larger continent. Three armies and four-edge supply are initial experiments, not a claim that the whole continent can already support a balanced continuous front.

## Retreats and risk

Cautious/balanced/aggressive thresholds are 45/30/15 strength. Attackers halt to Recover below the selected threshold. Defenders try an adjacent friendly withdrawal, preferring the first step toward a selected connected fallback; they continue toward that fallback at ordinary travel speed. Without a legal withdrawal, they keep defending until destroyed. A dislodged army can retreat only into an immediately neighboring friendly region; no distant emergency relocation exists. No friendly neighbor means surrender.

A selected fallback can become cut off. In that case the army uses a legal neighboring position if one remains. These rules function without an online client. The API owns commands and commits each transition and tick atomically.

## Persistence and limits

Version-one saves upgrade idempotently on load and persist on the next store transaction. Existing land, resources, sessions, army IDs, and strength survive. Existing armies hold position under the new model; active surviving nations receive assault/mobile armies. No map is regenerated by this upgrade. Completed campaigns receive compatible fields but no additional armies.

Multi-party combat still uses rotating priority, with opposing edge crossings blocked. This is deterministic rather than a fully simultaneous combat solver. There is no recruitment/replacement army flow, manual battalion composition, diplomacy, fog of war, or automatic depot construction. Bots use legal standing objectives and basic frontier defense but do not optimize logistics/economy. Gameplay tests verify state invariants and deterministic persistence, not strategic fairness.

## Dynamic squad combat revision — 2026-09-09

Decision 009 replaces the aggregate damage exchange described above with persistent server-owned squads and engagements. Campaign-hour travel/economy remains; tactical exchanges run between those ticks. Army composition determines squad roles and capacities. Weapon range, terrain/fortification/entrenchment, morale, suppression, supply, fuel, and faction effects determine each exchange. Artillery provides longer-range suppressive fire; enabled air support consumes fuel and changes the live fight. Arriving reinforcements join ongoing engagements. Losses are simultaneous and reconcile into army strength. No winner is precomputed.

Players still command armies. Regional garrisons, region-to-region arrival, territorial capture and consolidation remain the existing abstractions. City capture and individual-soldier micromanagement are not introduced. See decision 009 for implementation boundaries and provisional tuning.

## Military vision revision — 2026-09-09

Decision 010 supersedes the full-visibility limitation: owned land and living forces reveal their region and adjacent passable regions. The authenticated API withholds distant military activity and enemy private orders/resources; public geography and borders remain. Combat continues on complete authoritative state, independent of client vision. See decision 010 for the provisional reach and current limits.

## Local squad orders — 2026-09-09

Decision 012 supersedes army-only tactical positioning: individual squads now accept persistent local Move/waypoint/Hold commands, validated and resolved by the server inside their current region. They do not chase beyond weapon range while locally assigned. Army travel/retreat and region capture remain authoritative; new army orders supersede local placement. No directional flank modifier, building collision or line-of-sight system is introduced. See [012](../05-decisions/012-local-squad-orders.md).

## Direct squad routes (supersedes player strategic movement above)

Decision [013](../05-decisions/013-cross-region-squad-orders.md) makes precise squad routes the primary player order. Right-click land moves selected squads continuously across shared region borders; Shift queues waypoints. Army selections are mass-selection shortcuts. Taking direct control retires the parent strategic route and holds unselected siblings in place. Actual squad presence determines combat and capture. Legacy movement rules above remain for bots and saved strategic orders; direct supply, withdrawal and consolidation are specified in decision 013.

## Physical mountain footprints

Decision 020 adds saved ground obstacles corresponding to visible mountain sprites, including rocky features within otherwise traversable regions. Direct squad routes avoid them; invalid destinations reject atomically, and stale routes are checked before displacement. Air movement is exempt. This does not add line-of-sight blocking or new aircraft recruitment.
