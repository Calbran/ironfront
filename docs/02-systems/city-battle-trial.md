# Full-city commanded skirmish — 2026-09-10

Open `/city-diorama.html?case=citywide&seed=732`. The full city stages six friendly infantry and one tank against six defending infantry, initially paused. Select infantry squad, individual buttons, or box-select; Shift adds to selection. Right-click ground to move; click a red enemy or its marker to focus fire. Attack orders try reachable firing positions when blocked or out of range. Start/pause controls simulation; reset creates a fresh scenario.

The server owns movement, health, target choice, seeded firing and delayed tank impacts. It uses the shared fire kernel with one representative per infantry model, a 0.25-second exchange and provisional 4x damage tuning for this isolated test. Movement advances at 20 Hz; snapshots poll at roughly 6.7 Hz. Buildings use the same seeded full-city geometry and block shots; low obstacles reduce exposure. Dead infantry lose their selection markers, play one of three falls, and remain as bodies. Tracers and recoil are presentation only. Enemy infantry hold their positions and return fire; this is not a tactical maneuver AI.

Sessions are ephemeral and separate from campaign saves. Opaque bearer keys restrict commands; clients cannot command enemies or supply health. Sessions expire after 20 idle minutes. Full-city plan generation runs in a worker with a bounded cache; the first load can take about 25 seconds. This is not a full-scale multiplayer benchmark, and the presentation still uses simple tracer/casualty effects.

Validation includes deterministic fire and casualty tests, ownership, pause and movement-order tests. Live browser review confirmed start/pause, enemy casualties and the full-city scene.

Tank turrets turn independently at up to 1.5 radians/second; shots wait for alignment. Moving infantry fire at 0.55 accuracy and 65% movement speed. These penalties are provisional. Cannon recoil, muzzle flash, dust and casualty falls are cosmetic, with no ragdoll or wind physics.

Validation for combat feedback: full regression suite 194/194 passed, plus the focused moving-fire speed test. Typecheck and build passed. Live review exercised turret combat and casualties. Polling allowance is now scoped to a valid battle session to prevent multiple views sharing one quota.

Tank presentation tuning: five-second reload, shell speed 150 scene units/second, minimum 60 ms flight; authoritative hits resolve on the next eligible combat exchange. Non-fiery dust impacts leave temporary crater impressions in two instanced batches. Cap: 64 marks. Lifetime: 90 seconds, with shrinking removal in the last 15 seconds. Marks do not affect pathfinding or persist across resets.

For durable battlefield history, persist sparse impact records per terrain chunk and bake older overlapping marks into a terrain scar texture. Keep only recent impacts as animated effects. This bounds active rendering objects and avoids one permanent mesh per shell. Actual depressions, destroyed buildings and navigation changes are separate simulation features with higher cost. Permanent campaign scars are not implemented by this temporary visual pool.

Local infantry reactions: finish explicit move routes first, then consider improved directional cover within four units of the assigned anchor. Reconsider on damage/target changes, or blocked attack lines, at staggered 3.5–4.7 second intervals. Destinations reserve spacing; only short unobstructed steps are allowed. Vehicles do not reposition reactively. Hold position stops movement and disables reactions until another move/attack command.

Click/drag cover orders prioritize same-side face slots near the destination, including adjacent corner faces, with separate space for each soldier. Open ground retains a straight formation. The server receives facing and uses the same preview planner. Cover capacity is finite, and unsafe overflow cannot cross to the exposed side. Reaction radius and timing are provisional.

### Cover-order activation and preview budget

Orders within 3 scene units of a cover surface prefer same-side protected slots. This provisional snap radius is separate from the 1.1-unit physical protection range. Preview solving runs at most every 80 ms; releasing an order recomputes its destination immediately through the authoritative order path. Nearby geometry and cover scores are reused within each solve. Run node --import tsx scripts/bench-cover-preview.ts to measure six-infantry preview CPU time in seed 732's full city (not render FPS).

### Shared vision

The player API uses playerState, separate from internal simulation state. Living infantry observe within 180 scene units (about 327 metres) and vehicles out to their 495-unit maximum cannon range. Existing spatial LOS caches block sight through buildings while permitting it across low cover. Hidden enemies leave the snapshot and client presentation immediately on receipt; polling is 150 ms. Attack commands recheck visibility. Enemy routes are never sent. Shot events must have both endpoints observed when emitted and when delivered. No terrain fog overlay is included in this pass. Ranges are provisional and scoped to this tactical scale.

Shell damage correction: fixed base payload 120, infantry multiplier 1.35, radial multiplier (1 - distance/4) within a three-unit radius, followed by building/cover exposure from the impact point. Direct exposed hits kill 100-health infantry. Existing accuracy rolls now select direct versus deterministic 3.5–5 unit scatter, not explosive payload strength. Shells continue to resolve after flight on the combat step; five-second reload unchanged.

Close-range exception: within 12 scene units, an aligned stationary tank firing at a stationary target uses a direct impact instead of a random miss. Target acquisition still requires an unobstructed firing line. Longer ranges and moving targets retain seeded accuracy/scatter.

### Contact memory and sight presentation

Player snapshots retain last-observed enemy coordinates only: ID, x/z, observation time and age. Hidden contacts never update from live enemy positions. Dashed question marks fade over 30 simulation seconds, pause with the battle, and cannot be targeted. Reacquisition, visible death, expiry, or observing their now-empty position clears a contact. Selected-unit outlines sample 64 rays against nearby building rectangles at 4 Hz; outlines are approximate and do not replace authoritative LOS. Low cover permits sight. Contacts and outlines are presentation aids; terrain fog remains unimplemented.

### Construction UI prototype

The Build control opens a five-item palette: sandbags, barbed wire, artillery, warehouse and trenches. Picking an item collapses the palette; the cursor preview turns green on valid ground and red when blocked. R rotates 45 degrees. Left-click places, right-click/Escape cancels. Undo last removes the newest placement. Footprints are checked against existing tactical terrain, slopes, visible units and other placements. This local visual workflow has a 48-item cap and lasts until reload/regeneration. It does not create authoritative battle obstacles, weapon units, supply capacity or excavated trenches; those integrations require the next gameplay pass.

### Physical sandbags and group movement

Sandbags are now server placements, not local decoration. Build/removal commands validate footprints and a 40-unit friendly construction radius. Dynamic obstacle buckets and fire visibility refresh only on placement/removal/crushing. Infantry route queries and cover previews use the same barriers; movement stops if a newly placed barrier obstructs its existing path. Tanks may route across built sandbags and remove them on hull contact. Crushed barriers stop providing cover and disappear from client placement models. Other emplacement types remain visual prototypes.
Group move orders retain a group ID and cap pace at the slowest active member, including infantry firing penalties and tank acceleration or turning waits. Independent move orders detach units; arrived/dead/stopped members no longer constrain movers. This coordinates speed, not arrival time across different route lengths.

## Camera-relative battle audio — 2026-09-11

The full-city tactical view has an opt-in Sound control, volume slider and Test SFX button. Sixteen original synthesized one-shot variants cover rifle cracks, cannon reports, impacts and footsteps; two loops provide tank engines and tracks. WAV assets and a stereo near/far demonstration are reproducible with scripts/generate-battle-sfx.ts. Runtime buffers are synthesized once and shared, with no network or external sound-library requirement. This is a replaceable sound-design prototype, not recorded foley.

Sources pan with camera orientation, attenuate and lose high frequencies with distance, and include a bounded propagation delay. Orthographic zoom changes the virtual listener distance. Footsteps follow traveled distance and stop when idle; at most four visible vehicles have engine/track loops. A shared 32-voice cap drops lower-priority effects, distant rifle bursts are rate-limited per spatial cell, and master compression controls stacked transients. Muting, pausing, hiding the tab and disposal stop voices; snapshot cursors avoid replaying old shots. Pause/mute tests and further sound-quality tuning remain useful manual review areas.

Server hearing events are separate from visible combat events. Living friendly observers must be within 160 scene units of rifles or 360 of cannon/impacts. Returned cues contain only event ID, class, time and 32-unit-cell centers; no enemy identity, target, damage or exact hidden position. Hearing never creates a visual contact or authorizes attack commands. Visible shot events can supply exact sound positions already authorized by vision. Hearing history is capped at 128 cues and two simulation seconds.

Scope: currently the staged city battle. Cross-map simultaneous campaigns need a shared audio-event feed; this does not invent ambient battles. Distance filtering is not building occlusion, terrain acoustics or a full reverberation simulation. Generated samples are originals without third-party recording attribution requirements. Verify auditory quality by listening; automated PCM tests do not establish realism.

### Audio timbre, city reflections and range retune — 2026-09-11

Footsteps use a softer low-frequency heel/toe envelope with greatly reduced bright friction. Rifle reports have a shorter pressure crack, stronger 88–100 Hz body and darker mechanical/echo tails; cannon blast noise is also darker. One shared 0.72-second convolution impulse adds a restrained city reflection tail to one-shot effects; vehicle loops remain dry. Muting/pausing clears the shared reverb history, and the 32-source budget remains unchanged.

Rifle/cannon presentation cutoff distances increase to 2,800/5,600 model units with a gentler low-volume falloff, progressively dark filtering and a capped 2.5-second travel delay. Quiet-source culling can end audibility before these outer bounds. Authoritative hearing expands to 1,200/3,200 units; reported positions become 128-unit cells beyond 160 units and 256-unit cells beyond 640 units. Hearing remains observer-authorized and never enables targeting. These ranges and timbres are provisional listening adjustments, not calibrated real-world acoustic distances.

## Varied rifle reports and simultaneous city firefights — 2026-09-11

Shipped: rifle reports use independently hashed sample choice, playback rate (1.06–1.24) and gain (0.88–1.12), plus varied transient/body decay across the four baked samples. Rifles include a 65-unit acoustic stand-off in the camera distance calculation, making even close overhead views quieter and darker while preserving a slightly higher underlying pitch. Cannon playback pitch and gain tuning are retained. These are provisional listening adjustments.

Infantry muzzle flashes now originate from the animated rifle barrel tip, use a small elongated flash and remain visible for 85 ms. They reuse the existing instanced effect pool without point lights, and remain restricted to disclosed visual shots.

Stage multiple firefights opens the optional battles=multiple city configuration. The server and local roster generator find two additional separated, walkable six-infantry engagements with clear opposing firing lanes. Seed 732 stages 25 total units: the original six friendly infantry/tank versus six enemies plus two three-versus-three fights. Sites are at least 75 units apart; unsuitable sites are skipped rather than placing troops inside obstacles. All use normal authoritative targeting, damage, visibility and hearing, with no fabricated ambient shots. Main squad/West/East buttons focus sites; Restage firefights reloads a fresh paused scenario. This is simultaneous fighting inside one city, not a global campaign battle-event service. Existing default staging remains unchanged.

Focused validation: 10 audio and multi-battle tests pass, including real shots and casualties from both extra sites. Browser verified 13 friendlies/12 visible enemies at start, Sound enable, run/pause, and West/East focus. Full regression/build checks recorded below when complete.

## Shared tactical presentation — 2026-09-11

City battle and country slice now use one presentation owner for infantry running/aiming/reloading/deaths, tank tracks/turret/recoil, muzzle flashes, short tracers, shells, dust/craters and camera-relative sound. Country rendering smooths individual soldiers and fractional movement steps, and uses authoritative impact events. Animation review shares run clips, rifle/armor effects, audio and tank animation primitives. Full/partial cover quality is retained for country poses. See docs/03-technical/shared-system-standards.md for required owner/consumer audits and the explicit preview/legacy inventory. Regression and browser results are recorded in docs/session-notes/2026-09-11-shared-tactical-presentation.md.
