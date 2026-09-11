import { readFileSync } from "node:fs";
import {
  generateOSMCountryPOI,
  parseOSMSample,
} from "../packages/game-core/src/countryOSM";
for (const name of ["castle-combe", "bibury", "painswick"]) {
  const data = parseOSMSample(
    JSON.parse(
      readFileSync(
        "apps/web/public/data/country-osm/" + name + ".json",
        "utf8",
      ),
    ),
  );
  for (const density of [0.35, 0.7, 1]) {
    const start = performance.now(),
      p = generateOSMCountryPOI(data, 732, "estate", density);
    console.log(
      JSON.stringify({
        name,
        density,
        buildings: p.buildings.length,
        roadSegments: p.roads.length,
        obstacles: p.obstacles.length,
        generationMs: Math.round((performance.now() - start) * 10) / 10,
      }),
    );
  }
}
