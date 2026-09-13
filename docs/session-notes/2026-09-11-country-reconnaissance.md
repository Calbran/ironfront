# Country reconnaissance and forest concealment

Date: 2026-09-11

## Outcome

Country slice enemy state is now authorized by server-side vision. Infantry see 180 model units on open ground, tanks 500 and scout airships 1,000. Dense forest reduces a ground observer's sight by up to 35% and reduces the distance at which a unit inside it can be detected. A moving unit in forest is slightly easier to detect than a stationary one, while both remain substantially harder to see than an exposed unit.

The player response omits unseen enemy groups, future orders, support targets, reaction state and shots whose endpoints are not visible. The encounter AI uses the same observer-to-target test, so forest concealment applies to both factions. Airships provide reconnaissance without joining direct fire.

Selecting friendly units draws terrain-draped cyan vision rings and amber firing rings. The firing radii come from the shared tactical weapon-role constants; the vision ring reflects the selected observer's current forest penalty. Actual enemy detection can be shorter when the target has forest concealment.

## Ownership

`packages/game-core/src/countryEncounter.ts` owns country vision radii, forest sampling, observer-to-target detection and player-state filtering. `apps/api/src/countrySliceRoutes.ts` applies that authority to every live state response. `apps/web/src/experiments/countrySliceScene.ts` only renders authorized state and range UI.

## Validation

Focused country encounter, country API, marker and shared-presentation tests pass. Typecheck and the production build pass. Browser review confirms infantry displays distinct vision and fire ranges, the scout airship displays `Vision 1.8 km · Fire none`, and both terrain-draped rings render without covering the sound control. A direct click on the visible airship envelope selects it after clearing selection; its hit radius follows the projected model bounds. Country and city retain separate visibility models; unifying them is future work.
