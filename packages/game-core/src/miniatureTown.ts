import type { World, RegionFeature } from "./index.ts";
import type { CityRoad } from "./cityRoads.ts";
import {
  buildingCorners,
  buildingsOverlap,
  type CityLayout,
  type CityBuilding,
  type CityPoint,
} from "./cityLayout.ts";
import { localSegment, onLocalLand } from "./localMovement.ts";
export type TownBuilding = CityBuilding & {
  model: "home" | "hall" | "factory" | "shop";
  frontage: CityPoint;
};
export type TownPlan = Omit<CityLayout,"buildings"> & { buildings: TownBuilding[] };
export function planMiniatureTown(
  world: World,
  regionId: number,
  site: RegionFeature,
  roads: readonly CityRoad[],
  rivers: readonly (readonly (readonly number[])[])[],
): TownPlan | null {
  const region = world.regions[regionId],
    radius = 240;
  const riverSegments = rivers
    .flatMap((r) =>
      r.slice(1).map(
        (b, i) =>
          [
            { x: r[i][0], y: r[i][1] },
            { x: b[0], y: b[1] },
          ] as const,
      ),
    )
    .filter(
      ([a, b]) =>
        Math.min(a.x, b.x) < site.x + radius + 80 &&
        Math.max(a.x, b.x) > site.x - radius - 80 &&
        Math.min(a.y, b.y) < site.y + radius + 80 &&
        Math.max(a.y, b.y) > site.y - radius - 80,
    );
  const nearest = (p: CityPoint, a: CityPoint, b: CityPoint) => {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
    return { x: a.x + dx * t, y: a.y + dy * t };
  };
  const waterDistance = (p: CityPoint) =>
    riverSegments.reduce((d, [a, b]) => {
      const q = nearest(p, a, b);
      return Math.min(d, Math.hypot(p.x - q.x, p.y - q.y));
    }, Infinity);
  const dry = (p: CityPoint, clearance = 16) =>
    onLocalLand(region, p) && waterDistance(p) > clearance;
  const drySegment = (a: CityPoint, b: CityPoint) => {
    if (!localSegment(region, a, b)) return false;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
    for (let i = 0; i <= n; i++)
      if (
        !dry(
          { x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n },
          19,
        )
      )
        return false;
    return true;
  };
  // Choose a center on an existing regional route, on dry land rather than at the site marker.
  const candidates: { p: CityPoint; angle: number; score: number }[] = [];
  for (const road of roads)
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 24));
      for (let j = 0; j <= n; j++) {
        const p = {
            x: a.x + ((b.x - a.x) * j) / n,
            y: a.y + ((b.y - a.y) * j) / n,
          },
          d = Math.hypot(p.x - site.x, p.y - site.y);
        if (d < radius && dry(p, 65))
          candidates.push({
            p,
            angle: Math.atan2(b.y - a.y, b.x - a.x),
            score: d,
          });
      }
    }
  candidates.sort((a, b) => a.score - b.score);
  const chosen = candidates[0];
  if (!chosen) return null;
  const center = chosen.p,
    streets: CityPoint[][] = [];
  // Each branch grows from the shared center and stops before water, mountains or province edges.
  for (const angle of [
    chosen.angle,
    chosen.angle + Math.PI / 2,
    chosen.angle + Math.PI,
    chosen.angle - Math.PI / 2,
  ]) {
    let end = center;
    for (let d = 12; d <= 168; d += 12) {
      const p = {
        x: center.x + Math.cos(angle) * d,
        y: center.y + Math.sin(angle) * d,
      };
      if (!drySegment(end, p)) break;
      end = p;
    }
    if (Math.hypot(end.x - center.x, end.y - center.y) >= 48)
      streets.push([center, end]);
  }
  const allRoads = [
    ...streets,
    ...roads.flatMap((r) => r.points.slice(1).map((b, i) => [r.points[i], b])),
  ];
  const buildings: TownBuilding[] = [];
  for (const street of streets) {
    const [a, b] = street,
      theta = Math.atan2(b.y - a.y, b.x - a.x),
      length = Math.hypot(b.x - a.x, b.y - a.y);
    for (let along = 46; along < length - 8; along += 66)
      for (const side of [-1, 1]) {
        const frontage = {
            x: a.x + Math.cos(theta) * along,
            y: a.y + Math.sin(theta) * along,
          },
          p = {
            x: frontage.x - Math.sin(theta) * side * 37,
            y: frontage.y + Math.cos(theta) * side * 37,
          };
        const building: TownBuilding = {
          ...p,
          width: 32,
          height: 32,
          angle: theta + (side > 0 ? Math.PI : 0),
          sprite: 0,
          role: "house",
          model: "home",
          frontage,
        };
        const envelope = { ...building, width: 54, height: 54 };
        if (
          !dry(p, 49) ||
          !buildingCorners(envelope).every((q) => dry(q, 16)) ||
          !buildingCorners(envelope).every((q, i, cs) =>
            localSegment(region, q, cs[(i + 1) % 4]),
          )
        )
          continue;
        if (
          buildings.some((other) =>
            buildingsOverlap(envelope, { ...other, width: 54, height: 54 }, 5),
          )
        )
          continue;
        if (
          allRoads.some(([u, v]) => {
            const q = nearest(p, u, v);
            return Math.hypot(p.x - q.x, p.y - q.y) < 31;
          })
        )
          continue;
        buildings.push(building);
      }
  }
  if (buildings.length < 4) return null;
  // Roles are assigned after valid lots exist, so missing lots cannot erase a required center.
  buildings.sort(
    (a, b) =>
      Math.hypot(a.x - center.x, a.y - center.y) -
      Math.hypot(b.x - center.x, b.y - center.y),
  );
  buildings.forEach((b, i) => {
    b.model =
      i === 0
        ? "hall"
        : i === buildings.length - 1
          ? "factory"
          : i % 3 === 1
            ? "shop"
            : "home";
    b.role =
      b.model === "hall"
        ? "landmark"
        : b.model === "factory"
          ? "industry"
          : "house";
    b.sprite = i;
  });
  return {
    archetype: "riverside",
    radius: Math.max(
      ...buildings.map((b) => Math.hypot(b.x - site.x, b.y - site.y) + 45),
    ),
    buildings,
    roads: streets,
    blocks: [],
    docks: [],
    plaza: center,
  };
}
