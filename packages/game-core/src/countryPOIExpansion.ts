import { generateNaturalCountryPOI } from "./countryNaturalLayout";
import type { CountryPOI, POIField } from "./countryPOI";
export type CountryPOISize = "site" | "estate" | "district";
type Point = { x: number; z: number };
/** Expand land and content, never the dimensions of buildings or tactical cover. */
export function expandCountryPOI(
  base: CountryPOI,
  size: CountryPOISize,
): CountryPOI {
  const level = { site: 0, estate: 1, district: 2 }[size];
  if (level === undefined) throw Error("Unknown country size");
  const farm = base.fields.length > 0;
  if (!farm) return generateNaturalCountryPOI(base.kind, base.seed, size);
  const extent = [160, 320, 640][level],
    target = [14, 32, 72][level];
  const result: CountryPOI = {
    ...base,
    extent,
    fields: [],
    trees: [],
    roads: [{ x: 0, z: 0, width: extent * 2, depth: 7 }],
    entrances: [
      { x: -extent, z: 0 },
      { x: extent, z: 0 },
    ],
    props: [...base.props],
    obstacles: [...base.obstacles],
  };
  // Keep the farmyard clear; subdivide the surrounding land into shared irregular boundaries.
  let state = base.seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const mix = (a: Point, b: Point, t: number): Point => ({
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
  });
  const area = (p: Point[]) =>
    Math.abs(
      p.reduce((s, a, i) => {
        const b = p[(i + 1) % p.length];
        return s + a.x * b.z - b.x * a.z;
      }, 0),
    ) / 2;
  const parcels: Point[][] = [];
  for (const side of [-1, 1]) {
    const a = side < 0 ? -extent + 5 : 18,
      b = side < 0 ? -18 : extent - 5;
    parcels.push([
      { x: -extent + 5, z: a },
      { x: extent - 5, z: a },
      { x: extent - 5, z: b },
      { x: -extent + 5, z: b },
    ]);
  }
  while (parcels.length < target) {
    let index = 0;
    for (let i = 1; i < parcels.length; i++)
      if (area(parcels[i]) > area(parcels[index])) index = i;
    let [a, b, c, d] = parcels.splice(index, 1)[0];
    if (Math.hypot(b.x - a.x, b.z - a.z) < Math.hypot(d.x - a.x, d.z - a.z)) {
      [a, b, c, d] = [b, c, d, a];
    }
    const e = mix(a, b, 0.35 + random() * 0.3),
      f = mix(d, c, 0.35 + random() * 0.3);
    parcels.push([a, e, f, d], [e, b, c, f]);
  }
  const crops: POIField["crop"][] = [
    "wheat",
    "barley",
    "potatoes",
    "flax",
    "beets",
    "fallow",
  ];
  for (const parcel of parcels) {
    const center = {
      x: parcel.reduce((s, p) => s + p.x, 0) / 4,
      z: parcel.reduce((s, p) => s + p.z, 0) / 4,
    };
    // Convex inset leaves continuous grass lanes between every field.
    const polygon = parcel.map((p) => {
      const distance = Math.hypot(p.x - center.x, p.z - center.z);
      return mix(p, center, Math.min(0.15, 3 / distance));
    });
    const width =
        Math.max(...polygon.map((p) => p.x)) -
        Math.min(...polygon.map((p) => p.x)),
      depth =
        Math.max(...polygon.map((p) => p.z)) -
        Math.min(...polygon.map((p) => p.z));
    const edge = random() < 0.5 ? 0 : 1,
      a = polygon[edge],
      b = polygon[(edge + 1) % 4];
    result.fields.push({
      ...center,
      width,
      depth,
      polygon,
      rowAngle: Math.atan2(b.z - a.z, b.x - a.x),
      crop: crops[Math.floor(random() * crops.length)],
      rows: Math.ceil(Math.max(width, depth) / 2),
    });
    for (let j = 0; j < 4; j++) {
      const a = polygon[j],
        b = polygon[(j + 1) % 4],
        length = Math.hypot(b.x - a.x, b.z - a.z);
      if (random() < 0.4) continue;
      // A generous gate in every hedge keeps parcels accessible to infantry and vehicles.
      const gap = 8,
        segment = (length - gap) / 2;
      if (segment < 3) continue;
      for (const t of [segment / 2 / length, 1 - segment / 2 / length]) {
        const pos = mix(a, b, t),
          id = "hedge:" + result.props.length,
          angle = -Math.atan2(b.z - a.z, b.x - a.x);
        result.props.push({
          id,
          kind: "hedge",
          ...pos,
          width: segment,
          depth: 0.65,
          height: 0.85,
          angle,
        });
        result.obstacles.push({
          id,
          kind: "wall",
          ...pos,
          width: segment,
          depth: 0.65,
          angle,
        });
      }
    }
    if (base.kind === "orchard" || base.kind === "hop-garden") {
      // Bounded per-parcel population; never enlarge individual plants.
      for (let u = 0.15; u < 0.9; u += 0.15)
        for (let v = 0.15; v < 0.9; v += 0.15) {
          const pos = mix(
            mix(polygon[0], polygon[1], u),
            mix(polygon[3], polygon[2], u),
            v,
          );
          if (base.kind === "orchard")
            result.trees.push({ ...pos, variant: "tree" });
          else {
            const id = "hop:" + result.props.length;
            result.props.push({
              id,
              kind: "pole",
              ...pos,
              width: 0.14,
              depth: 0.14,
              height: 2.4,
              angle: 0,
            });
            result.obstacles.push({
              id,
              kind: "building",
              ...pos,
              width: 0.14,
              depth: 0.14,
              angle: 0,
            });
          }
        }
    }
  }
  return result;
}
