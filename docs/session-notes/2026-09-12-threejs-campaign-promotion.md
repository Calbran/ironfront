# Three.js campaign promotion — 2026-09-12

Promoted the existing live Three.js campaign adapter into the production campaign entry at `/`. Both the generated lobby preview and authenticated campaign map now use Three.js without a renderer toggle. The active campaign map component moved out of the experiments directory, and failure text no longer directs players back to Pixi.

The shared React campaign shell remains responsible for authentication, polling, command dispatch and panels. The campaign map itself is the persistent battlefield. The country slice remains isolated and is not linked from campaign commands.

`/legacy.html` explicitly requests a lazily loaded Pixi renderer. Repository instructions now forbid new features and parity work on that path. Current roadmap, stack, ownership and migration records were updated to make older Pixi-default statements historical.

TypeScript validation and the production build pass. Browser review confirms `/` loads the Three.js campaign and `/legacy.html` retains the archived Pixi view.
