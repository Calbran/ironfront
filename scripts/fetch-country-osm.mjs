import fs from "node:fs";
import { fileURLToPath } from "node:url";
const places = [
  ["castle-combe", "Castle Combe", 51.4933, -2.2295],
  ["bibury", "Bibury", 51.7583, -1.8343],
  ["painswick", "Painswick", 51.7865, -2.1947],
];
const root = fileURLToPath(
  new URL("../apps/web/public/data/country-osm", import.meta.url),
);
fs.mkdirSync(root, { recursive: true });
for (const [id, name, lat, lon] of places) {
  const dest = root + "/" + id + ".json";
  if (fs.existsSync(dest)) {
    console.log(id + " cached");
    continue;
  }
  const bbox = [lat - 0.006, lon - 0.0095, lat + 0.006, lon + 0.0095].join(",");
  const query =
    "[out:json][timeout:25];(way[highway](" +
    bbox +
    ");way[building](" +
    bbox +
    ");way[waterway](" +
    bbox +
    "););out geom;";
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(45000),
    headers: { "User-Agent": "Ironfront-layout-study/0.1" },
  });
  if (!response.ok) throw Error(id + ": HTTP " + response.status);
  const raw = await response.json();
  if (raw.remark) throw Error(raw.remark);
  const elements = raw.elements
    .filter((e) => e.type === "way" && e.geometry?.length > 1)
    .map((e) => ({
      type: "way",
      id: e.id,
      tags: Object.fromEntries(
        Object.entries(e.tags ?? {}).filter(([k]) =>
          [
            "highway",
            "building",
            "waterway",
            "bridge",
            "tunnel",
            "access",
          ].includes(k),
        ),
      ),
      geometry: e.geometry,
    }));
  fs.writeFileSync(
    dest,
    JSON.stringify({
      name,
      center: { lat, lon },
      bounds: [lat - 0.006, lon - 0.0095, lat + 0.006, lon + 0.0095],
      source: "https://www.openstreetmap.org",
      license: "ODbL-1.0",
      attribution: "© OpenStreetMap contributors",
      retrieved: new Date().toISOString(),
      query,
      elements,
    }),
  );
  console.log(
    id +
      ": " +
      elements.length +
      " ways, " +
      elements.filter((e) => e.tags.building).length +
      " buildings",
  );
}
