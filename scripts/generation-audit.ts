import { buildingsOverlap } from "../packages/game-core/src/cityLayout";
import { buildMiniatureData } from "../apps/web/src/experiments/buildMiniatureData.ts";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const results = [];
for (const [seed, seats] of [
  ["Meridian", 4],
  ["Atlas", 4],
  ["Meridian", 8],
] as const) {
  const data = buildMiniatureData(seed, undefined, seats),
    again = buildMiniatureData(seed, undefined, seats);
  const fingerprint = (d: typeof data) =>
    createHash("sha256")
      .update(JSON.stringify({ ...d, generatedMs: 0, timings: {} }))
      .digest("hex");
  assert.equal(fingerprint(data), fingerprint(again));
  const town = data.cities.find((c) => c.feature.id === data.studyCityId);
  assert(town && town.layout.buildings.length >= 4);
  const planned = data.cities.filter((c) => "pattern" in c.layout);
  for (let i = 0; i < planned.length; i++)
    for (const other of planned.slice(i + 1))
      for (const a of planned[i].layout.buildings)
        for (const b of other.layout.buildings)
          assert(
            !buildingsOverlap(
              { ...a, width: 54, height: 54 },
              { ...b, width: 54, height: 54 },
            ),
            "Adjacent planned towns overlap",
          );
  results.push({
    seed,
    seats,
    regions: data.world.regions.length,
    settlements: data.cities.length,
    town: town.feature.name,
    townSummary: data.townSummary,
    buildings: town.layout.buildings.length,
    streets: town.layout.roads.length,
    totalMs: data.generatedMs,
    timings: data.timings,
    repeatTotalMs: again.generatedMs,
    deterministic: true,
  });
}
await writeFile(
  "/private/tmp/ironfront-generation/results.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
