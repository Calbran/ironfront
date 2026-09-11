import { countryTerrainNoise } from "./countryTerrainNoise";
import type { SlicePlan } from "./countrySlice";
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
type P = { x: number; z: number };
export type LandscapePlan = Pick<
  SlicePlan,
  "width" | "depth" | "surface" | "roads" | "rivers" | "sites"
>;
/** Broad connected woodland masses with irregular edges and occasional clearings. */
export const countryForestDensity = (x:number,z:number) =>
  countryTerrainNoise(x*.0035+91,z*.0035-47) +
  .3*countryTerrainNoise(x*.011-12,z*.011+62);
export const countryMeadowNoise = (x: number, z: number) =>
  countryTerrainNoise(x * 0.011, z * 0.011) +
  0.25 * countryTerrainNoise(x * 0.031 + 71, z * 0.031 - 39);

/** Seeded scenery shared by rendering and fire visibility; does not alter movement terrain. */
export function countryLandscapeSamples(plan: LandscapePlan) {
  const corridors = new Map<string, { a: P; b: P; width: number }[]>();
  const add = (a: P, b: P, width: number) => {
    for (
      let x = Math.floor((Math.min(a.x, b.x) - width) / 64);
      x <= Math.floor((Math.max(a.x, b.x) + width) / 64);
      x++
    )
      for (
        let z = Math.floor((Math.min(a.z, b.z) - width) / 64);
        z <= Math.floor((Math.max(a.z, b.z) + width) / 64);
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
  const allowed = (p: P) => {
    const s = plan.surface,
      i = Math.round(p.z / s.step) * s.cols + Math.round(p.x / s.step);
    if (
      !s.land[i] ||
      s.biomes[i] === 4 ||
      plan.sites.some(
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
  let seed = 48173;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const trees: P[] = [],
    shrubs: P[] = [],
    rocks: P[] = [],
    grass: P[] = [];
  const count = Math.min(32000, Math.ceil((plan.width * plan.depth) / 170));
  for (let i = 0; i < count; i++) {
    const p = {
      x: 4 + random() * (plan.width - 8),
      z: 4 + random() * (plan.depth - 8),
    };
    if (!allowed(p)) continue;
    const n = countryMeadowNoise(p.x, p.z);
    if (n > 0.2 && i % 4 === 0) shrubs.push(p);
    else if (n < -0.65 && i % 13 === 0) rocks.push(p);
    else grass.push(p);
  }
  // Jittered cells bound density and prevent clumps of coincident trunks.
  // The larger noise field forms forests, not isolated eight-tree set pieces.
  const spacing=4;
  for(let z=4;z<plan.depth-4;z+=spacing)for(let x=4;x<plan.width-4;x+=spacing){
    const p={x:x+(random()-.5)*spacing*.65,z:z+(random()-.5)*spacing*.65};
    if(countryForestDensity(p.x,p.z)<.12 || !allowed(p))continue;
    if(countryTerrainNoise(p.x*.035,p.z*.035)>.72)continue;
    trees.push(p);
  }
  return { trees, shrubs, rocks, grass };
}
