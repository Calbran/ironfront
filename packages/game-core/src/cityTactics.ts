import { cityBuildingFootprint } from "./cityBuildingKit";
import { CITY_PROP_SCALE } from "./cityPropScale";
import {
  combinedLot,
  combinedPosition,
  combinedCanonicalZ,
  combinedHeight,
  type TerrainProfile,
  type planCombinedDistrict,
} from "./combinedDistrict";
import { segmentDistance, type CityPoint } from "./organicCity";

/** Prototype geometry only. Scene units are not campaign movement distances. */
export type CityObstacle = CityPoint & {
  id: string;
  width: number;
  depth: number;
  angle: number;
  kind: "building" | "wall" | "garden" | "sandbag" | "vehicle";
  coverLevel?: "partial" | "full";
};
export const CIVIC_WALLS = [-1, 1].flatMap((side) => [
  {
    x: side * 21.7,
    z: -9,
    width: CITY_PROP_SCALE.wall.thickness,
    depth: 13.12,
  },
  {
    x: side * 21.7,
    z: 9.2,
    width: CITY_PROP_SCALE.wall.thickness,
    depth: 14.12,
  },
  ...[-15.8, 16.2].map((z) => ({
    x: side * 13,
    z,
    width: 17.52,
    depth: CITY_PROP_SCALE.wall.thickness,
  })),
]);
export const CITY_TRIAL_SANDBAGS = {
  id: "sandbags:civic",
  x: 8,
  z: 9,
  width: 4,
  depth: 0.65,
  angle: 0,
  kind: "sandbag" as const,
};
export type CityCoverLevel = "none" | "partial" | "full";
export const CITY_CONTROL_AREA = {
  x: 0,
  z: 0,
  width: 48,
  depth: 37,
  minZ: -18,
  maxZ: 19,
};
export type CityMover = "infantry" | "vehicle";
/** Shared with the rendered civic paving, including its approaches outside the gates. */
export const CITY_PLAZA_SURFACE = {
  x: 0,
  z: -6,
  width: 72,
  depth: 56,
} as const;
export type CityCover = {
  position: CityPoint;
  normal: CityPoint;
  obstacleId: string;
};
const radius = { infantry: 0.25, vehicle: 0.9 };
export function obstacleDistance(p: CityPoint, o: CityObstacle) {
  const dx = p.x - o.x,
    dz = p.z - o.z,
    c = Math.cos(o.angle),
    s = Math.sin(o.angle);
  return Math.hypot(
    Math.max(0, Math.abs(dx * c - dz * s) - o.width / 2),
    Math.max(0, Math.abs(dx * s + dz * c) - o.depth / 2),
  );
}
/** Build lazily from the same fitted full-city plan used by the renderer. */
export function createCityTactics(
  plan: ReturnType<typeof planCombinedDistrict>,
  seed: number,
  profile: TerrainProfile,
) {
  const worldLot = (
    p: Parameters<typeof combinedLot>[0],
    s = seed,
    pr = profile,
  ) => combinedLot(p, s, pr, plan.waterfront);
  const position = (p: CityPoint, s = seed, pr = profile) =>
    combinedPosition(p, s, pr, plan.waterfront);
  const canonicalZ = (p: CityPoint, s = seed, pr = profile) =>
    combinedCanonicalZ(p, s, pr, plan.waterfront);
  const obstacles: CityObstacle[] = plan.lots.map((lot, i) => {
    const p = worldLot(lot, seed, profile),
      d = cityBuildingFootprint(lot.variant);
    return {
      ...p,
      id: `building:${i}`,
      width: d.width * p.scale,
      depth: d.depth * p.scale,
      kind: "building",
    };
  });
  obstacles.push({
    id: "town-hall",
    x: 0,
    z: -5.04,
    width: 15.12,
    depth: 9.36,
    angle: 0,
    kind: "building",
  });
  obstacles.push({ ...CITY_TRIAL_SANDBAGS });
  CIVIC_WALLS.forEach((w, i) =>
    obstacles.push({ ...w, id: `wall:${i}`, angle: 0, kind: "wall" }),
  );
  for (const side of [-1, 1]) {
    for (const z of [-15.8, -2.5, 2.2, 16.2])
      obstacles.push({
        id: `pier:${side}:${z}`,
        x: side * 21.7,
        z,
        width: CITY_PROP_SCALE.pier.width,
        depth: CITY_PROP_SCALE.pier.width,
        angle: 0,
        kind: "wall",
      });
    for (const z of [-15.8, 16.2])
      obstacles.push({
        id: `gate:${side}:${z}`,
        x: side * 4.3,
        z,
        width: CITY_PROP_SCALE.pier.width,
        depth: CITY_PROP_SCALE.pier.width,
        angle: 0,
        kind: "wall",
      });
    for (const z of seed % 3 === 1 ? [-8.5] : [-8.5, 8])
      obstacles.push({
        id: `garden:${side}:${z}`,
        x: side * 16,
        z,
        width: 7.6,
        depth: 9.6,
        angle: 0,
        kind: "garden",
      });
    for (const z of [-14.5, 14.8])
      obstacles.push({
        id: `hedge:${side}:${z}`,
        x: side * 12,
        z,
        width: 13,
        depth: 1.2,
        angle: 0,
        kind: "garden",
      });
  }
  // Spatial buckets keep repeated route/collision queries independent of city building count.
  const buckets = new Map<string, CityObstacle[]>();
  function rebuildBuckets() {
    buckets.clear();
    for (const o of obstacles) {
      const r = Math.hypot(o.width, o.depth) / 2 + 2;
      for (
        let x = Math.floor((o.x - r) / 16);
        x <= Math.floor((o.x + r) / 16);
        x++
      )
        for (
          let z = Math.floor((o.z - r) / 16);
          z <= Math.floor((o.z + r) / 16);
          z++
        ) {
          const key = `${x},${z}`,
            list = buckets.get(key) ?? [];
          list.push(o);
          buckets.set(key, list);
        }
    }
  }
  rebuildBuckets();
  function setSandbags(
    items: { id: number; x: number; z: number; angle: number }[],
  ) {
    for (let i = obstacles.length - 1; i >= 0; i--)
      if (obstacles[i].id.startsWith("built-sandbag:")) obstacles.splice(i, 1);
    obstacles.push(
      ...items.map((p) => ({
        ...p,
        id: "built-sandbag:" + p.id,
        width: 4,
        depth: 1,
        kind: "sandbag" as const,
      })),
    );
    rebuildBuckets();
  }
  const streets = plan.streets.map((s) => ({
    ...s,
    points: s.points.map((p) => position(p, seed, profile)),
  }));
  const bridgeXs = plan.streets
    .filter(
      (s) =>
        s.points[0].x === s.points.at(-1)!.x &&
        Math.min(s.points[0].z, s.points.at(-1)!.z) < -94 &&
        Math.max(s.points[0].z, s.points.at(-1)!.z) > -94,
    )
    .map((s) => ({ x: s.points[0].x, width: s.width }));
  const streetBuckets = new Map<
    string,
    { a: CityPoint; b: CityPoint; width: number }[]
  >();
  for (const s of streets)
    for (let i = 1; i < s.points.length; i++) {
      const a = s.points[i - 1],
        b = s.points[i],
        r = s.width / 2;
      for (
        let x = Math.floor((Math.min(a.x, b.x) - r) / 16);
        x <= Math.floor((Math.max(a.x, b.x) + r) / 16);
        x++
      )
        for (
          let z = Math.floor((Math.min(a.z, b.z) - r) / 16);
          z <= Math.floor((Math.max(a.z, b.z) + r) / 16);
          z++
        ) {
          const key = `${x},${z}`,
            list = streetBuckets.get(key) ?? [];
          list.push({ a, b, width: s.width });
          streetBuckets.set(key, list);
        }
    }
  const canonical = (p: CityPoint) => canonicalZ(p, seed, profile);
  const height = (p: CityPoint) =>
    combinedHeight(p.x, canonical(p), profile, true);
  function walkable(p: CityPoint, mover: CityMover = "infantry") {
    const r = radius[mover];
    if (
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.z) ||
      Math.abs(p.x) > 160 - r ||
      Math.abs(canonical(p)) > 160 - r
    )
      return false;
    if (
      (
        buckets.get(`${Math.floor(p.x / 16)},${Math.floor(p.z / 16)}`) ?? []
      ).some(
        (o) =>
          (mover !== "infantry" || o.kind !== "garden") &&
          !(mover === "vehicle" && o.id.startsWith("built-sandbag:")) &&
          obstacleDistance(p, o) <= r,
      )
    )
      return false;
    const z = canonical(p);
    // The narrow canal has built quays; crossing is allowed only on the actual bridge deck.
    if (
      Math.abs(z + 94) < 2.7 + r &&
      !bridgeXs.some((b) => Math.abs(p.x - b.x) < b.width / 2 - r)
    )
      return false;
    if (
      mover === "vehicle" &&
      !(
        Math.abs(p.x - CITY_PLAZA_SURFACE.x) <=
          CITY_PLAZA_SURFACE.width / 2 - r &&
        Math.abs(z - CITY_PLAZA_SURFACE.z) <= CITY_PLAZA_SURFACE.depth / 2 - r
      ) &&
      !(
        streetBuckets.get(`${Math.floor(p.x / 16)},${Math.floor(p.z / 16)}`) ??
        []
      ).some((s) => segmentDistance(p, s.a, s.b) <= s.width / 2 - r)
    )
      return false;
    return true;
  }
  function segmentClear(
    a: CityPoint,
    b: CityPoint,
    mover: CityMover = "infantry",
  ) {
    const d = Math.hypot(a.x - b.x, a.z - b.z),
      n = Math.max(1, Math.ceil(d / 0.3));
    if (
      d > 0 &&
      Math.abs(height(a) - height(b)) / d > (mover === "vehicle" ? 0.3 : 0.65)
    )
      return false;
    for (let i = 0; i <= n; i++)
      if (
        !walkable(
          { x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n },
          mover,
        )
      )
        return false;
    return true;
  }
  const cover: CityCover[] = [];
  for (const o of obstacles.filter((o) => o.kind !== "garden"))
    for (const side of [-1, 1])
      for (const axis of ["x", "z"] as const) {
        const nx = axis === "x" ? side : 0,
          nz = axis === "z" ? side : 0,
          c = Math.cos(o.angle),
          s = Math.sin(o.angle);
        const normal = { x: nx * c + nz * s, z: -nx * s + nz * c },
          distance = (axis === "x" ? o.width : o.depth) / 2 + 0.65;
        const position = {
          x: o.x + normal.x * distance,
          z: o.z + normal.z * distance,
        };
        if (walkable(position))
          cover.push({ position, normal, obstacleId: o.id });
      }
  function coverAt(
    p: CityPoint,
    threat?: CityPoint,
    dynamic: CityObstacle[] = [],
  ) {
    const candidates = [
      ...(buckets.get(`${Math.floor(p.x / 16)},${Math.floor(p.z / 16)}`) ?? []),
      ...dynamic,
    ].filter(
      (o) =>
        o.kind !== "garden" &&
        obstacleDistance(p, o) > 0.01 &&
        obstacleDistance(p, o) <= 1.1,
    );
    for (const o of candidates.sort(
      (a, b) =>
        Number(b.kind === "building" || b.coverLevel === "full") -
          Number(a.kind === "building" || a.coverLevel === "full") ||
        obstacleDistance(p, a) - obstacleDistance(p, b),
    )) {
      const c = Math.cos(o.angle),
        s = Math.sin(o.angle),
        dx = p.x - o.x,
        dz = p.z - o.z;
      const lx = dx * c - dz * s,
        lz = dx * s + dz * c;
      const nx = lx - Math.max(-o.width / 2, Math.min(o.width / 2, lx)),
        nz = lz - Math.max(-o.depth / 2, Math.min(o.depth / 2, lz)),
        length = Math.hypot(nx, nz) || 1;
      const normal = {
        x: (nx * c + nz * s) / length,
        z: (-nx * s + nz * c) / length,
      };
      if (threat) {
        const tx = (threat.x - o.x) * c - (threat.z - o.z) * s,
          tz = (threat.x - o.x) * s + (threat.z - o.z) * c;
        let lo = 0,
          hi = 1;
        for (const [start, delta, half] of [
          [lx, tx - lx, o.width / 2],
          [lz, tz - lz, o.depth / 2],
        ]) {
          if (Math.abs(delta) < 1e-9) {
            if (Math.abs(start) > half) {
              lo = 2;
              break;
            }
          } else {
            const a = (-half - start) / delta,
              b = (half - start) / delta;
            lo = Math.max(lo, Math.min(a, b));
            hi = Math.min(hi, Math.max(a, b));
          }
        }
        if (lo > hi || hi <= 0 || lo >= 1) continue;
      }
      return {
        level: (o.coverLevel ??
          (o.kind === "building" ? "full" : "partial")) as CityCoverLevel,
        obstacleId: o.id,
        normal,
        damageScale: o.kind === "building" || o.coverLevel === "full" ? 0 : 0.5,
      };
    }
    return {
      level: "none" as CityCoverLevel,
      obstacleId: undefined as string | undefined,
      normal: { x: 0, z: 1 },
      damageScale: 1,
    };
  }
  const inControlArea = (p: CityPoint) =>
    Math.abs(p.x) <= 24 && p.z >= -18 && p.z <= 19 && walkable(p);
  /** Bounded 1-unit cardinal grid. Exact endpoints are validated, never silently snapped across obstacles. */
  function route(
    start: CityPoint,
    end: CityPoint,
    mover: CityMover = "infantry",
  ): CityPoint[] {
    if (!walkable(start, mover) || !walkable(end, mover)) return [];
    if (segmentClear(start, end, mover)) return [start, end];
    const size = 321,
      index = (x: number, z: number) => (z + 160) * size + x + 160,
      point = (i: number) => ({
        x: (i % size) - 160,
        z: Math.floor(i / size) - 160,
      });
    const snap = (p: CityPoint) => {
      const candidates = [];
      for (let x = Math.floor(p.x) - 1; x <= Math.ceil(p.x) + 1; x++)
        for (let z = Math.floor(p.z) - 1; z <= Math.ceil(p.z) + 1; z++) {
          const q = { x, z };
          if (segmentClear(p, q, mover)) candidates.push(q);
        }
      return candidates.sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
      )[0];
    };
    const a = snap(start),
      b = snap(end);
    if (!a || !b) return [];
    const from = index(a.x, a.z),
      to = index(b.x, b.z);
    const prev = new Int32Array(size * size).fill(-1),
      cost = new Float64Array(size * size).fill(Infinity);
    const closed = new Uint8Array(size * size);
    const heap: { id: number; score: number }[] = [];
    const push = (id: number, score: number) => {
      let i = heap.length;
      heap.push({ id, score });
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent].score <= score) break;
        heap[i] = heap[parent];
        i = parent;
      }
      heap[i] = { id, score };
    };
    const pop = () => {
      const first = heap[0],
        last = heap.pop()!;
      if (heap.length) {
        let i = 0;
        while (i * 2 + 1 < heap.length) {
          let child = i * 2 + 1;
          if (
            child + 1 < heap.length &&
            heap[child + 1].score < heap[child].score
          )
            child++;
          if (heap[child].score >= last.score) break;
          heap[i] = heap[child];
          i = child;
        }
        heap[i] = last;
      }
      return first.id;
    };
    cost[from] = 0;
    prev[from] = from;
    push(from, 0);
    while (heap.length) {
      const id = pop();
      if (closed[id]) continue;
      closed[id] = 1;
      if (id === to) break;
      const p = point(id);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const q = { x: p.x + dx, z: p.z + dz };
        if (Math.abs(q.x) > 159 || Math.abs(q.z) > 159) continue;
        const next = index(q.x, q.z),
          nextCost = cost[id] + 1;
        if (
          closed[next] ||
          nextCost >= cost[next] ||
          !segmentClear(p, q, mover)
        )
          continue;
        cost[next] = nextCost;
        prev[next] = id;
        push(next, nextCost + Math.abs(q.x - b.x) + Math.abs(q.z - b.z));
      }
    }
    if (prev[to] === -1) return [];
    const result = [end];
    for (let i = to; i !== from; i = prev[i]) result.push(point(i));
    result.push(a, start);
    return result.reverse();
  }
  return {
    obstacles,
    setSandbags,
    cover,
    coverAt,
    streets,
    controlArea: CITY_CONTROL_AREA,
    walkable,
    segmentClear,
    route,
    inControlArea,
    height,
    surfaceHeight(p: CityPoint) {
      const z = canonical(p) + 94;
      const bridge =
        Math.abs(z) <= 4.5 &&
        bridgeXs.some((b) => Math.abs(p.x - b.x) <= b.width / 2);
      const lawn = obstacles.some(
        (o) => o.id.startsWith("garden:") && obstacleDistance(p, o) === 0,
      );
      return (
        height(p) +
        (bridge ? 0.21 + 0.55 * (1 - (z / 4.5) ** 2) : lawn ? 0.48 : 0.17)
      );
    },
  };
}
