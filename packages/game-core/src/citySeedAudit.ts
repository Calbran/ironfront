import { worldRiverSample } from "./worldRiverSample";
import { planDistrictCity } from "./districtCity";
import {
  planCombinedDistrict,
  combinedLot,
  combinedPosition,
  riverBend,
  type TerrainProfile,
} from "./combinedDistrict";
import { lotCorners } from "./angledDistrict";
import {
  lotsOverlap,
  lotIntersectsStreet,
  segmentDistance,
  type CityPoint,
} from "./organicCity";
export const seedCases = [
  "town",
  "district",
  "large-district",
  "combined",
  "worldgen",
  "citywide",
  "tight-bend",
  "steep",
] as const;
export type SeedCase = (typeof seedCases)[number];
export function seedCaseOptions(mode: SeedCase) {
  return {
    fullTile: mode === "citywide",
    count: mode === "town" ? 28 : mode === "large-district" ? 256 : 128,
    combined: [
      "combined",
      "tight-bend",
      "steep",
      "worldgen",
      "citywide",
    ].includes(mode),
    profile: (mode === "citywide"
      ? "worldgen"
      : mode === "tight-bend" || mode === "steep" || mode === "worldgen"
        ? mode
        : "normal") as TerrainProfile,
  };
}
function intersects(a: CityPoint, b: CityPoint, c: CityPoint, d: CityPoint) {
  const cross = (p: CityPoint, q: CityPoint, r: CityPoint) =>
    (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  if (
    Math.min(
      segmentDistance(a, c, d),
      segmentDistance(b, c, d),
      segmentDistance(c, a, b),
      segmentDistance(d, a, b),
    ) < 1e-6
  )
    return true;
  return (
    cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0
  );
}
export function auditCitySeed(seed: number, mode: SeedCase) {
  const start = performance.now(),
    options = seedCaseOptions(mode);
  const plan = options.combined
    ? planCombinedDistrict(seed, options.profile, options.fullTile)
    : planDistrictCity(options.count, seed);
  const generationMs = performance.now() - start;
  const lots = plan.lots.map((l) =>
    options.combined ? combinedLot(l, seed, options.profile) : l,
  );
  const worldStreets = plan.streets.map((s) => ({
    ...s,
    points: s.points.map((p) =>
      options.combined ? combinedPosition(p, seed, options.profile) : p,
    ),
  }));
  const failures: string[] = [];
  let overlaps = 0,
    roadCollisions = 0,
    bankViolations = 0,
    blockedEntrances = 0;
  for (let i = 0; i < lots.length; i++) {
    for (let j = 0; j < i; j++) if (lotsOverlap(lots[i], lots[j])) overlaps++;
    if (worldStreets.some((s) => lotIntersectsStreet(lots[i], s)))
      roadCollisions++;
    if (
      options.combined &&
      i >= ("civicLotCount" in plan ? plan.civicLotCount : 27) &&
      lotCorners(lots[i]).some(
        (p) =>
          Math.abs(p.z + 94 - riverBend(p.x, seed, options.profile)) < 7 - 1e-7,
      )
    )
      bankViolations++;
  }
  const access =
    "access" in plan ? plan.access : plan.districts.flatMap((d) => d.access);
  for (const a of access) {
    const path = {
      points: [a.entrance, a.street].map((p) =>
        options.combined ? combinedPosition(p, seed, options.profile) : p,
      ),
      width: 1.25,
      alley: true,
    };
    if (lots.some((l, i) => i !== a.lotIndex && lotIntersectsStreet(l, path)))
      blockedEntrances++;
  }
  // Connectivity is invariant under the shared bend; intersect canonical centerlines exactly.
  const roads = plan.streets.map((s) =>
    s.points.filter(
      (p, i, ps) =>
        i === 0 ||
        i === ps.length - 1 ||
        Math.abs(
          (p.x - ps[i - 1].x) * (ps[i + 1].z - p.z) -
            (p.z - ps[i - 1].z) * (ps[i + 1].x - p.x),
        ) > 1e-7,
    ),
  );
  const parent = roads.map((_, i) => i),
    root = (i: number): number =>
      parent[i] === i ? i : (parent[i] = root(parent[i]));
  for (let i = 0; i < roads.length; i++)
    for (let j = 0; j < i; j++) {
      if (root(i) === root(j)) continue;
      let joined = false;
      for (let a = 1; a < roads[i].length && !joined; a++)
        for (let b = 1; b < roads[j].length; b++)
          if (
            intersects(
              roads[i][a - 1],
              roads[i][a],
              roads[j][b - 1],
              roads[j][b],
            )
          ) {
            joined = true;
            break;
          }
      if (joined) parent[root(i)] = root(j);
    }
  const components = new Set(parent.map((_, i) => root(i))).size;
  const maxRelief =
    "foundations" in plan
      ? Math.max(0, ...plan.foundations.map((f) => f.base - f.low))
      : 0;
  for (const [n, label] of [
    [overlaps, "building overlaps"],
    [roadCollisions, "road collisions"],
    [bankViolations, "bank violations"],
    [blockedEntrances, "blocked entrances"],
  ] as const)
    if (n) failures.push(`${n} ${label}`);
  if (components > 1) failures.push(`${components} road components`);
  if (maxRelief > 1.200001) failures.push("excessive foundation relief");
  return {
    seed,
    mode,
    riverSource:
      mode === "worldgen" || mode === "citywide"
        ? {
            worldSeed: worldRiverSample(seed).worldSeed,
            river: worldRiverSample(seed).river,
            sourceStart: worldRiverSample(seed).sourceStart,
          }
        : undefined,
    composition:
      "composition" in plan ? plan.composition : "authored civic reference",
    buildings: lots.length + 1,
    rejected: "rejected" in plan ? plan.rejected : 0,
    generationMs,
    auditMs: performance.now() - start - generationMs,
    maxRelief,
    components,
    failures,
  };
}
