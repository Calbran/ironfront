import { buildMiniatureData } from "../apps/web/src/experiments/buildMiniatureData.ts";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const results = [];
for (const [seed,seats] of [["Meridian",4],["Atlas",4],["Meridian",8]] as const) {
  const data = buildMiniatureData(seed,undefined,seats),
    again = buildMiniatureData(seed,undefined,seats);
  const fingerprint = (d: typeof data) =>
    createHash("sha256")
      .update(JSON.stringify({ ...d, generatedMs: 0, timings: {} }))
      .digest("hex");
  assert.equal(fingerprint(data), fingerprint(again));
  const town = data.cities.find((c) => c.feature.id === data.studyCityId);
  assert(town && town.layout.buildings.length >= 4);
  results.push({
    seed,seats,
    regions: data.world.regions.length,
    settlements: data.cities.length,
    town: town.feature.name,
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
