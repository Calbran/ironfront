# Campaign alpha integration

Production entry: `/`. Game-core owner: `campaignBattlefield.ts`. API owner: `campaignBattlefieldRoutes.ts`. UI owner: `BattlefieldApp.tsx`. The country and city pages remain test harnesses.

| System | Main alpha | Shared owner / boundary |
| --- | --- | --- |
| City, towns, POIs, roads, bridge surfaces, forests | Connected to the full scale-test continent for new version-2 campaigns; older version-1 saves retain the bounded map | massiveCampaign + campaignPhysicalScale; shared city/POI/terrain/road planners, bounded countryLandscape tiles and countryTravelGraph; local meshes are never scaled |
| Infantry, tank and airship selection/orders | Connected; drag select, move/facing, queue, hold, cover, slowest group pace | countrySlice movement/navigation, tacticalPlacement, tacticalSupport, forestVehicleMovement |
| Combat and autonomy | Continuous in the campaign save | advanceCountryCombat; no test stages or ten-minute deadline; fixed-step land control in advanceCampaign |
| Sight and hearing | Connected | countryPlayerState/countryVisibility + createCityHearing; hidden events contain anonymous coarse sound positions |
| Running/idle/aim/death, turret, recoil, tracks | Connected | countryTacticalAdapter → tacticalPresentation; same scene as country test |
| Muzzle flash, moving bullets/shells, impacts, temporary craters and spatial sound | Connected | tacticalBattleEffects and cityBattleAudio through tacticalPresentation |
| Sandbags | Connected; validated/costed/persisted, cover and collision, tank crushing | validateCityBuild, emplacementModels, cityTactics cover and country navigation |
| Territorial control / supplies | First provisional pass | Nearest-place land areas; 30-second infantry occupation; 5 supplies/place/minute, 10/build, cap 500 |
| SQLite save/restart/offline simulation | Connected | Separate alpha tables, saved geography, background scheduler, retained fixed-step backlog |
| Multiplayer/faction joining | Pending | Alpha is one commander versus Crown units; do not promote old multiplayer proof UI as connected |
| Reinforcement/recruitment and broad opponent strategy | Pending | Fixed initial roster with reactive tactics; no replaceable army pool or strategic planner |
| Full supply/economy, wire/trenches/warehouse/artillery mechanics | Pending | Older models/proof rules are not automatically compatible campaign mechanics |
| Permanent scars and large-scale simulation tiers | Pending | Effects are bounded/transient; distant combat is still the same full fixed-step authority |

## Verify the alpha

1. Open `/`, establish a command and copy the key under Session. Initial generation may take tens of seconds. Resume should use the same saved geography and troops.
2. Move a city squad using right-click/right-drag; inspect Hold and Take cover. Build sandbags on clear ground near infantry; verify infantry avoidance/cover and tank destruction.
3. Double-click Northfield Rifles to focus the initial contact. Enable Sound. Check deaths, independent soldier animation, muzzle flashes and tracers; focus a tank when it engages to inspect shared turret/shell effects.
4. Use Whole map and the minimap to move between sites. Occupy land with infantry; verify contested sites do not transfer and supplies accumulate from owned places.
5. Close/reload the browser. Verify continued simulation, saved orders/casualties and hidden enemies. Test server restart with an isolated DB rather than modifying an existing playtest.

Run `npm run typecheck`, `npm test`, `npm run build`. Campaign regression coverage lives in `tests/campaign-battlefield.test.ts` and `tests/massive-campaign.test.ts`; shared combat, presentation, terrain, physical-cover and entry contracts remain required. Browser frame measurements are local samples, not a validated unit ceiling.

Reproducible browser check: `node --import tsx scripts/campaign-alpha-browser.mjs` after building. It uses an isolated in-memory server on port 3193 and writes screenshots/results under `.impeccable/review/campaign-alpha`. See [validation and next work](../session-notes/2026-09-12-persistent-campaign-alpha.md).

## Full continent

Version-3 update (2026-09-13): new campaigns use ranked city/metropolis plans, safe inland anchors, satellites and larger industrial/countryside sites. Additional scenic sites are excluded from territory/income creation. The terrain lattice now has 1024 intervals with graded pads and subdued lowland relief. `regionalFarmland` polygons and indexed containment are shared by rendering, woodland and armored movement. Earlier version-2 geometry and the historical limitations below remain saved independently.

Overview names are ranked/budgeted, authorized formations cluster, and emplacements have markers. Places search includes natural ranges and all scenic sites. Large settlements use camera-bounded detail from `countryPOIAssets`; `countryDevelopedGeometry` supplies identical urban parcel surfaces to the campaign and POI gallery. Detailed terrain indices follow the camera while a coarse exterior remains visible. These LODs never change authority. The gallery now exposes the same town/city/metropolis/industrial-complex generators. Run the browser script with `--massive --shared` to include the country harness, POI gallery and city renderer.

Use `node --import tsx scripts/campaign-alpha-browser.mjs --massive` after building for full-map move/build/reload/layout validation. Default invocation still checks the bounded version-1 fixture. New campaigns start at the landmass overview; double-click a unit card to return to tactical scale. Earlier sessions expose **Explore the new world** and keep previous keys in **Session**.

Coordinates: the shared `campaignPhysicalScale` conversion is 14.3 physical model units per logical world unit, also consumed by the pacing preview. The global lattice, rivers, road vertices and site anchors are converted exactly once. Building dimensions, road widths, bridge dimensions, weapons and unit movement retain tactical units. The road graph checks terrain, river crossings and physical obstacle intersections; unsupported disconnected routes return an error rather than teleporting a squad. Land-area sampling excludes sea and has a bounded 256-cell maximum axis.

Limits: one headquarters uses the full detailed city plan; other places use seeded POI layouts. Forty locations in the current Meridian generation lack safe road connections. The surface uses a coarse continental lattice with flat settlement pads, not streamed high-resolution terrain. This map does not add recruitment, strategic AI or a larger initial army. See the full-map session note.
