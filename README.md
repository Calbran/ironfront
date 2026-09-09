# Ironfront

A lightweight asynchronous browser conquest game. Develop a nation, give standing orders, and return to a changing front. 

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

Open http://localhost:5173. Create a campaign, select a faction, and share its invite code with another browser. Empty seats act as simple automated opponents until claimed. Each campaign can run at a test pace (one simulated hour every 10 seconds) or normal pace (one hour per real hour). The host can advance one hour in test campaigns.

```sh
npm test
npm run typecheck
npm run build
npm start
```

Production serves the built browser application and API together at http://localhost:3000. Local state is in `data/warfare.sqlite`; preserve that directory. See [hosting](docs/03-technical/self-hosting.md).

This is an early persistent multiplayer proof, not the complete game. Authentication uses private bearer session keys, not recoverable accounts. Treat invite codes as playtest invitations and save your session key before changing devices.

## Browser verification

With the production server running, install Playwright Chromium (`npx playwright install chromium`) and run `npm run test:browser`. Set `CHROMIUM_PATH` to reuse an installed compatible Chromium. The smoke flow creates disposable campaigns in the active local database and saves screenshots under `.impeccable/review/`. Use a separate `DB_PATH` when running it against a database you want to keep clean.

## Map controls

Campaigns open in a full-screen map at continent fit (100% zoom). Scroll the mouse wheel to zoom beneath the cursor; drag with the left, middle, or right button to pan. Click a region to inspect it in the left panel. Close that panel for more map space; use **Fit** to see the whole continent. Nation, Command, Dispatches, and Session all use the same left panel. Camera position survives automatic game updates.

With the server running, `node scripts/camera-smoke.mjs` verifies the camera and context-panel interactions. It accepts the same `CHROMIUM_PATH` override as the other browser test.

New campaigns use continental geography with forests, plains, highland passes, and impassable unowned mountains. Existing saves keep their original maps. See [continental geography](docs/02-systems/continental-geography.md). Run `node scripts/geography-smoke.mjs` for the current continent/terrain browser check.

For army/sector/persistence browser coverage, run `npm run test:fronts` against the running server. Set `FRONT_TEST_URL` for another local server and `CHROMIUM_PATH` for an installed Chromium. This creates a disposable normal-pace campaign.
