import { cityBuildingFootprint, cityBuildingEnvelope } from "./cityBuildingKit";
import { pruneCityStreets } from "./cityStreetPruning";
import { ancoatsSample } from "../data/city-samples/ancoats";
/** Experimental large-city layout. Coordinates are miniature scene units, not campaign distances. */
export type CityPoint = { x: number; z: number };
export type CityStreet = { points: CityPoint[]; width: number; alley: boolean };
export type CityLot = CityPoint & {
  angle: number;
  scale: number;
  variant: string;
  heightScale?: number;
  /** Explicit rigid frontage bearing after terrain fitting. */
  worldAngle?: number;
  fullEnvelope?: boolean;
};
export function segmentDistance(p: CityPoint, a: CityPoint, b: CityPoint) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1),
    ),
  );
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
export function lineDistance(p: CityPoint, points: CityPoint[]) {
  let d = Infinity;
  for (let i = 1; i < points.length; i++)
    d = Math.min(d, segmentDistance(p, points[i - 1], points[i]));
  return d;
}

/** Separating-axis footprint check, including a small gap between neighboring walls. */
export function lotsOverlap(a: CityLot, b: CityLot) {
  const dims = (p: CityLot) => ({
    w:
      ((p.fullEnvelope
        ? cityBuildingEnvelope(p.variant)
        : cityBuildingFootprint(p.variant)
      ).width *
        p.scale) /
        2 +
      (p.fullEnvelope ? 0.025 : 0.2),
    d:
      ((p.fullEnvelope
        ? cityBuildingEnvelope(p.variant)
        : cityBuildingFootprint(p.variant)
      ).depth *
        p.scale) /
        2 +
      (p.fullEnvelope ? 0.025 : 0.2),
  });
  const ad = dims(a),
    bd = dims(b);
  const axes = (p: CityLot) => [
    { x: Math.cos(p.angle), z: -Math.sin(p.angle) },
    { x: Math.sin(p.angle), z: Math.cos(p.angle) },
  ];
  const aa = axes(a),
    ba = axes(b),
    dot = (u: CityPoint, v: CityPoint) => u.x * v.x + u.z * v.z;
  for (const axis of [...aa, ...ba]) {
    const ar =
      Math.abs(dot(axis, aa[0])) * ad.w + Math.abs(dot(axis, aa[1])) * ad.d;
    const br =
      Math.abs(dot(axis, ba[0])) * bd.w + Math.abs(dot(axis, ba[1])) * bd.d;
    if (Math.abs(dot(axis, { x: b.x - a.x, z: b.z - a.z })) >= ar + br)
      return false;
  }
  return true;
}

/** Conservative segment-vs-oriented-building clearance for road widths and roof eaves. */
export function lotIntersectsStreet(lot: CityLot, street: CityStreet) {
  const footprint = lot.fullEnvelope
    ? cityBuildingEnvelope(lot.variant)
    : cityBuildingFootprint(lot.variant);
  const padding = lot.fullEnvelope ? 0.025 : 0.2;
  const w = (footprint.width * lot.scale) / 2 + padding + street.width / 2;
  const d = (footprint.depth * lot.scale) / 2 + padding + street.width / 2;
  const c = Math.cos(lot.angle),
    s = Math.sin(lot.angle);
  const local = (p: CityPoint) => ({
    x: (p.x - lot.x) * c - (p.z - lot.z) * s,
    z: (p.x - lot.x) * s + (p.z - lot.z) * c,
  });
  for (let i = 1; i < street.points.length; i++) {
    const a = local(street.points[i - 1]),
      b = local(street.points[i]);
    let lo = 0,
      hi = 1;
    for (const [start, delta, half] of [
      [a.x, b.x - a.x, w],
      [a.z, b.z - a.z, d],
    ]) {
      if (Math.abs(delta) < 1e-8) {
        if (Math.abs(start) > half) {
          hi = -1;
          break;
        }
      } else {
        const t0 = (-half - start) / delta,
          t1 = (half - start) / delta;
        lo = Math.max(lo, Math.min(t0, t1));
        hi = Math.min(hi, Math.max(t0, t1));
      }
    }
    if (lo <= hi) return true;
  }
  return false;
}
export const inCivicPrecinct = (p: CityPoint, margin = 0) =>
  (Math.abs(p.x) < 19 + margin && p.z > -18 - margin && p.z < 18 + margin) ||
  (p.x > -12 - margin &&
    p.x < 1 + margin &&
    p.z > 16 - margin &&
    p.z < 28 + margin);

export function planOrganicCity(
  target = 160,
  seed = 731,
  riverOffset = -0.38,
  sample: "ancoats" | "procedural" = "ancoats",
) {
  if (!Number.isInteger(target) || target < 2 || target > 1024)
    throw new Error("City size must be 2–1024");
  let state = seed >>> 0;
  const random = () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const extent = Math.max(85, Math.sqrt(target) * 7.3);
  const river: CityPoint[] = [];
  for (let z = -extent - 16; z <= extent + 16; z += 2)
    river.push({
      x: extent * riverOffset + Math.sin((z / extent) * 3) * extent * 0.12,
      z,
    });
  const parks = [
    { x: extent * 0.56, z: -extent * 0.3, r: 6 },
    { x: -extent * 0.16, z: extent * 0.7, r: 7 },
  ];
  const streets: CityStreet[] = [];
  // A displaced street graph: unequal blocks, T junctions and short back lanes.
  // Shared endpoints make the network connected without orbiting the capital.
  const nodes: CityPoint[][] = [];
  const n = Math.ceil((extent * 2) / 23),
    step = (extent * 2) / n;
  for (let row = 0; row <= n; row++) {
    nodes[row] = [];
    for (let col = 0; col <= n; col++)
      nodes[row][col] = {
        x: -extent + col * step + Math.sin(row * 1.7 + col * 0.8) * 5,
        z: -extent + row * step + Math.sin(col * 1.3 + row * 0.6) * 5,
      };
  }
  const connect = (a: CityPoint, b: CityPoint, alley: boolean) => {
    const points: CityPoint[] = [],
      dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz),
      bend = (random() - 0.5) * 3;
    for (let i = 0; i <= 16; i++) {
      const t = i / 16,
        w = Math.sin(t * Math.PI) * bend;
      points.push({
        x: a.x + dx * t + (dz / len) * w,
        z: a.z + dz * t - (dx / len) * w,
      });
    }
    streets.push({ points, width: alley ? 1.3 : 2.8, alley });
  };
  for (let row = 0; row <= n; row++)
    for (let col = 0; col <= n; col++) {
      if (col < n) connect(nodes[row][col], nodes[row][col + 1], row % 3 !== 1);
      if (row < n && (col === 0 || col === n || random() > 0.3))
        connect(nodes[row][col], nodes[row + 1][col], col % 3 !== 1);
    }
  const rivers: CityPoint[][] =
    sample === "ancoats"
      ? ancoatsSample.waterways.map((w) =>
          w.points.map((p) => ({ x: p.x * extent, z: p.z * extent })),
        )
      : [river];
  if (sample === "ancoats") {
    streets.length = 0;
    for (const road of ancoatsSample.roads) {
      const points: CityPoint[] = [];
      for (let i = 1; i < road.points.length; i++) {
        const a = road.points[i - 1],
          b = road.points[i],
          length = Math.hypot(b.x - a.x, b.z - a.z) * extent;
        for (let j = 0; j < Math.max(1, Math.ceil(length)); j++) {
          const t = j / Math.max(1, Math.ceil(length));
          points.push({
            x: (a.x + (b.x - a.x) * t) * extent,
            z: (a.z + (b.z - a.z) * t) * extent,
          });
        }
      }
      const end = road.points.at(-1)!;
      points.push({ x: end.x * extent, z: end.z * extent });
      const alley = ["service", "pedestrian", "living_street"].includes(
        road.kind,
      );
      streets.push({ points, width: alley ? 1.3 : 2.8, alley });
    }
    // Keep a continuous canal corridor outside the fixed civic and depot reservations.
    for (let r = 0; r < rivers.length; r++) {
      const dense: CityPoint[] = [];
      for (let i = 1; i < rivers[r].length; i++) {
        const a = rivers[r][i - 1],
          b = rivers[r][i],
          steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
        for (let j = 0; j < steps; j++) {
          const t = j / steps;
          dense.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
        }
      }
      dense.push(rivers[r].at(-1)!);
      for (const p of dense)
        if (p.z > -35 && p.z < 63 && p.x > -34 && p.x < 62) p.x = 62;
      rivers[r] = dense;
    }
  }

  const waterDistance = (p: CityPoint) =>
    Math.min(...rivers.map((r) => lineDistance(p, r)));
  // Fixed landmarks reserve their own pedestrian and servicing space.
  const reserved = (p: CityPoint, margin = 0) =>
    inCivicPrecinct(p, margin) ||
    (p.x > 20 - margin &&
      p.x < 54 + margin &&
      p.z > 23 - margin &&
      p.z < 53 + margin);
  const lots: CityLot[] = [];
  const candidates: CityLot[] = [];
  for (const street of streets)
    for (let i = 2; i < street.points.length - 2; i += 1) {
      const p = street.points[i],
        next = street.points[i + 1],
        dx = next.x - p.x,
        dz = next.z - p.z,
        l = Math.hypot(dx, dz);
      for (const side of [-1, 1]) {
        const rural = Math.hypot(p.x, p.z) > extent * 0.8;
        if (rural && random() < 0.35) continue;
        const scale = 0.78 + random() * 0.12;
        const variant = rural
          ? "home"
          : waterDistance(p) < 20 && random() < 0.65
            ? "factory"
            : random() < 0.6
              ? "shop"
              : "home";
        const offset =
          street.width / 2 +
          ((variant === "factory" ? 7 : variant === "home" ? 5 : 6) * scale) /
            2 +
          0.45;
        const x = p.x + ((side * dz) / l) * offset,
          z = p.z - ((side * dx) / l) * offset;
        candidates.push({
          x,
          z,
          angle: Math.atan2(p.x - x, p.z - z),
          scale,
          variant,
        });
      }
    }
  // Fill downtown first while leaving a deliberate fraction of the budget for rural streets.
  candidates.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  const accept = (p: CityLot) => {
    if (
      reserved(p, 3.5) ||
      parks.some((k) => Math.hypot(p.x - k.x, p.z - k.z) < k.r + 4) ||
      waterDistance(p) < 7
    )
      return;
    if (streets.some((s) => lotIntersectsStreet(p, s))) return;
    if (lots.some((q) => lotsOverlap(p, q))) return;
    lots.push(p);
  };
  for (const p of candidates) {
    if (lots.length >= Math.floor((target - 1) * 0.9)) break;
    if (Math.hypot(p.x, p.z) < extent * 0.82) accept(p);
  }
  for (const p of candidates.filter(
    (p) => Math.hypot(p.x, p.z) >= extent * 0.82,
  )) {
    if (lots.length >= target - 1) break;
    accept(p);
  }
  for (const p of candidates) {
    if (lots.length >= target - 1) break;
    accept(p);
  }
  const usefulStreets = pruneCityStreets(streets, lots);
  streets.splice(0, streets.length, ...usefulStreets);
  const trees: CityLot[] = [];
  for (let i = 0; i < target * 5; i++) {
    const p = {
      x: (random() * 2 - 1) * extent,
      z: (random() * 2 - 1) * extent,
    };
    if (
      reserved(p, 3) ||
      waterDistance(p) < 6 ||
      streets.some((s) => lineDistance(p, s.points) < s.width / 2 + 2) ||
      lots.some((q) => Math.hypot(p.x - q.x, p.z - q.z) < 7)
    )
      continue;
    if (
      Math.hypot(p.x, p.z) < extent * 0.65 &&
      !parks.some((k) => Math.hypot(p.x - k.x, p.z - k.z) < k.r)
    )
      continue;
    trees.push({
      ...p,
      angle: random() * 6.28,
      scale: 0.5 + random() * 0.35,
      variant: random() < 0.2 ? "pine" : "tree",
    });
  }
  return {
    lots,
    streets,
    river: rivers[0],
    rivers,
    parks,
    trees,
    extent,
    sample,
  };
}
