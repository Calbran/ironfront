import { countryTerrainNoise } from "./countryTerrainNoise";
import { ruralFieldContains } from "./regionalFarmland";
import type { SlicePlan } from "./countrySlice";
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
type P = { x: number; z: number };
export type LandscapePlan = Pick<
  SlicePlan,
  "width" | "depth" | "surface" | "roads" | "rivers" | "sites" | "campaignMap"
>;
/** Broad connected woodland masses with irregular edges and occasional clearings. */
export const countryForestDensity = (x: number, z: number, regional = false) =>
  regional
    ? countryTerrainNoise(x * 0.00012 + 91, z * 0.00012 - 47) +
      0.25 * countryTerrainNoise(x * 0.00065 - 12, z * 0.00065 + 62) +
      0.08 * countryTerrainNoise(x * 0.011, z * 0.011)
    : countryTerrainNoise(x * 0.0035 + 91, z * 0.0035 - 47) +
      0.3 * countryTerrainNoise(x * 0.011 - 12, z * 0.011 + 62);
export const countryMeadowNoise = (x: number, z: number) =>
  countryTerrainNoise(x * 0.011, z * 0.011) +
  0.25 * countryTerrainNoise(x * 0.031 + 71, z * 0.031 - 39);

/** Seeded landscape shared by rendering, fire visibility and broad vehicle movement. */
export type LandscapeSamples = {
  trees: P[];
  shrubs: P[];
  rocks: P[];
  grass: P[];
};
const landscapeSamples = new WeakMap<LandscapePlan, LandscapeSamples>();
/** Geography is immutable after generation. Dynamic emplacements are not landscape inputs. */
export function countryLandscapeSamples(
  plan: LandscapePlan,
  bounds?: { x: number; z: number; width: number; depth: number },
) {
  if (plan.campaignMap && !bounds)
    throw Error("Continental landscape requires a bounded tile");
  const x0 = bounds?.x ?? 0,
    z0 = bounds?.z ?? 0,
    width = bounds?.width ?? plan.width,
    depth = bounds?.depth ?? plan.depth;
  const cached = landscapeSamples.get(plan);
  if (cached && !bounds) return cached;
  const corridors = new Map<string, { a: P; b: P; width: number }[]>();
  const add = (a: P, b: P, width: number) => {
    for (
      let x = Math.max(
        Math.floor(x0 / 64),
        Math.floor((Math.min(a.x, b.x) - width) / 64),
      );
      x <=
      Math.min(
        Math.floor((x0 + (bounds?.width ?? plan.width)) / 64),
        Math.floor((Math.max(a.x, b.x) + width) / 64),
      );
      x++
    )
      for (
        let z = Math.max(
          Math.floor(z0 / 64),
          Math.floor((Math.min(a.z, b.z) - width) / 64),
        );
        z <=
        Math.min(
          Math.floor((z0 + (bounds?.depth ?? plan.depth)) / 64),
          Math.floor((Math.max(a.z, b.z) + width) / 64),
        );
        z++
      ) {
        const key = `${x}:${z}`,
          list = corridors.get(key) ?? [];
        list.push({ a, b, width });
        corridors.set(key, list);
      }
  };
  for (const r of plan.roads.roads)
    for (let i = 1; i < r.path.length; i++)
      add(
        { x: r.path[i - 1].x, z: r.path[i - 1].y },
        { x: r.path[i].x, z: r.path[i].y },
        r.width / 2 + 5,
      );
  for (const r of plan.rivers)
    for (let i = 1; i < r.length; i++) add(r[i - 1], r[i], 22);
  const sites = plan.sites.filter(
    (s) =>
      s.x + s.extent + 8 >= x0 &&
      s.x - s.extent - 8 <= x0 + width &&
      s.z + s.extent + 8 >= z0 &&
      s.z - s.extent - 8 <= z0 + depth,
  );
  const fields = (plan.campaignMap?.fields ?? []).filter(
    (f) =>
      f.x + f.width / 2 >= x0 &&
      f.x - f.width / 2 <= x0 + width &&
      f.y + f.depth / 2 >= z0 &&
      f.y - f.depth / 2 <= z0 + depth,
  );
  const allowed = (p: P) => {
    if (
      p.x < 0 ||
      p.z < 0 ||
      p.x > plan.width ||
      p.z > plan.depth ||
      fields.some((f) => ruralFieldContains(f, p.x, p.z))
    )
      return false;
    const s = plan.surface,
      i = Math.round(p.z / s.step) * s.cols + Math.round(p.x / s.step);
    if (
      !s.land[i] ||
      s.biomes[i] === 4 ||
      sites.some(
        (site) => Math.hypot(p.x - site.x, p.z - site.z) < site.extent + 8,
      )
    )
      return false;
    return !(
      corridors.get(`${Math.floor(p.x / 64)}:${Math.floor(p.z / 64)}`) ?? []
    ).some(({ a, b, width }) => {
      const dx = b.x - a.x,
        dz = b.z - a.z,
        t = clamp(
          ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1),
          0,
          1,
        );
      return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) < width;
    });
  };
  let seed = 48173 ^ Math.imul(x0, 73856093) ^ Math.imul(z0, 19349663);
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const trees: P[] = [],
    shrubs: P[] = [],
    rocks: P[] = [],
    grass: P[] = [];
  const count = Math.min(32000, Math.ceil((width * depth) / 170));
  for (let i = 0; i < count; i++) {
    const p = {
      x: x0 + 4 + random() * (width - 8),
      z: z0 + 4 + random() * (depth - 8),
    };
    if (!allowed(p)) continue;
    const n = countryMeadowNoise(p.x, p.z);
    if (n > 0.2 && i % 4 === 0) shrubs.push(p);
    else if (n < -0.65 && i % 13 === 0) rocks.push(p);
    else grass.push(p);
  }
  // Jittered cells bound density and prevent clumps of coincident trunks.
  // The larger noise field forms forests, not isolated eight-tree set pieces.
  const spacing = 4;
  for (let z = bounds ? z0 : 4; z < z0 + depth - (bounds ? 0 : 4); z += spacing)
    for (
      let x = bounds ? x0 : 4;
      x < x0 + width - (bounds ? 0 : 4);
      x += spacing
    ) {
      const p = {
        x: x + (random() - 0.5) * spacing * 0.65,
        z: z + (random() - 0.5) * spacing * 0.65,
      };
      if (
        countryForestDensity(p.x, p.z, plan.campaignMap?.version === 3) <
          0.12 ||
        !allowed(p)
      )
        continue;
      if (countryTerrainNoise(p.x * 0.035, p.z * 0.035) > 0.72) continue;
      trees.push(p);
    }
  const samples = { trees, shrubs, rocks, grass };
  if (!bounds) landscapeSamples.set(plan, samples);
  return samples;
}

export const LANDSCAPE_TILE_SIZE = 160;
const tileCache = new WeakMap<LandscapePlan, Map<string, LandscapeSamples>>();
/** Bounded CPU residency. A tile always regenerates identically, independent of camera or units. */
export function countryLandscapeTile(
  plan: LandscapePlan,
  x: number,
  z: number,
) {
  let cache = tileCache.get(plan);
  if (!cache) {
    cache = new Map();
    tileCache.set(plan, cache);
  }
  const key = x + ":" + z,
    old = cache.get(key);
  if (old) {
    cache.delete(key);
    cache.set(key, old);
    return old;
  }
  const samples = countryLandscapeSamples(plan, {
    x: x * 160,
    z: z * 160,
    width: 160,
    depth: 160,
  });
  cache.set(key, samples);
  if (cache.size > 128) cache.delete(cache.keys().next().value!);
  return samples;
}
export function countryTreesNear(plan: LandscapePlan, p: P, radius: number) {
  const trees: P[] = [];
  for (
    let z = Math.floor((p.z - radius) / 160);
    z <= Math.floor((p.z + radius) / 160);
    z++
  )
    for (
      let x = Math.floor((p.x - radius) / 160);
      x <= Math.floor((p.x + radius) / 160);
      x++
    )
      for (const t of countryLandscapeTile(plan, x, z).trees)
        if (Math.hypot(t.x - p.x, t.z - p.z) <= radius) trees.push(t);
  return trees;
}
