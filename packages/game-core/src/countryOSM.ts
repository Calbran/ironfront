import { cityBuildingEnvelope } from "./cityBuildingKit";
import type { CountryPOI } from "./countryPOI";
import type { CountryPOISize } from "./countryPOIExpansion";
import {
  addRoad,
  nearestRoad,
  placeCountryBuilding,
  type CountryPoint,
} from "./countryLayoutGeometry";
export type OSMSample = {
  name: string;
  center: { lat: number; lon: number };
  elements: {
    type: string;
    id: number;
    tags: Record<string, string>;
    geometry: { lat: number; lon: number }[];
  }[];
};
export function parseOSMSample(input: unknown): OSMSample {
  const data = input as OSMSample;
  if (
    !data ||
    typeof data.name !== "string" ||
    data.name.length > 150 ||
    !data.center ||
    !Number.isFinite(data.center.lat) ||
    Math.abs(data.center.lat) > 85 ||
    !Number.isFinite(data.center.lon) ||
    Math.abs(data.center.lon) > 180 ||
    !Array.isArray(data.elements) ||
    data.elements.length > 20000
  )
    throw Error("Invalid OSM sample");
  let vertices = 0;
  for (const e of data.elements) {
    if (
      e.type !== "way" ||
      !Number.isSafeInteger(e.id) ||
      !e.tags ||
      typeof e.tags !== "object" ||
      !Array.isArray(e.geometry) ||
      e.geometry.length < 2
    )
      throw Error("Invalid OSM way");
    vertices += e.geometry.length;
    if (vertices > 150000) throw Error("OSM sample too large");
    for (const p of e.geometry)
      if (
        !Number.isFinite(p.lat) ||
        !Number.isFinite(p.lon) ||
        Math.abs(p.lat - data.center.lat) > 0.1 ||
        Math.abs(p.lon - data.center.lon) > 0.15
      )
        throw Error("OSM geometry outside sample");
  }
  return data;
}
/** Clip each segment at the crop boundary; never fold outside vertices onto the edge. */
export function clipCountrySegment(
  a: CountryPoint,
  b: CountryPoint,
  extent: number,
): [CountryPoint, CountryPoint] | undefined {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  let low = 0,
    high = 1;
  for (const [p, q] of [
    [-dx, a.x + extent],
    [dx, extent - a.x],
    [-dz, a.z + extent],
    [dz, extent - a.z],
  ]) {
    if (p === 0) {
      if (q < 0) return;
      continue;
    }
    const r = q / p;
    if (p < 0) low = Math.max(low, r);
    else high = Math.min(high, r);
    if (low > high) return;
  }
  return [
    { x: a.x + dx * low, z: a.z + dz * low },
    { x: a.x + dx * high, z: a.z + dz * high },
  ];
}
export function generateOSMCountryPOI(
  sample: OSMSample,
  seed: number,
  size: CountryPOISize,
  density = 0.8,
): CountryPOI {
  if (!Number.isFinite(density) || density < 0 || density > 1)
    throw Error("Density must be between zero and one");
  const extent = { site: 115, estate: 220, district: 335 }[size];
  if (!extent) throw Error("Unknown layout size");
  const plan: CountryPOI = {
    kind: "ribbon-hamlet",
    seed,
    name: sample.name + " — adapted map sample",
    extent,
    details: [],
    buildings: [],
    props: [],
    fields: [],
    trees: [],
    roads: [],
    paths: [],
    waterways: [],
    obstacles: [],
    entrances: [],
    source: {
      name: sample.name,
      attribution: "© OpenStreetMap contributors",
      url: "https://www.openstreetmap.org/copyright",
      license: "ODbL-1.0",
    },
  };
  const project = (p: { lat: number; lon: number }) => ({
    x:
      (p.lon - sample.center.lon) *
      111320 *
      Math.cos((sample.center.lat * Math.PI) / 180) *
      0.55,
    z: -(p.lat - sample.center.lat) * 111320 * 0.55,
  });
  const hash = (id: number) => {
    let h = (id ^ seed) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  for (const e of sample.elements) {
    if (e.tags.tunnel === "yes") continue;
    const water = !!e.tags.waterway,
      highway = e.tags.highway;
    if (
      !water &&
      ![
        "residential",
        "unclassified",
        "tertiary",
        "secondary",
        "primary",
        "living_street",
        "service",
        "track",
        "pedestrian",
      ].includes(highway)
    )
      continue;
    const width = water
      ? e.tags.waterway === "river"
        ? 6
        : 2
      : highway === "track" || highway === "service"
        ? 3.2
        : 5.5;
    for (let i = 1; i < e.geometry.length; i++) {
      const segment = clipCountrySegment(
        project(e.geometry[i - 1]),
        project(e.geometry[i]),
        extent,
      );
      if (!segment) continue;
      addRoad(water ? plan.waterways! : plan.roads, ...segment, width);
      if (!water)
        for (const p of segment)
          if (
            Math.max(Math.abs(p.x), Math.abs(p.z)) > extent - 0.01 &&
            !plan.entrances.some((q) => Math.hypot(p.x - q.x, p.z - q.z) < 4)
          )
            plan.entrances.push(p);
    }
  }
  const buildings = sample.elements
    .filter(
      (e) =>
        e.tags.building && e.tags.building !== "no" && e.geometry.length >= 4,
    )
    .map((e) => {
      const points = e.geometry.slice(0, -1).map(project),
        p = {
          x: points.reduce((s, p) => s + p.x, 0) / points.length,
          z: points.reduce((s, p) => s + p.z, 0) / points.length,
        };
      return { e, points, p };
    })
    .sort(
      (a, b) =>
        Math.hypot(a.p.x, a.p.z) - Math.hypot(b.p.x, b.p.z) || a.e.id - b.e.id,
    );
  for (const { e, points, p } of buildings) {
    if (plan.buildings.length >= 420 || hash(e.id) > density) continue;
    let longest = 0,
      angle = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length],
        length = Math.hypot(b.x - a.x, b.z - a.z);
      if (length > longest) {
        longest = length;
        angle = -Math.atan2(b.z - a.z, b.x - a.x);
      }
    }
    const road = nearestRoad(p, plan.roads);
    if (road.distance > 55) continue;
    if (Math.sin(angle) * (road.x - p.x) + Math.cos(angle) * (road.z - p.z) < 0)
      angle += Math.PI;
    const variant =
      e.tags.building === "church" || e.tags.building === "civic"
        ? "hall"
        : longest > 17
          ? "warehouse"
          : hash(e.id + 123) < 0.18
            ? "shop"
            : hash(e.id + 71) < 0.2
              ? "urbanCourt"
              : "home";
    const envelope = cityBuildingEnvelope(variant),
      setback =
        Math.hypot(envelope.width, envelope.depth) / 2 + road.width / 2 + 1;
    if (road.distance < setback && road.distance > 0.01) {
      const shift = setback - road.distance;
      if (shift > 10) continue;
      p.x += ((p.x - road.x) / road.distance) * shift;
      p.z += ((p.z - road.z) / road.distance) * shift;
    }
    if (!placeCountryBuilding(plan, variant, p, angle, "osm:" + e.id)) continue;
    // Adapted garden cover behind selected homes; original private/address tags are never used.
    if (hash(e.id + 91) < 0.38) {
      const x = p.x - Math.sin(angle) * 8,
        z = p.z - Math.cos(angle) * 8,
        id = "garden:" + e.id;
      if (
        Math.max(Math.abs(x), Math.abs(z)) < extent - 5 &&
        nearestRoad({ x, z }, plan.roads).distance > 8 &&
        plan.obstacles.every(
          (o) =>
            Math.hypot(o.x - x, o.z - z) > Math.hypot(o.width, o.depth) / 2 + 4,
        )
      ) {
        plan.props.push({
          id,
          kind: "hedge",
          x,
          z,
          angle,
          width: 5,
          depth: 0.55,
          height: 0.8,
        });
        plan.obstacles.push({
          id,
          kind: "wall",
          x,
          z,
          angle,
          width: 5,
          depth: 0.55,
        });
      }
    }
  }
  return plan;
}
