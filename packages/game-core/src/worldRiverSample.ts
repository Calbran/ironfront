import { generateContinent } from "./geography";

type RiverPoint = { x: number; z: number };
/** Round drainage-grid corners without overshoot or moving either reach endpoint. */
export function smoothRiverReach(source: readonly RiverPoint[]) {
  let points = source.map((p) => ({ ...p }));
  for (let pass = 0; pass < 3 && points.length > 2; pass++) {
    const next: RiverPoint[] = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      next.push(
        { x: 0.75 * a.x + 0.25 * b.x, z: 0.75 * a.z + 0.25 * b.z },
        { x: 0.25 * a.x + 0.75 * b.x, z: 0.25 * a.z + 0.75 * b.z },
      );
    }
    next.push(points.at(-1)!);
    points = next;
  }
  return points;
}

const cache = new Map<number, ReturnType<typeof sample>>();
function sample(seed: number) {
  const worldSeed = `city-${seed >>> 0}`;
  const { geography } = generateContinent(worldSeed, 4);
  // The city study needs a reach without a reversal along its local corridor axis.
  // Split at reversals rather than flattening a meander into a synthetic curve.
  const candidates: {
    points: { x: number; z: number }[];
    angle: number;
    river: number;
    sourceStart: number;
  }[] = [];
  for (const [river, line] of geography.rivers.entries()) {
    for (let start = 0; start + 8 < line.length; start += 6) {
      const reach = line.slice(start, start + 24),
        first = reach[0],
        last = reach.at(-1)!;
      const length = Math.hypot(last[0] - first[0], last[1] - first[1]);
      if (length < 1) continue;
      const angle = Math.atan2(last[1] - first[1], last[0] - first[0]),
        c = Math.cos(angle),
        s = Math.sin(angle),
        scale = 330 / length;
      const points = reach.map(([x, y]) => ({
        x: ((x - first[0]) * c + (y - first[1]) * s) * scale - 165,
        z: (-(x - first[0]) * s + (y - first[1]) * c) * scale,
      }));
      if (
        points.some(
          (p, i) => Math.abs(p.z) > 35 || (i > 0 && p.x <= points[i - 1].x),
        )
      )
        continue;
      candidates.push({ points, angle, river, sourceStart: start });
    }
  }
  // Prefer a visible bend over perfectly straight grid segments.
  candidates.sort(
    (a, b) =>
      Math.max(...b.points.map((p) => Math.abs(p.z))) -
      Math.max(...a.points.map((p) => Math.abs(p.z))),
  );
  const chosen = candidates[(seed >>> 0) % Math.min(12, candidates.length)];
  if (!chosen) throw new Error(`No usable river reach in world ${worldSeed}`);
  const points = chosen.points;

  return {
    worldSeed,
    river: chosen.river,
    angle: chosen.angle,
    sourceStart: chosen.sourceStart,
    points,
    smoothPoints: smoothRiverReach(points),
  };
}
export function worldRiverSample(seed: number) {
  let result = cache.get(seed);
  if (!result) {
    result = sample(seed);
    if (cache.size >= 2) cache.delete(cache.keys().next().value!);
    cache.set(seed, result);
  }
  return result;
}
export function worldRiverBend(x: number, seed: number) {
  const { smoothPoints: points } = worldRiverSample(seed);
  if (x <= points[0].x) return points[0].z;
  if (x >= points.at(-1)!.x) return points.at(-1)!.z;
  let lo = 0,
    hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1;
    if (points[mid].x < x) lo = mid;
    else hi = mid;
  }
  const a = points[lo],
    b = points[hi];
  return a.z + ((b.z - a.z) * (x - a.x)) / (b.x - a.x);
}
