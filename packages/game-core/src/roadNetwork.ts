import type { CityRoad } from "./cityRoads.ts";
import type { RoutePoint } from "./crossRegionPath.ts";
const key = (p: RoutePoint) => `${p.x.toFixed(5)},${p.y.toFixed(5)}`;
const edgeKey = (a: RoutePoint, b: RoutePoint) =>
  [key(a), key(b)].sort().join("|");
/** Split actual intersections, then remove redundant physical circuits before tracing routes. */
export function consolidateRoads(roads: CityRoad[]): void {
  const segments = roads
    .flatMap((r) =>
      r.points.slice(1).map((b, i) => ({ a: r.points[i], b, cuts: [0, 1] })),
    )
    .filter((s) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) > 1e-6);
  const cross = (x: number, y: number, u: number, v: number) => x * v - y * u;
  for (let i = 0; i < segments.length; i++)
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i],
        b = segments[j];
      if (
        Math.max(a.a.x, a.b.x) + 1e-6 < Math.min(b.a.x, b.b.x) ||
        Math.max(b.a.x, b.b.x) + 1e-6 < Math.min(a.a.x, a.b.x) ||
        Math.max(a.a.y, a.b.y) + 1e-6 < Math.min(b.a.y, b.b.y) ||
        Math.max(b.a.y, b.b.y) + 1e-6 < Math.min(a.a.y, a.b.y)
      )
        continue;
      const dx = a.b.x - a.a.x,
        dy = a.b.y - a.a.y,
        ex = b.b.x - b.a.x,
        ey = b.b.y - b.a.y,
        ux = b.a.x - a.a.x,
        uy = b.a.y - a.a.y,
        det = cross(dx, dy, ex, ey);
      if (Math.abs(det) > 1e-8) {
        const t = cross(ux, uy, ex, ey) / det,
          u = cross(ux, uy, dx, dy) / det;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
          a.cuts.push(t);
          b.cuts.push(u);
        }
      } else if (Math.abs(cross(ux, uy, dx, dy)) < 1e-6) {
        for (const p of [b.a, b.b]) {
          const t =
            ((p.x - a.a.x) * dx + (p.y - a.a.y) * dy) / (dx * dx + dy * dy);
          if (t > 0 && t < 1) a.cuts.push(t);
        }
        for (const p of [a.a, a.b]) {
          const t =
            ((p.x - b.a.x) * ex + (p.y - b.a.y) * ey) / (ex * ex + ey * ey);
          if (t > 0 && t < 1) b.cuts.push(t);
        }
      }
    }
  const points = new Map<string, RoutePoint>(),
    edges = new Map<string, { a: string; b: string; length: number }>();
  for (const s of segments) {
    const cuts = [...new Set(s.cuts)].sort((a, b) => a - b);
    const path = cuts.map((t) =>
      t === 0
        ? s.a
        : t === 1
          ? s.b
          : {
              x: s.a.x + (s.b.x - s.a.x) * t,
              y: s.a.y + (s.b.y - s.a.y) * t,
              region: s.a.region,
            },
    );
    for (const p of path) points.set(key(p), p);
    for (let i = 1; i < path.length; i++) {
      const a = key(path[i - 1]),
        b = key(path[i]);
      if (a === b) continue;
      edges.set(edgeKey(path[i - 1], path[i]), {
        a,
        b,
        length: Math.hypot(
          path[i].x - path[i - 1].x,
          path[i].y - path[i - 1].y,
        ),
      });
    }
  }
  const parent = new Map([...points.keys()].map((k) => [k, k]));
  const root = (k: string): string => {
    const p = parent.get(k)!;
    if (p === k) return k;
    const r = root(p);
    parent.set(k, r);
    return r;
  };
  const graph = new Map<string, string[]>();
  for (const e of [...edges.values()].sort(
    (a, b) =>
      a.length - b.length || a.a.localeCompare(b.a) || a.b.localeCompare(b.b),
  )) {
    const a = root(e.a),
      b = root(e.b);
    if (a === b) continue;
    parent.set(a, b);
    for (const [u, v] of [
      [e.a, e.b],
      [e.b, e.a],
    ]) {
      const links = graph.get(u) ?? [];
      links.push(v);
      graph.set(u, links);
    }
  }
  for (const road of roads) {
    const start = key(road.points[0]),
      end = key(road.points.at(-1)!);
    const prev = new Map([[start, start]]),
      queue = [start];
    for (let i = 0; i < queue.length && !prev.has(end); i++)
      for (const n of graph.get(queue[i]) ?? [])
        if (!prev.has(n)) {
          prev.set(n, queue[i]);
          queue.push(n);
        }
    if (!prev.has(end))
      throw Error("Road consolidation lost a settlement connection");
    const ids = [end];
    while (ids.at(-1) !== start) ids.push(prev.get(ids.at(-1)!)!);
    road.points = ids.reverse().map((id) => points.get(id)!);
  }
}
/** Rendering and decorations consume each physical stretch exactly once. */
export function uniqueRoadSegments(roads: readonly CityRoad[]): CityRoad[] {
  const result = new Map<string, CityRoad>();
  for (const road of roads)
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        id = edgeKey(a, b),
        existing = result.get(id);
      if (existing) {
        if (road.kind === "main") existing.kind = "main";
        existing.utilities ||= road.utilities;
        continue;
      }
      result.set(id, { ...road, points: [a, b], bridges: [] });
    }
  return [...result.values()];
}
