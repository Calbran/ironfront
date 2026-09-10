import type { MovementLayer } from "./mountainObstacles.ts";
import type { World, Region } from "./index.ts";
import { localPath, onLocalLand, type LocalPoint } from "./localMovement.ts";
export type RoutePoint = LocalPoint & { region?: number };
const gatewayGeometry = new WeakMap<
  Region,
  WeakMap<Region, { from: LocalPoint; to: LocalPoint }[]>
>();

function sharedGateways(a: Region, b: Region) {
  let byNeighbor = gatewayGeometry.get(a);
  if (!byNeighbor) {
    byNeighbor = new WeakMap();
    gatewayGeometry.set(a, byNeighbor);
  }
  const cached = byNeighbor.get(b);
  if (cached) return cached;
  const rings = (r: Region) => r.contours ?? [r.polygon];
  const options: { from: LocalPoint; to: LocalPoint }[] = [];
  for (const ar of rings(a))
    for (let i = 0; i < ar.length; i++) {
      const p = ar[i],
        q = ar[(i + 1) % ar.length],
        dx = q[0] - p[0],
        dy = q[1] - p[1],
        length = Math.hypot(dx, dy);
      if (!length) continue;
      for (const br of rings(b))
        for (let j = 0; j < br.length; j++) {
          const u = br[j],
            v = br[(j + 1) % br.length];
          const cross = (x: number[], y: number[]) =>
            dx * (y[1] - x[1]) - dy * (y[0] - x[0]);
          if (Math.abs(cross(p, u)) > 1e-6 || Math.abs(cross(p, v)) > 1e-6)
            continue;
          const project = (x: number[]) =>
            ((x[0] - p[0]) * dx + (x[1] - p[1]) * dy) / (length * length);
          const low = Math.max(0, Math.min(project(u), project(v))),
            high = Math.min(1, Math.max(project(u), project(v)));
          if (high - low < 1e-8) continue;
          const f = (low + high) / 2,
            x = p[0] + dx * f,
            y = p[1] + dy * f;
          for (const sign of [-1, 1])
            options.push({
              from: {
                x: x - (dy / length) * sign * 0.5,
                y: y + (dx / length) * sign * 0.5,
              },
              to: {
                x: x + (dy / length) * sign * 0.5,
                y: y - (dx / length) * sign * 0.5,
              },
            });
        }
    }
  byNeighbor.set(b, options);
  return options;
}

// A real shared edge supplies a small, continuous crossing, never a center-to-center jump.
function gateway(
  a: Region,
  b: Region,
  start: LocalPoint,
  end: LocalPoint,
  layer: MovementLayer,
) {
  const options: { from: LocalPoint; to: LocalPoint; score: number }[] = [];
  for (const { from, to } of sharedGateways(a, b))
    if (onLocalLand(a, from, layer) && onLocalLand(b, to, layer))
      options.push({
        from,
        to,
        score:
          Math.hypot(from.x - start.x, from.y - start.y) +
          Math.hypot(to.x - end.x, to.y - end.y),
      });
  return options.sort((a, b) => a.score - b.score);
}
export function crossRegionPath(
  w: World,
  start: LocalPoint,
  from: number,
  end: LocalPoint,
  layer: MovementLayer = "ground",
  excluded = new Set<string>(),
): RoutePoint[] {
  const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  const destination = w.regions.find((r) => onLocalLand(r, end, layer));
  if (!destination)
    throw Error("Choose traversable land, not water or mountains.");
  if (destination.id === from)
    return localPath(destination, start, end, layer).map((p) => ({
      ...p,
      region: from,
    }));
  const parents = new Map<number, number>([[from, from]]),
    queue = [from];
  for (let i = 0; i < queue.length && !parents.has(destination.id); i++)
    for (const n of w.regions[queue[i]].neighbors) {
      if (
        parents.has(n) ||
        excluded.has(edgeKey(queue[i], n)) ||
        (layer === "ground" && w.regions[n].terrain === "mountains")
      )
        continue;
      parents.set(n, queue[i]);
      queue.push(n);
    }
  if (!parents.has(destination.id))
    throw Error("No connected land route to that position.");
  const ids = [destination.id];
  while (ids.at(-1) !== from) ids.push(parents.get(ids.at(-1)!)!);
  ids.reverse();
  const result: RoutePoint[] = [];
  let at = start;
  for (let i = 1; i < ids.length; i++) {
    const a = w.regions[ids[i - 1]],
      b = w.regions[ids[i]];
    let connected = false;
    for (const gate of gateway(a, b, at, end, layer)) {
      try {
        const leg = localPath(a, at, gate.from, layer);
        if (i === ids.length - 1) localPath(b, gate.to, end, layer);
        result.push(...leg.map((p) => ({ ...p, region: a.id })), {
          ...gate.to,
          region: b.id,
        });
        at = gate.to;
        connected = true;
        break;
      } catch {
        /* Try another border opening. */
      }
    }
    if (!connected) {
      excluded.add(edgeKey(a.id, b.id));
      return crossRegionPath(w, start, from, end, layer, excluded);
    }
  }
  return [
    ...result,
    ...localPath(destination, at, end, layer).map((p) => ({
      ...p,
      region: destination.id,
    })),
  ];
}
