# 042 — City seed gallery

## Accepted direction

Compare generated city seeds and expose consistency problems before expanding the generator further. The user approved a seed review tool.

## Shipped behavior

`/city-seeds.html` renders twelve consecutive seeds sequentially with a shared renderer, fixed daylight overview/detail views, geometry flags, count/relief/timing metrics and JSON export. Cards reopen the exact seed and case in the diorama. Cases cover 28/128/256-building flat studies and combined, tight-bend and steep terrain. Terrain profiles remain selectable when varying seeds.

Pure audits check building overlap, street collision, blocked access, bank clearance, road connectivity and foundation relief. `node --import tsx scripts/city-seed-audit.ts report.json` audits 72 cases. The dated report in `docs/prototypes/city-seed-audit-2026-09-10.json` records zero flags for seeds 731–742.

## Provisional tuning and limits

Twelve previews, bend amplitude/frequency and threefold slope stress are study settings. Counts rejected by fitting are reported separately from failures. Passing geometry checks does not certify rendered surfaces, artistic quality, performance or arbitrary geography. Seed variants still share an authored street framework. Generation timings exclude audit and rendering and are machine-specific.
