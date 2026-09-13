# Three.js miniature-world experiment

Status: historical experiment, promoted to the production renderer on 2026-09-12. The original limitations below describe the experiment at that time; current live/city work is tracked in PROJECT_STATE.md and the consolidated roadmap. Pixi is retired to `/legacy.html`.

Branch: `codex/threejs-miniatures`. Baseline commit `9c476dc` snapshots the current infantry and jeep work from the original checkout without modifying those files there. The experimental worktree is `/private/tmp/ironfront-threejs-experiment`.

## Run

Run `npm install` if dependencies are absent, then `npm run dev -- --host 127.0.0.1 --port 5187` and open `/three-preview.html`. The regular game remains at `/`. Production build includes both entries. The local worktree currently shares the original node_modules through an ignored symlink.

## Initial experiment (historical baseline)

- Existing seeded world generator, geography, shared map contours, settlement layouts, roads and scenery placements drive a standalone Three.js view.
- The same generated world object can be inspected in the existing Pixi renderer.
- Fixed orthographic isometric camera with mouse/touch pan and zoom, settlement selection, continent/town/ground presets, political borders and rendering counters.
- Instanced building volumes and trees; existing infantry model and jeep at generated roster positions. Building sprites and ground textures can be restored for direct comparison.
- Muted plain ground by default; winter palette changes ground, foliage, roof and lighting colors. This is not a new gameplay biome.
- Mouse left-drag selects friendly generated armies; Shift adds and Escape clears. Right/middle-drag, touch drag and WASD pan. A keyboard/touch roster focuses and selects armies. Strategy mode shows ownership and connected-holding labels, hides tactical detail and preserves selection/camera.
- Worker generation, renderer cleanup, asynchronous artwork loading and responsive controls. No campaign API calls or persistence writes.

## Initial limits and migration path (see current roadmap)

This is an adapter demonstration, not visual parity with the existing map or concept B. Terrain is flat beneath rocks; farmland, docks and several existing decorations are not yet represented. Buildings are intentionally generic volumes. Sprite billboards do not reproduce the depth and lighting of models. Terrain-patch edges retain the current generated contours. Optional walk animation is stationary preview motion; campaign movement and cover commands are not connected. Selection references generated army IDs from the first nation perspective.

Before adopting Three.js: develop one representative art-quality town and surrounding terrain, implement continuous height/biome blending, preserve cover metadata and coordinate conversion, benchmark a populated campaign at continent and tactical scales, and integrate authoritative selection/orders through the existing client boundary. No simulation rewrite is required by this experiment. Keep Pixi available until visual, interaction and performance comparisons justify replacement.

## Validation

Typecheck and production build passed (build reports large-chunk warnings). All 106 existing tests passed. `scripts/three-preview-browser.ts` verifies desktop/mobile rendering, camera presets, box/additive selection, Escape, strategy switching, pan inputs, snow/sprite controls, switching renderers, seed regeneration and horizontal overflow; zero page errors. It uses locally installed Chrome and saves screenshots to `/private/tmp/ironfront-threejs-review`. It is a visual smoke check, not a production performance benchmark. Local sampled town rendering after warmup was around 59–60 FPS; results depend on view, machine and browser.

Next proposed art pass: [crafted miniature reference scene](miniature-art-roadmap.md).

Current scope and next steps: [miniature city roadmap](../04-roadmap/miniature-city-development.md). Temporary worktree paths above record development history; normal clones can run the checked-in preview entries.
