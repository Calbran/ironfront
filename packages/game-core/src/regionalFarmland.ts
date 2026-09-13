import type { World } from "./index";
import { onLocalLand } from "./localMovement";
import { countryTerrainNoise } from "./countryTerrainNoise";
import type {
  FarmDistrict,
  RuralField,
  RuralReserve,
} from "./pacingCountryside";
import { terrainHeight, type TerrainSurface } from "./connectedTerrain";
import type { CountryRoadNetwork } from "./countryRoadNetwork";
const fieldIndexes = new WeakMap<
  readonly RuralField[],
  Map<string, RuralField[]>
>();
export function ruralFieldAt(
  fields: readonly RuralField[],
  x: number,
  z: number,
) {
  let index = fieldIndexes.get(fields);
  if (!index) {
    index = new Map();
    for (const f of fields)
      for (
        let cx = Math.floor((f.x - f.width / 2) / 2048);
        cx <= Math.floor((f.x + f.width / 2) / 2048);
        cx++
      )
        for (
          let cz = Math.floor((f.y - f.depth / 2) / 2048);
          cz <= Math.floor((f.y + f.depth / 2) / 2048);
          cz++
        ) {
          const key = `${cx}:${cz}`,
            list = index.get(key) ?? [];
          list.push(f);
          index.set(key, list);
        }
    fieldIndexes.set(fields, index);
  }
  return (
    index.get(`${Math.floor(x / 2048)}:${Math.floor(z / 2048)}`) ?? []
  ).some((f) => ruralFieldContains(f, x, z));
}

/** Field polygons use local physical offsets; their centers use the caller's geography units. */
export function ruralFieldContains(f: RuralField, x: number, z: number) {
  const dx = x - f.x,
    dz = z - f.y;
  if (Math.abs(dx) > f.width / 2 || Math.abs(dz) > f.depth / 2) return false;
  if (!f.polygon) return true;
  let inside = false;
  for (let i = 0, j = f.polygon.length - 1; i < f.polygon.length; j = i++) {
    const a = f.polygon[i],
      b = f.polygon[j];
    if (
      a.z > dz !== b.z > dz &&
      dx < ((b.x - a.x) * (dz - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function generateRegionalFarmland(
  world: World,
  scale: number,
  reserves: readonly RuralReserve[],
  surface?: TerrainSurface,
  roads?: CountryRoadNetwork,
): FarmDistrict[] {
  let seed = 732;
  for (const c of world.seed)
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const result: FarmDistrict[] = [];
  const rivers = (world.geography?.rivers ?? []).flatMap((r) =>
    r.slice(1).map((b, i) => ({ a: r[i], b })),
  );
  for (const region of world.regions) {
    if (region.terrain !== "plains") continue;
    const fields: RuralField[] = [],
      reach = Math.sqrt(region.area) * 0.6,
      cell = 380 + random() * 260;
    let angle = random() * Math.PI,
      best = Infinity;
    // District field orientation follows the nearest established route with modest local variation.
    for (const road of roads?.roads ?? [])
      for (let i = 1; i < road.path.length; i++) {
        const a = road.path[i - 1],
          b = road.path[i],
          d = Math.hypot(
            (a.x + b.x) / 2 - region.x * scale,
            (a.y + b.y) / 2 - region.y * scale,
          );
        if (d < best) {
          best = d;
          angle = Math.atan2(b.y - a.y, b.x - a.x);
        }
      }
    angle += (random() - 0.5) * 0.18;
    const c = Math.cos(angle),
      s = Math.sin(angle);
    const transform = (u: number, v: number) => ({
      x: region.x + (u * c - v * s) / scale,
      y: region.y + (u * s + v * c) / scale,
    });
    const n = Math.min(38, Math.ceil((reach * scale) / cell));
    // Shared jittered corners create adjoining parcels; regional masks break up their outer boundary.
    const vertex = (u: number, v: number) => ({
      x:
        u * cell +
        countryTerrainNoise(u * 0.7 + region.x, v * 0.7) * cell * 0.25,
      z:
        v * cell +
        countryTerrainNoise(u * 0.7, v * 0.7 + region.y) * cell * 0.25,
    });
    for (let row = -n; row < n; row++)
      for (let col = -n; col < n; col++) {
        const center = transform((col + 0.5) * cell, (row + 0.5) * cell);
        const suitability = countryTerrainNoise(
          center.x * 0.012,
          center.y * 0.012,
        );
        if (suitability < -0.23 || random() < 0.06) continue;
        const vertices = [
          vertex(col, row),
          vertex(col + 1, row),
          vertex(col + 1, row + 1),
          vertex(col, row + 1),
        ].map((v) => transform(v.x, v.z));
        if (
          ![center, ...vertices].every((p) => onLocalLand(region, p, "ground"))
        )
          continue;
        if (surface) {
          const heights = [center, ...vertices].map((p) =>
            terrainHeight(surface, p.x * scale, p.y * scale),
          );
          if ((Math.max(...heights) - Math.min(...heights)) / cell > 0.07)
            continue;
        }
        const radius = cell / scale;
        if (
          reserves.some(
            (r) =>
              Math.hypot(r.x - center.x, r.y - center.y) < r.radius + radius,
          )
        )
          continue;
        if (
          rivers.some(({ a, b }) => {
            const dx = b[0] - a[0],
              dy = b[1] - a[1],
              t = Math.max(
                0,
                Math.min(
                  1,
                  ((center.x - a[0]) * dx + (center.y - a[1]) * dy) /
                    (dx * dx + dy * dy || 1),
                ),
              );
            return (
              Math.hypot(center.x - a[0] - dx * t, center.y - a[1] - dy * t) <
              radius + 25 / scale
            );
          })
        )
          continue;
        const polygon = vertices.map((v) => ({
          x: (v.x - center.x) * scale * 0.965,
          z: (v.y - center.y) * scale * 0.965,
        }));
        fields.push({
          ...center,
          width: Math.max(...polygon.map((v) => Math.abs(v.x))) * 2,
          depth: Math.max(...polygon.map((v) => Math.abs(v.z))) * 2,
          polygon,
          crop:
            Math.floor(
              (countryTerrainNoise(center.x * 0.06, center.y * 0.06) + 1) * 2.5,
            ) % 6,
        });
      }
    if (fields.length)
      result.push({
        id: `regional-${region.id}`,
        name: `${region.name} countryside`,
        x: region.x,
        y: region.y,
        extent: reach * scale,
        fields,
      });
  }
  return result;
}
