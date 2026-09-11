import type { CountryPOI, POIRoad } from "./countryPOI";
import { cityBuildingFootprint, cityBuildingEnvelope } from "./cityBuildingKit";
export type CountryPoint = { x: number; z: number };
export function segmentDistance(
  p: CountryPoint,
  a: CountryPoint,
  b: CountryPoint,
) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1),
      ),
    );
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
export function roadEnds(r: POIRoad): [CountryPoint, CountryPoint] {
  const angle = r.angle ?? 0,
    dx = (Math.cos(angle) * r.width) / 2,
    dz = (-Math.sin(angle) * r.width) / 2;
  return [
    { x: r.x - dx, z: r.z - dz },
    { x: r.x + dx, z: r.z + dz },
  ];
}
export function addRoad(
  target: POIRoad[],
  a: CountryPoint,
  b: CountryPoint,
  width: number,
) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  if (length < 0.05) return;
  target.push({
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
    width: length,
    depth: width,
    angle: -Math.atan2(b.z - a.z, b.x - a.x),
  });
}
export function nearestRoad(p: CountryPoint, roads: POIRoad[]) {
  let best = { x: 0, z: 0, distance: Infinity, angle: 0, width: 0 };
  for (const r of roads) {
    const [a, b] = roadEnds(r),
      dx = b.x - a.x,
      dz = b.z - a.z,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1),
        ),
      ),
      x = a.x + dx * t,
      z = a.z + dz * t,
      distance = Math.hypot(x - p.x, z - p.z);
    if (distance < best.distance)
      best = { x, z, distance, angle: r.angle ?? 0, width: r.depth };
  }
  return best;
}
export function placeCountryBuilding(
  plan: CountryPOI,
  variant: string,
  p: CountryPoint,
  angle: number,
  id: string,
) {
  const footprint = cityBuildingFootprint(variant),
    envelope = cityBuildingEnvelope(variant),
    radius = Math.hypot(envelope.width, envelope.depth) / 2;
  if (Math.max(Math.abs(p.x), Math.abs(p.z)) + radius > plan.extent - 2)
    return false;
  if (
    plan.roads.some((r) => {
      const [a, b] = roadEnds(r);
      return segmentDistance(p, a, b) < radius + r.depth / 2 + 0.8;
    })
  )
    return false;
  if (
    (plan.waterways ?? []).some((r) => {
      const [a, b] = roadEnds(r);
      return segmentDistance(p, a, b) < radius + r.depth / 2 + 1;
    })
  )
    return false;
  if (
    plan.obstacles.some(
      (o) =>
        Math.hypot(o.x - p.x, o.z - p.z) <
        radius + Math.hypot(o.width, o.depth) / 2 + 1,
    )
  )
    return false;
  plan.buildings.push({ id, variant, ...p, angle });
  plan.obstacles.push({ id, kind: "building", ...p, angle, ...footprint });
  const road = nearestRoad(p, plan.roads),
    dx = road.x - p.x,
    dz = road.z - p.z,
    length = Math.hypot(dx, dz),
    end = {
      x: p.x + Math.sin(angle) * (footprint.depth / 2 + 0.1),
      z: p.z + Math.cos(angle) * (footprint.depth / 2 + 0.1),
    };
  if (
    length > radius &&
    length < 35 &&
    plan.obstacles.every(
      (o) =>
        o.id === id ||
        segmentDistance(o, end, road) > Math.hypot(o.width, o.depth) / 2 + 1,
    )
  )
    addRoad((plan.paths ??= []), end, road, 1.1);
  return true;
}
