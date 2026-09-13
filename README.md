# Ironfront

Ironfront is a Three.js strategy game built around one continuous, persistent battlefield. The default page opens the first Meridian campaign alpha; the city and country-sector pages are shared-system development harnesses.

## Start here

- [AGENTS.md](AGENTS.md): project onboarding and working rules.
- [PROJECT_STATE.md](PROJECT_STATE.md): implemented behavior, limitations, and next work.
- [docs/README.md](docs/README.md): design, systems, architecture, and decisions.
- [PRODUCT.md](PRODUCT.md): durable product direction.
- [DESIGN.md](DESIGN.md): the implemented interface and visual system.

## Run the proof

Node.js 24.13+ (or Node 25) is required for built-in SQLite. From this directory:

```sh
npm install
npm run dev
```

Open http://localhost:5173 and choose **Establish command**. New campaigns use version 3 of the full Meridian continent: 411,840 × 274,560 model units (approximately 750 × 500 km including sea), with 488 settlements/POIs, two metropolises, regional cities, satellite towns, industrial complexes, polygonal farmland and broad woodland. Buildings, soldiers and weapons keep their physical scale. Earlier campaigns show **Explore the new world**, which creates an independent command and retains the previous key under **Session**. Use **Places** to search cities, villages, facilities and natural landmarks; labels and route detail adapt to zoom. Additional scenic locations do not automatically create income/capture objectives. Select squads and right-click to move; right-drag sets facing, Shift queues orders, and Hold position stops autonomous repositioning. Double-click a unit card to focus it. Northfield stages opposing patrols at a farm. Enable **Sound** to hear the battlefield. **Whole map**, the minimap and **Territory** remain available for travel.

The server keeps simulating while the browser is closed. The browser restores the same alpha session automatically; copy its private key under **Session** for recovery. One commander controls Meridian against Crown forces in this first pass. Existing proof saves remain at http://localhost:5173/legacy.html. Alpha saves and generated geography use separate SQLite tables in the same database; existing worlds are not converted or erased.

```sh
npm test
npm run typecheck
npm run build
npm start
```

Production serves the built browser application and API together at http://localhost:3000. Local state is in `data/warfare.sqlite`; preserve that directory. See [hosting](docs/03-technical/self-hosting.md).

The current alpha integrates combat, vision, tactical feedback, land occupation, supplies and physical sandbags. Multiplayer joining, reinforcements, the wider economy and other emplacements are still pending. See the [integration record](docs/03-technical/campaign-alpha-integration.md) for the supported systems and remaining gaps. Balance and scale limits are provisional.

## Miniature city and Three.js development

`/country-slice.html` opens the isolated playable Meridian test sector. It shares tactical controls and presentation for development, but it is not a campaign destination or game mode. Campaign combat happens continuously on `/`; proven country-slice systems must be integrated directly into that persistent world.

The Three.js campaign is the default entry. The previous Pixi renderer remains archived at `/legacy.html`. The repository also includes these development studies:

- `/military-preview.html`: ten infantry-scaled military models with GLB export.
- `/city-diorama.html`: dense district city (160 buildings by default); select 28 for the crafted neighborhood.
- `/reference-preview.html`: crafted summer/winter art reference.
- `/three-preview.html`: generated-world comparison and performance tools.

Run `npm run dev` and open the desired entry on the Vite URL printed in the terminal. The preview pages are included in the production build, but their presence does not enable experimental gameplay. See the [miniature city roadmap](docs/04-roadmap/miniature-city-development.md) for current scope, ordered next work and validation criteria, and the [city study](docs/prototypes/large-city-diorama.md) for stage-specific measurements.

## Archived proof reference

The instructions below document the preceding abstract campaign proof, available through the archive. They are not the current alpha UI or acceptance suite. The new alpha is covered by `tests/campaign-battlefield.test.ts` and the integration record.

### Browser verification

With the production server running, install Playwright Chromium (`npx playwright install chromium`) and run `npm run test:browser`. Set `CHROMIUM_PATH` to reuse an installed compatible Chromium. The smoke flow creates disposable campaigns in the active local database and saves screenshots under `.impeccable/review/`. Use a separate `DB_PATH` when running it against a database you want to keep clean.

## Map controls

Campaigns open in a full-screen map at continent fit (100% zoom). Scroll the mouse wheel to zoom beneath the cursor; drag with the left, middle, or right button to pan. Click a region to inspect it in the left panel. Close that panel for more map space; use **Fit** to see the whole continent. Nation, Command, Dispatches, and Session all use the same left panel. Camera position survives automatic game updates.

With the server running, `node scripts/camera-smoke.mjs` verifies the camera and context-panel interactions. It accepts the same `CHROMIUM_PATH` override as the other browser test.

New campaigns use continental geography with forests, plains, highland passes, and impassable unowned mountains. Existing saves keep their original maps. See [continental geography](docs/02-systems/continental-geography.md). Run `node scripts/geography-smoke.mjs` for the current continent/terrain browser check.

For army/sector/persistence browser coverage, run `npm run test:fronts` against the running server. Set `FRONT_TEST_URL` for another local server and `CHROMIUM_PATH` for an installed Chromium. This creates a disposable normal-pace campaign.

Run `CHROMIUM_PATH=/usr/bin/chromium node --import tsx scripts/lobby-map-smoke.ts` against the development server to verify lobby regeneration and preview/campaign equality on desktop and phone. `LOBBY_TEST_URL` overrides the URL. This creates two disposable normal-pace campaigns.

New maps combine bundled real elevation samples with seeded deformation. See [terrain provenance](packages/game-core/src/data/README.md). `CHROMIUM_PATH=/usr/bin/chromium node --import tsx scripts/worldgen-review.ts` renders a six-seed diagnostic gallery under `.impeccable/review/`. The lobby chooses a random initial seed; enter a saved seed to reproduce its geography.

New maps now use 32 territories for four nations (eight per nation), with varied boundaries, settlement sizes and local terrain patches. Existing campaigns retain their saved map. Local features are currently geographic landmarks; combat and construction still operate at territory level.

The first server-resolved squad combat slice is live: standing army orders lead to persistent engagements, with live reinforcements, artillery and air support. Open **Nation → Active engagements** to focus a fight. **Command** shows squad activity and morale. `CHROMIUM_PATH=/usr/bin/chromium node --import tsx scripts/tactics-browser.ts` checks this flow against an isolated in-memory server after a production build. Details and current limits: [decision 009](docs/05-decisions/009-server-squad-combat.md).

Select your army marker or a visible formation, then right-click a territory to issue an order: friendly land moves/redeploys, hostile or neutral land advances, and its current region holds. Right-drag still pans. Army/territory hover cursors and the selection status identify what you are targeting. Touch users can use the Command panel.

Left-drag selects friendly armies; Shift-drag adds to the group. Use right/middle drag or WASD to pan (touch drag also pans). Escape clears selection. Right-click a friendly settlement at detail zoom or a fort marker for **Take cover**. The selected group receives the order; squads move into defensive positions near the site. Sandbags, trenches, and building interiors are not implemented yet.

For local positioning, zoom in and click an own squad (Shift-click adds squads), or use **Command → Squad positioning**. Right-click land in its current region to move; Shift-right-click queues a waypoint. **Hold position** stops it where it stands. Touch users can choose **Choose position on map**, then tap land; coordinates are also available for keyboard access. Hold a travelling army before positioning it locally. New army orders replace squad waypoints. `CHROMIUM_PATH=/usr/bin/chromium node --import tsx scripts/local-movement-browser.ts` verifies this against an isolated campaign after building.

Run `CHROMIUM_PATH=/usr/bin/chromium node --import tsx scripts/dev-map-smoke.ts` against Vite to verify development-mode map startup and regeneration. `DEV_TEST_URL` overrides port 5173. This read-only preview flow does not create campaigns.

New campaigns start each nation with two infantry squads (six soldiers each) and one mobile infantry squad (two vehicles), at its capital. Each squad has its own health and orders. Existing campaigns keep their original forces; create a new campaign for the 6/6/2 roster.

Newly generated maps include physical scrapyard, lake-crossing, and mountain-pass districts. Ground units use open lanes and bridge decks; solid edges provide nearby cover against fire from the opposite side. The selected squad displays a terrain-cover indicator. Existing campaigns retain their saved geography. See [physical region layouts](docs/05-decisions/030-physical-region-layouts.md).
