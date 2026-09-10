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
export type TownPattern = "riverside" | "farming" | "industrial";
export type TownPlan = Omit<CityLayout, "buildings"> & {
  buildings: TownBuilding[];
  pattern: TownPattern;
  entrance: { point: CityPoint; from: string; to: string };
};
export function planMiniatureTown(
  world: World,
  regionId: number,
  site: RegionFeature,
  roads: readonly CityRoad[],
  rivers: readonly (readonly (readonly number[])[])[],
): TownPlan | null {
  const region = world.regions[regionId],
    rank = ["hamlet", "village", "town", "city", "metropolis"].indexOf(
      site.size ?? "town",
    ),
    radius = [150, 190, 240, 290, 340][rank];
  const otherSites = world.regions.flatMap((r) =>
    (r.features ?? []).filter(
      (f) => f.kind === "settlement" && f.id !== site.id,
    ),
  );
  const ownLot = (p: CityPoint) =>
    otherSites.every(
      (f) =>
        Math.hypot(p.x - f.x, p.y - f.y) >
        Math.hypot(p.x - site.x, p.y - site.y) + 80,
    );
  const regionalSegments = roads
    .flatMap((road) =>
      road.points.slice(1).map((b, i) => ({ road, a: road.points[i], b })),
    )
    .filter(
      ({ a, b }) =>
        Math.min(a.x, b.x) < site.x + radius &&
        Math.max(a.x, b.x) > site.x - radius &&
        Math.min(a.y, b.y) < site.y + radius &&
        Math.max(a.y, b.y) > site.y - radius,
    );
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
  const pattern: TownPattern =
    region.building === "factory" ||
    (region.terrain === "highlands" && rank >= 2)
      ? "industrial"
      : waterDistance(site) < 140
        ? "riverside"
        : "farming";
  const spacing = pattern === "farming" ? 82 : 66;
  const branchLength = [96, 144, 192, 240, 288][rank];
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
  const candidates: {
    p: CityPoint;
    angle: number;
    score: number;
    a: CityPoint;
    b: CityPoint;
    road: CityRoad;
  }[] = [];
  for (const { road, a, b } of regionalSegments) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 24));
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
          score: d + (road.from === site.id || road.to === site.id ? 0 : 30),
          a,
          b,
          road,
        });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  const centers: typeof candidates = [];
  for (const candidate of candidates) {
    if (
      centers.every(
        (c) => Math.hypot(c.p.x - candidate.p.x, c.p.y - candidate.p.y) > 40,
      )
    )
      centers.push(candidate);
    if (centers.length === 8) break;
  }
  for (const chosen of centers) {
    const center = chosen.p,
      streets: CityPoint[][] = [];
    // Each branch grows from the shared center and stops before water, mountains or province edges.
    const branches = [
      {
        angle: chosen.angle,
        length: Math.min(
          branchLength,
          Math.hypot(chosen.b.x - center.x, chosen.b.y - center.y),
        ),
      },
      {
        angle: chosen.angle + Math.PI,
        length: Math.min(
          branchLength,
          Math.hypot(chosen.a.x - center.x, chosen.a.y - center.y),
        ),
      },
      {
        angle: chosen.angle + Math.PI / 2,
        length: pattern === "farming" ? branchLength * 0.65 : branchLength,
      },
    ];
    if (pattern !== "farming" || rank >= 3)
      branches.push({
        angle: chosen.angle - Math.PI / 2,
        length: branchLength,
      });
    for (const { angle, length } of branches) {
      let end = center;
      for (let d = 12; d <= length; d += 12) {
        const p = {
          x: center.x + Math.cos(angle) * d,
          y: center.y + Math.sin(angle) * d,
        };
        if (
          !drySegment(end, p) ||
          otherSites.some(
            (f) =>
              Math.hypot(p.x - f.x, p.y - f.y) <
              Math.hypot(p.x - site.x, p.y - site.y),
          )
        )
          break;
        end = p;
      }
      if (Math.hypot(end.x - center.x, end.y - center.y) >= 48)
        streets.push([center, end]);
    }
    const allRoads = [
      ...streets,
      ...regionalSegments.map(({ a, b }) => [a, b]),
    ];
    const buildings: TownBuilding[] = [];
    for (const street of streets) {
      const [a, b] = street,
        theta = Math.atan2(b.y - a.y, b.x - a.x),
        length = Math.hypot(b.x - a.x, b.y - a.y);
      for (let along = 46; along < length - 8; along += spacing)
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
            !ownLot(p) ||
            !dry(p, 49) ||
            !buildingCorners(envelope).every((q) => dry(q, 16)) ||
            !buildingCorners(envelope).every((q, i, cs) =>
              localSegment(region, q, cs[(i + 1) % 4]),
            )
          )
            continue;
          if (
            buildings.some((other) =>
              buildingsOverlap(
                envelope,
                { ...other, width: 54, height: 54 },
                5,
              ),
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
    if (buildings.length < (rank === 0 ? 2 : 4)) continue;
    // Roles are assigned after valid lots exist, so missing lots cannot erase a required center.
    buildings.sort(
      (a, b) =>
        Math.hypot(a.x - center.x, a.y - center.y) -
        Math.hypot(b.x - center.x, b.y - center.y),
    );
    buildings.splice([4, 8, 12, 18, 24][rank]);
    buildings.forEach((b, i) => {
      b.model =
        i === 0 && rank > 0
          ? "hall"
          : pattern !== "farming" &&
              (i === buildings.length - 1 ||
                (pattern === "industrial" &&
                  i >= Math.ceil(buildings.length / 2)))
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
      archetype: pattern === "farming" ? "market" : pattern,
      pattern,
      entrance: { point: center, from: chosen.road.from, to: chosen.road.to },
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
  return null;
}
