import { consolidateRoads } from "./roadNetwork.ts";
import type { World } from "./index.ts";
import { crossRegionPath, type RoutePoint } from "./crossRegionPath.ts";
import { localSegment, onLocalLand } from "./localMovement.ts";
export interface CityRoad {
  from: string;
  to: string;
  points: RoutePoint[];
  utilities: boolean;
  kind: "main" | "local";
  bridges: { x: number; y: number; angle: number }[];
}
function riverCrossings(w: World, path: RoutePoint[]) {
  let count = 0;
  for (let i = 1; i < path.length; i++) {
    const p = path[i - 1],
      q = path[i],
      dx = q.x - p.x,
      dy = q.y - p.y;
    for (const river of w.geography?.rivers ?? [])
      for (let j = 1; j < river.length; j++) {
        const u = river[j - 1],
          v = river[j],
          rx = v[0] - u[0],
          ry = v[1] - u[1];
        const det = dx * ry - dy * rx;
        if (Math.abs(det) < 1e-8) continue;
        const ux = u[0] - p.x,
          uy = u[1] - p.y;
        const t = (ux * ry - uy * rx) / det,
          f = (ux * dy - uy * dx) / det;
        if (t >= 0 && t <= 1 && f >= 0 && f <= 1) count++;
      }
  }
  return count;
}
/** Connected settlement network, with a major-city backbone and sparse alternate routes. */
export function generateCityRoads(w: World): CityRoad[] {
  const cell = w.geography?.cellSize ?? 8;
  const sites = w.regions.flatMap((r) =>
    (r.features ?? [])
      .filter((f) => f.kind === "settlement" && onLocalLand(r, f))
      .map((f) => ({ ...f, region: r.id })),
  );
  const pairs = sites
    .flatMap((a, i) =>
      sites
        .slice(i + 1)
        .map((b) => ({ a, b, d: Math.hypot(a.x - b.x, a.y - b.y) })),
    )
    .sort(
      (a, b) =>
        a.d - b.d ||
        a.a.id.localeCompare(b.a.id) ||
        a.b.id.localeCompare(b.b.id),
    );
  const roads: CityRoad[] = [];
  const parents = new Map(sites.map((s) => [s.id, s.id]));
  const root = (id: string): string => {
    const parent = parents.get(id)!;
    if (parent === id) return id;
    const result = root(parent);
    parents.set(id, result);
    return result;
  };
  const linked = new Set<string>();
  const graph = new Map<string, { id: string; length: number }[]>();
  const routeLength = (from: string, to: string) => {
    const distances = new Map([[from, 0]]),
      pending = new Set([from]);
    while (pending.size) {
      const at = [...pending].reduce((a, b) =>
        distances.get(a)! < distances.get(b)! ? a : b,
      );
      pending.delete(at);
      if (at === to) return distances.get(at)!;
      for (const edge of graph.get(at) ?? []) {
        const next = distances.get(at)! + edge.length;
        if (next < (distances.get(edge.id) ?? Infinity)) {
          distances.set(edge.id, next);
          pending.add(edge.id);
        }
      }
    }
    return Infinity;
  };
  // First connect components; then add a few useful loops, never a complete mesh.
  for (const pass of [0, 1])
    for (const { a, b, d } of pairs) {
      const key = `${a.id}:${b.id}`;
      if (linked.has(key)) continue;
      if (pass === 0 && root(a.id) === root(b.id)) continue;
      if (
        pass === 1 &&
        (roads.length >= sites.length - 1 + Math.ceil(sites.length * 0.12) ||
          d > cell * 100 ||
          (graph.get(a.id)?.length ?? 0) >= 4 ||
          (graph.get(b.id)?.length ?? 0) >= 4 ||
          routeLength(a.id, b.id) < d * 2.5)
      )
        continue;
      let route: RoutePoint[];
      try {
        route = [
          { x: a.x, y: a.y, region: a.region },
          ...crossRegionPath(w, a, a.region, b),
        ];
      } catch {
        continue;
      }
      const length = route
        .slice(1)
        .reduce(
          (n, p, i) => n + Math.hypot(p.x - route[i].x, p.y - route[i].y),
          0,
        );
      if (
        pass === 1 &&
        (length > d * 1.8 || routeLength(a.id, b.id) < length * 2)
      )
        continue;
      let hash = 2166136261;
      for (const ch of `${w.seed}:${a.id}:${b.id}:roads`)
        hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
      const phase = ((hash >>> 0) / 4294967296) * Math.PI * 2;
      const points: RoutePoint[] = [route[0]];
      for (let i = 1; i < route.length; i++) {
        const start = route[i - 1],
          end = route[i],
          dx = end.x - start.x,
          dy = end.y - start.y,
          len = Math.hypot(dx, dy),
          steps = Math.max(1, Math.ceil(len / (cell * 5)));
        const candidates: RoutePoint[] = [];
        for (let j = 1; j < steps; j++) {
          const t = j / steps,
            offset =
              Math.sin(t * Math.PI) *
              Math.sin(phase + i + t * 4) *
              Math.min(cell * 1.4, len * 0.12);
          candidates.push({
            x: start.x + dx * t - (dy / len) * offset,
            y: start.y + dy * t + (dx / len) * offset,
            region: start.region,
          });
        }
        let chosen = [start, end];
        if (start.region === end.region) {
          const options = [[start, ...candidates, end]];
          // Gentle bank-side detours prevent a road weaving repeatedly across a river.
          for (const offset of [-cell * 4, cell * 4, -cell * 8, cell * 8]) {
            const arc: RoutePoint[] = [start];
            for (let j = 1; j < steps; j++) {
              const t = j / steps,
                shift =
                  Math.sin(t * Math.PI) *
                  Math.min(Math.abs(offset), len * 0.2) *
                  Math.sign(offset);
              arc.push({
                x: start.x + dx * t - (dy / len) * shift,
                y: start.y + dy * t + (dx / len) * shift,
                region: start.region,
              });
            }
            options.push([...arc, end]);
          }
          let best = riverCrossings(w, chosen);
          // The seeded curve wins ties; larger bank detours must reduce crossings.
          for (const [index, option] of options.entries()) {
            const crossings = riverCrossings(w, option);
            if (
              (crossings < best || (index === 0 && crossings === best)) &&
              option
                .slice(1)
                .every((p, j) =>
                  localSegment(w.regions[start.region!], option[j], p),
                )
            ) {
              best = crossings;
              chosen = option;
            }
          }
        }
        points.push(...chosen.slice(1));
      }
      const bridges: CityRoad["bridges"] = [];
      for (let i = 1; i < points.length; i++) {
        const p = points[i - 1],
          q = points[i];
        const dx = q.x - p.x,
          dy = q.y - p.y;
        for (const river of w.geography?.rivers ?? [])
          for (let j = 1; j < river.length; j++) {
            const u = river[j - 1],
              v = river[j];
            const rx = v[0] - u[0],
              ry = v[1] - u[1],
              det = dx * ry - dy * rx;
            if (Math.abs(det) < 1e-8) continue;
            const ux = u[0] - p.x,
              uy = u[1] - p.y;
            const t = (ux * ry - uy * rx) / det,
              f = (ux * dy - uy * dx) / det;
            if (t < 0 || t > 1 || f < 0 || f > 1) continue;
            const x = p.x + dx * t,
              y = p.y + dy * t;
            if (bridges.some((b) => Math.hypot(b.x - x, b.y - y) < cell))
              continue;
            bridges.push({ x, y, angle: Math.atan2(dy, dx) });
          }
      }
      roads.push({
        from: a.id,
        to: b.id,
        points,
        utilities: length < cell * 65,
        kind: "local",
        bridges,
      });
      linked.add(key);
      parents.set(root(a.id), root(b.id));
      for (const [from, to] of [
        [a.id, b.id],
        [b.id, a.id],
      ]) {
        const edges = graph.get(from) ?? [];
        edges.push({ id: to, length });
        graph.set(from, edges);
      }
    }
  // Keep the connecting backbone after pruning minor-town leaf branches.
  const major = new Set(
    sites
      .filter(
        (s) =>
          s.size === "city" ||
          s.size === "metropolis" ||
          (w.regions[s.region].features?.find((f) => f.kind === "settlement")
            ?.id === s.id &&
            w.nations.some((n) => n.capital === s.region)),
      )
      .map((s) => s.id),
  );
  const active = new Set(roads);
  const degree = new Map(
    sites.map((s) => [s.id, graph.get(s.id)?.length ?? 0]),
  );
  const leaves = sites
    .filter((s) => !major.has(s.id) && degree.get(s.id)! <= 1)
    .map((s) => s.id);
  for (let i = 0; i < leaves.length; i++) {
    const id = leaves[i];
    for (const road of active)
      if (road.from === id || road.to === id) {
        active.delete(road);
        const other = road.from === id ? road.to : road.from;
        degree.set(other, degree.get(other)! - 1);
        if (!major.has(other) && degree.get(other) === 1) leaves.push(other);
      }
  }
  for (const road of active) road.kind = "main";
  consolidateRoads(roads);
  for (const road of roads) {
    road.bridges = [];
    for (let i = 1; i < road.points.length; i++) {
      const p = road.points[i - 1],
        q = road.points[i],
        dx = q.x - p.x,
        dy = q.y - p.y;
      for (const river of w.geography?.rivers ?? [])
        for (let j = 1; j < river.length; j++) {
          const u = river[j - 1],
            v = river[j],
            rx = v[0] - u[0],
            ry = v[1] - u[1],
            det = dx * ry - dy * rx;
          if (Math.abs(det) < 1e-8) continue;
          const ux = u[0] - p.x,
            uy = u[1] - p.y,
            t = (ux * ry - uy * rx) / det,
            f = (ux * dy - uy * dx) / det;
          if (t < 0 || t > 1 || f < 0 || f > 1) continue;
          const x = p.x + dx * t,
            y = p.y + dy * t;
          if (!road.bridges.some((b) => Math.hypot(b.x - x, b.y - y) < cell))
            road.bridges.push({ x, y, angle: Math.atan2(dy, dx) });
        }
    }
  }
  return roads;
}
