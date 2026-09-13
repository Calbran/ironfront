# Full scale-test campaign — 2026-09-12

## Mountain material follow-up

Campaign mountains previously inherited the lowland ground palette and differed mainly through relief and cross-hatching. The shared country/campaign terrain shader now consumes the authoritative mountain-weight lattice and blends vegetated foothills into exposed warm/cool rock, slope-weighted scree and subtle elevation strata. Procedural samples cross-fade with the same power-of-two zoom scale as strategic hatching, retaining world anchoring without adding textures, geometry or draw calls. Typecheck, production build, focused renderer/camera tests and the full campaign browser interaction check passed with zero browser errors. The campaign overview confirms that the mountain belt now separates visibly from the lowland palette.

## Strategic cross-hatching follow-up

The full-continent camera exceeded the country shader's fixed 5,500-unit ink cutoff, so campaign terrain never displayed the established cross-hatch shading. The shared country/campaign scene now keeps campaign ink active and cross-fades between world-anchored power-of-two line scales as camera distance changes. This preserves readable strokes at strategic zoom without subpixel moiré; the bounded country test retains its original distance fade. Typecheck, production build, focused campaign/camera tests, and the full campaign browser interaction check passed with no browser errors. The overview screenshot confirms the hatch is visible across shaded continental slopes.

## Implemented

- New geography version 2 uses the real Meridian world from createPacingStudy and the shared 14.3 logical-to-physical conversion. Dimensions: 411,840 × 274,560 model units, including sea. Generated 382 settlements/POIs, 1,937 fields, 675 road sections; 342 places have generated road connections and 40 lack a safe connection.
- The existing detailed city plan is anchored at Windwick. Other settlements use seeded reusable town/POI plans and physical obstacles. No local model, weapon range or movement speed is inflated with the country.
- Shared forest samples now support bounded tiles. Rendering retains at most 25 tiles; a 128-tile CPU LRU can regenerate any tile deterministically. Visibility/cover sample the same trees independently of camera position. Continental movement combines existing local navigation with a safe road graph.
- Version-1 saves retain their original geography. New starts use version 2; the toolbar offers the full continent to old sessions and retains previous keys under Session. No existing saves were erased.
- Profiling found cover checks scanning all world obstacles and repeated site lookups inside occupation checks. Added an immutable-plan obstacle index and bounded local queries. The full-map interaction test also reproduced negative animation-frame indexing: a newly received snapshot could be later than the pending frame timestamp. Fixed shared interpolation clamping and signed animation phase wrapping.

## Validation

The complete suite passed 354/354 tests. The subsequent shared animation correction passed 13 focused presentation/motion/idle tests; typecheck and production build passed. Full-map tests cover shared physical scale, sea masks, tile determinism after eviction, road detours around narrow cover, refusal to cross disconnected water, actual headquarters-to-country orders, continuous combat and mixed geography-version restoration.

The reproducible browser check is: node --import tsx scripts/campaign-alpha-browser.mjs --massive. Artifacts are in .impeccable/review/massive-campaign. The final full-map browser run passed right-click movement, physical sandbag construction, save/reload, hidden-enemy filtering and the 800px layout with zero browser errors. Its 120 authoritative ticks measured median 3.88 ms, p95 5.67 ms and maximum 30.27 ms; the four-second close-city frame sample measured median 6.1 ms and p95 6.2 ms. These are local headless-Chrome samples with the existing 64-individual roster. Whole-map label clipping was corrected after the compact-window check exposed horizontal overflow. The actual frontend proxy at 5173 was checked: new command creation returned 200, geography version 2 exceeded 400,000 model units in width, and the battlefield canvas/controls rendered without browser errors. Only the disposable live verification command was removed using its new token hash plus creation timestamp.

## Remaining work

The world terrain is a coarse lattice with flat reserved settlement pads; high-resolution terrain/coast streaming remains unfinished. Forty places currently lack generated road connections. Town/POI generators fill other settlements, rather than every city receiving the headquarters' complete district generator. Farm plots reuse the scale-study parcels and still need more organic regional composition. The fixed 64-individual starting roster is an integration test, not a fully populated continent. Recruitment, strategic AI, multiplayer, full logistics and simulation tiers remain pending. Frame/tick measurements are local short samples, not a validated 1k/2k-unit ceiling.

Final consumer compatibility check: the country preview deployed and ran its encounter, and the citywide diorama loaded successfully, with zero browser errors. Both continue to use the shared tactical presentation owners.
