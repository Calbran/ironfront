# Military model kit

Reusable vertex-colored GLB model studies, generated from `apps/web/src/prototypes/militaryModels.ts`. Inspect and re-export at `/military-preview.html`.

| Asset | Triangles | Description |
|---|---:|---|
| tank.glb | 1,428 | Tracked steam tank, copper boiler, rotating turret node |
| airship.glb | 1,072 | Patrol envelope, gondola, fins, two propeller nodes |
| artillery.glb | 1,908 | Field gun, shield, trails, ammunition box, sandbag horseshoe |
| sandbags.glb | 936 | Four staggered courses with left/right join nodes |
| wire.glb | 2,740 | Posts, two barbed strands and concertina coil; join nodes |
| lmg.glb | 2,212 | Six-person squad: gunner, ammunition assistant, four riflemen |
| landship.glb | 1,612 | Iron Directorate heavy hull, side guns, red steel markings |
| guards.glb | 2,448 | Six Crownward Guards, blue coats, breastplates and helmet crests |
| gunship.glb | 720 | Aether twin turbines, compact cabin, chin gun and copper boiler |
| engineers.glb | 2,452 | Six engineers with spades, tool packs and field equipment |

## Scale and integration

Models use the original `bakeInfantry` coordinate system, nominal standing helmet height 1.925 units. The preview reference and squad use the actual baked aiming pose; its crouched bounding height is about 1.686, without scaling. Feet are translated to the ground. No metres conversion is established.

The current city diorama places infantry at **0.55 × model coordinates**. Apply that same uniform scene transform to these models when inserting them into the diorama; do not fit each model to a building lot or rescale it independently. Campaign rendering uses a different adapter, so apply its infantry transform consistently when integrating there.

GLB `extras` record measured dimensions, provisional footprint envelopes and reference height. Footprints are preparation for future integration, not collision or cover authority. The airship includes a preview hovering offset beneath its gondola. Turret/propeller and wall joining nodes are retained in exports. The LMG squad is a static merged inspection formation; its member nodes identify roles, but this export is not an independently animated six-person gameplay rig. Reuse the existing articulated infantry path for live integration.

Art only: these files do not add recruitment, deployment, transport, flight, cover or obstacle mechanics. The exact infantry geometry is reused; all other geometry is original TypeScript/Three.js construction. No generated bitmap textures or external model assets are needed.

Faction additions retain the same body scale; Guards add armor rather than enlarged bodies. Engineers and Guards are static inspection squads, following the same live-animation limitation as the LMG export. Gunship turbine nodes rotate in the preview. Landship and gunship metadata identify their provisional factions.
