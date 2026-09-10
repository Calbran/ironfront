/** Convert a saved Overpass out-geom response. Never fetched during gameplay. */
import { readFile, writeFile } from "node:fs/promises";
const source = JSON.parse(
  await readFile(process.argv[2] ?? "/private/tmp/ancoats-osm.json", "utf8"),
);
const center = { lat: 53.4835, lon: -2.23 };
const project = (p: { lat: number; lon: number }) => ({
  x: +(
    ((p.lon - center.lon) * Math.cos((center.lat * Math.PI) / 180) * 111320) /
    300
  ).toFixed(5),
  z: +((-(p.lat - center.lat) * 111320) / 300).toFixed(5),
});
const roads = [],
  waterways = [];
for (const way of source.elements) {
  const tags = way.tags ?? {};
  if (!way.geometry || tags.area === "yes") continue;
  const points = way.geometry.map(project);
  const segments = [];
  let run = [];
  // Save only local consecutive vertices; never connect across an omitted section.
  for (const p of points) {
    if (Math.abs(p.x) <= 1.15 && Math.abs(p.z) <= 1.15) run.push(p);
    else {
      if (run.length > 1) segments.push(run);
      run = [];
    }
  }
  if (run.length > 1) segments.push(run);
  for (const points of segments) {
    if (
      tags.highway &&
      ![
        "motorway",
        "motorway_link",
        "trunk",
        "trunk_link",
        "construction",
      ].includes(tags.highway) &&
      tags.service !== "parking_aisle"
    )
      roads.push({ id: way.id, kind: tags.highway, points });
    if (["canal", "river"].includes(tags.waterway))
      waterways.push({ id: way.id, points });
  }
}
const data = {
  name: "Ancoats, Manchester",
  source: "https://www.openstreetmap.org/#map=16/53.482/-2.2275",
  attribution: "© OpenStreetMap contributors",
  license: "ODbL-1.0",
  retrieved: new Date().toISOString(),
  queryBounds: [53.477, -2.236, 53.487, -2.219],
  center,
  normalizationMeters: 300,
  roads,
  waterways,
};
await writeFile(
  "packages/game-core/data/city-samples/ancoats.ts",
  "// Derived OpenStreetMap database, ODbL-1.0. See README.md in this directory.\nexport const ancoatsSample = " +
    JSON.stringify(data) +
    ";\n",
);
console.log({ roads: roads.length, waterways: waterways.length });
