# Battle sound and spatial mixing


## Camera-relative battle audio — 2026-09-11

The full-city tactical view has an opt-in Sound control, volume slider and Test SFX button. Sixteen original synthesized one-shot variants cover rifle cracks, cannon reports, impacts and footsteps; two loops provide tank engines and tracks. WAV assets and a stereo near/far demonstration are reproducible with scripts/generate-battle-sfx.ts. Runtime buffers are synthesized once and shared, with no network or external sound-library requirement. This is a replaceable sound-design prototype, not recorded foley.

Sources pan with camera orientation, attenuate and lose high frequencies with distance, and include a bounded propagation delay. Orthographic zoom changes the virtual listener distance. Footsteps follow traveled distance and stop when idle; at most four visible vehicles have engine/track loops. A shared 32-voice cap drops lower-priority effects, distant rifle bursts are rate-limited per spatial cell, and master compression controls stacked transients. Muting, pausing, hiding the tab and disposal stop voices; snapshot cursors avoid replaying old shots. Pause/mute tests and further sound-quality tuning remain useful manual review areas.

Server hearing events are separate from visible combat events. Living friendly observers must be within 160 scene units of rifles or 360 of cannon/impacts. Returned cues contain only event ID, class, time and 32-unit-cell centers; no enemy identity, target, damage or exact hidden position. Hearing never creates a visual contact or authorizes attack commands. Visible shot events can supply exact sound positions already authorized by vision. Hearing history is capped at 128 cues and two simulation seconds.

Scope: currently the staged city battle. Cross-map simultaneous campaigns need a shared audio-event feed; this does not invent ambient battles. Distance filtering is not building occlusion, terrain acoustics or a full reverberation simulation. Generated samples are originals without third-party recording attribution requirements. Verify auditory quality by listening; automated PCM tests do not establish realism.

Validation: tests cover distance gain/filter/delay, rotated stereo panning, snapshot deduplication, PCM bounds, hearing privacy and history limits. Browser verified opt-in context activation, volume controls and Test SFX. Final build/full-suite outcome recorded in task response.

Final verification: all 264 regression tests pass, plus final typecheck and production build. Browser enabled Sound, displayed volume/Test SFX, ran the server-connected staged battle with sound enabled, and remained responsive while enemy casualties occurred. Audio fidelity was not assessed by listening; the generated stereo WAV demo is available for user audition. The temporary battle was paused after review.


### Audio timbre, city reflections and range retune — 2026-09-11

Footsteps use a softer low-frequency heel/toe envelope with greatly reduced bright friction. Rifle reports have a shorter pressure crack, stronger 88–100 Hz body and darker mechanical/echo tails; cannon blast noise is also darker. One shared 0.72-second convolution impulse adds a restrained city reflection tail to one-shot effects; vehicle loops remain dry. Muting/pausing clears the shared reverb history, and the 32-source budget remains unchanged.

Rifle/cannon presentation cutoff distances increase to 2,800/5,600 model units with a gentler low-volume falloff, progressively dark filtering and a capped 2.5-second travel delay. Quiet-source culling can end audibility before these outer bounds. Authoritative hearing expands to 1,200/3,200 units; reported positions become 128-unit cells beyond 160 units and 256-unit cells beyond 640 units. Hearing remains observer-authorized and never enables targeting. These ranges and timbres are provisional listening adjustments, not calibrated real-world acoustic distances.

Retune validation: 266/266 regression tests pass; typecheck and production build pass. Browser Sound enable, Test SFX, mute and resume controls verified without the earlier initialization failure. Convolution impulse now uses the audio device sample rate; its damping coefficient also adapts to sample rate. Auditory balance remains subject to listening feedback. Repository-wide diff check reports existing extra EOF blank lines in cityBattleRoutes.ts, threePreview.tsx and worldDetail.ts; left unrelated concurrent edits intact.


## Varied rifle reports and simultaneous city firefights — 2026-09-11

Shipped: rifle reports use independently hashed sample choice, playback rate (1.06–1.24) and gain (0.88–1.12), plus varied transient/body decay across the four baked samples. Rifles include a 65-unit acoustic stand-off in the camera distance calculation, making even close overhead views quieter and darker while preserving a slightly higher underlying pitch. Cannon playback pitch and gain tuning are retained. These are provisional listening adjustments.

Infantry muzzle flashes now originate from the animated rifle barrel tip, use a small elongated flash and remain visible for 85 ms. They reuse the existing instanced effect pool without point lights, and remain restricted to disclosed visual shots.

Stage multiple firefights opens the optional battles=multiple city configuration. The server and local roster generator find two additional separated, walkable six-infantry engagements with clear opposing firing lanes. Seed 732 stages 25 total units: the original six friendly infantry/tank versus six enemies plus two three-versus-three fights. Sites are at least 75 units apart; unsuitable sites are skipped rather than placing troops inside obstacles. All use normal authoritative targeting, damage, visibility and hearing, with no fabricated ambient shots. Main squad/West/East buttons focus sites; Restage firefights reloads a fresh paused scenario. This is simultaneous fighting inside one city, not a global campaign battle-event service. Existing default staging remains unchanged.

Focused validation: 10 audio and multi-battle tests pass, including real shots and casualties from both extra sites. Browser verified 13 friendlies/12 visible enemies at start, Sound enable, run/pause, and West/East focus. Full regression/build checks recorded below when complete.

Final shot-variation/multi-battle validation: 268/268 full regression tests pass; typecheck and production build pass. Fresh paused multi-battle seed 732 left open for listening. Visual barrel-tip attachment uses the animated rifle mesh transform. No auditory realism or frame-rate ceiling claim is inferred from automated checks.

Rifle distance-muffling follow-up (2026-09-11): rifle low-pass now falls more steeply (about 1.5 kHz at minimum stand-off, 385 Hz at 180 horizontal units, settling at 140 Hz far away). Existing rifle loudness/range/delay, cannon/impact mix, and voice budget are retained. Provisional listening tuning.
