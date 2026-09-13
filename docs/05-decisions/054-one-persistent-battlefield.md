# 054 — One persistent battlefield

Status: accepted, 2026-09-12.

The campaign is the battlefield. Units remain in the continuous Three.js world while they travel, detect enemies, seek cover, fire, take damage, retreat and die. Combat begins from simulation conditions and player orders; there is no launch-battle button, encounter page, isolated event section or result-import step.

`/country-slice.html` is a small, isolated development harness. It exists to test movement, combat, audio, effects, cover, visibility and performance with controlled fixtures. A feature proven there is unfinished until its shared owner and campaign adapter make it work in the production campaign at `/`. The harness must not hold campaign squad identity, lock campaign units or mutate campaign outcomes.

The server remains authoritative. One campaign simulation owns unit state, visibility, targeting, damage, terrain interaction and persistence. The client may interpolate presentation between snapshots but may not create a second battle state. Detailed areas should stream around the camera and active forces while distant battles continue through cheaper simulation and presentation levels inside the same world.

This supersedes the unshipped campaign-local battle lifecycle proposal recorded as decision 052. That code and its launch/resume UI were removed before publication.
