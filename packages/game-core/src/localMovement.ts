import { blockedByTerrainLayout } from "./terrainLayout.ts";
import { blockedByMountains, type MovementLayer } from "./mountainObstacles.ts";
import { crossRegionPath, type RoutePoint } from "./crossRegionPath.ts";
import type { World, Region } from "./index.ts";
import type { Squad } from "./tactics.ts";
export type LocalPoint = { x: number; y: number };
export interface LocalOrder {
  attackTarget?: string;
  movementGroup?: number;
  region: number;
  retreat?: boolean;
  mode: "move" | "hold";
  waypoints: LocalPoint[];
  path: RoutePoint[];
}
const rings = (r: Region) => r.contours ?? [r.polygon];

const formationKindOrder: Record<Squad["kind"], number> = {
  infantry: 0,
  garrison: 1,
  artillery: 2,
  motorized: 3,
  armor: 4,
};

/**
 * Spread a group across short, stable lanes around the commanded point. This is
 * deliberately resolved when the order is issued rather than as collision
 * impulses during ticks, so saved orders and replays remain deterministic.
 */
function formationPoints(
  w: World,
  squads: Squad[],
  points: LocalPoint[],
  append: boolean,
): Map<string, LocalPoint[]> {
  const result = new Map(squads.map((s) => [s.id, [] as LocalPoint[]]));
  if (squads.length === 1) {
    result.set(
      squads[0].id,
      points.map((p) => ({ ...p })),
    );
    return result;
  }
  const ordered = [...squads].sort(
    (a, b) =>
      formationKindOrder[a.kind] - formationKindOrder[b.kind] ||
      a.id.localeCompare(b.id),
  );
  let anchor = {
    x:
      squads.reduce(
        (sum, s) =>
          sum + (append ? (s.localOrder?.path.at(-1)?.x ?? s.x) : s.x),
        0,
      ) / squads.length,
    y:
      squads.reduce(
        (sum, s) =>
          sum + (append ? (s.localOrder?.path.at(-1)?.y ?? s.y) : s.y),
        0,
      ) / squads.length,
  };
  for (const point of points) {
    const destination = w.regions.find((r) =>
      onLocalLand(r, point, squads[0].movementLayer),
    )!;
    const length = Math.hypot(point.x - anchor.x, point.y - anchor.y);
    const forward =
      length > 1e-6
        ? { x: (point.x - anchor.x) / length, y: (point.y - anchor.y) / length }
        : { x: 0, y: -1 };
    const right = { x: -forward.y, y: forward.x };
    const gap = Math.max(18, Math.min(36, Math.sqrt(destination.area) * 0.06));
    const columns = Math.min(5, ordered.length);
    const rows = Math.ceil(ordered.length / columns);
    const accepted: LocalPoint[] = [];
    ordered.forEach((s, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const lateral =
        (column - (Math.min(columns, ordered.length - row * columns) - 1) / 2) *
        gap;
      const longitudinal = (row - (rows - 1) / 2) * gap;
      const desired = {
        x: point.x + right.x * lateral + forward.x * longitudinal,
        y: point.y + right.y * lateral + forward.y * longitudinal,
      };
      const candidates = [1, 0.75, 0.5, 0.25].map((factor) => ({
        x: point.x + (desired.x - point.x) * factor,
        y: point.y + (desired.y - point.y) * factor,
      }));
      const placed = candidates.find(
        (candidate) =>
          onLocalLand(destination, candidate, s.movementLayer) &&
          accepted.every(
            (other) =>
              Math.hypot(candidate.x - other.x, candidate.y - other.y) >=
              gap * 0.45,
          ),
      ) ?? { ...point };
      accepted.push(placed);
      result.get(s.id)!.push(placed);
    });
    anchor = point;
  }
  return result;
}

export function blockedByRegion(
  r: Region,
  a: LocalPoint,
  b = a,
  layer: MovementLayer = "ground",
) {
  return (
    blockedByMountains(r.mountainObstacles, a, b, layer) ||
    blockedByTerrainLayout(r.terrainLayout, a, b, layer)
  );
}

export function onLocalLand(
  r: Region,
  p: LocalPoint,
  layer: MovementLayer = "ground",
): boolean {
  if (
    (layer === "ground" && r.terrain === "mountains") ||
    blockedByRegion(r, p, p, layer) ||
    !Number.isFinite(p.x) ||
    !Number.isFinite(p.y)
  )
    return false;
  let hit = false;
  for (const ring of rings(r))
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i],
        b = ring[j];
      if (
        a[1] > p.y !== b[1] > p.y &&
        p.x < ((b[0] - a[0]) * (p.y - a[1])) / (b[1] - a[1]) + a[0]
      )
        hit = !hit;
    }
  return hit;
}
// Check every boundary crossing, including holes and concave coastlines.
export function localSegment(
  r: Region,
  a: LocalPoint,
  b: LocalPoint,
  layer: MovementLayer = "ground",
): boolean {
  if (
    !onLocalLand(r, a, layer) ||
    !onLocalLand(r, b, layer) ||
    blockedByRegion(r, a, b, layer)
  )
    return false;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const cuts = [0, 1];
  for (const ring of rings(r))
    for (let i = 0; i < ring.length; i++) {
      const c = ring[i],
        d = ring[(i + 1) % ring.length];
      const ex = d[0] - c[0],
        ey = d[1] - c[1],
        det = dx * ey - dy * ex;
      if (Math.abs(det) < 1e-10) continue;
      const t = ((c[0] - a.x) * ey - (c[1] - a.y) * ex) / det;
      const u = ((c[0] - a.x) * dy - (c[1] - a.y) * dx) / det;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
    }
  cuts.sort((x, y) => x - y);
  return cuts.slice(1).every((t, i) => {
    const f = (t + cuts[i]) / 2;
    return onLocalLand(r, { x: a.x + dx * f, y: a.y + dy * f }, layer);
  });
}
const airGrids = new WeakMap<
  Region,
  {
    points: LocalPoint[];
    indices: Map<string, number>;
    neighbors: number[][];
    step: number;
  }
>();
const grids = new WeakMap<
  Region,
  {
    points: LocalPoint[];
    indices: Map<string, number>;
    neighbors: number[][];
    step: number;
  }
>();
export function invalidateLocalPaths(r: Region) {
  grids.delete(r);
  airGrids.delete(r);
}
export function localPath(
  r: Region,
  start: LocalPoint,
  end: LocalPoint,
  layer: MovementLayer = "ground",
): LocalPoint[] {
  if (!onLocalLand(r, start, layer) || !onLocalLand(r, end, layer))
    throw Error("Choose a land position inside the squad's current region.");
  if (localSegment(r, start, end, layer)) return [{ ...end }];
  const cache = layer === "air" ? airGrids : grids;
  let grid = cache.get(r);
  if (!grid) {
    const vertices = rings(r).flat(),
      step = r.navigationCellSize ?? 8;
    const minX =
      Math.floor(Math.min(...vertices.map((p) => p[0])) / step) * step +
      step / 2;
    const minY =
      Math.floor(Math.min(...vertices.map((p) => p[1])) / step) * step +
      step / 2;
    const maxX = Math.max(...vertices.map((p) => p[0])),
      maxY = Math.max(...vertices.map((p) => p[1]));
    const points: LocalPoint[] = [],
      indices = new Map<string, number>();
    for (let y = minY; y < maxY; y += step)
      for (let x = minX; x < maxX; x += step) {
        if (onLocalLand(r, { x, y }, layer)) {
          indices.set(`${x},${y}`, points.length);
          points.push({ x, y });
        }
      }
    const neighbors = Array.from(
      { length: points.length },
      () => [] as number[],
    );
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      for (const [dx, dy] of [
        [step, 0],
        [0, step],
      ]) {
        const n = indices.get(`${p.x + dx},${p.y + dy}`);
        if (n === undefined || !localSegment(r, p, points[n], layer)) continue;
        neighbors[i].push(n);
        neighbors[n].push(i);
      }
    }
    grid = { points, indices, neighbors, step };
    cache.set(r, grid);
  }
  const nearest = (p: LocalPoint) => {
    let closest: number | undefined,
      closestSquared = Infinity;
    const reach = grid!.step * 3,
      reachSquared = reach * reach;
    // This lookup is on every local route leg. Avoid allocating and sorting the
    // entire region grid merely to inspect the handful of nearby cells.
    for (let i = 0; i < grid!.points.length; i++) {
      const q = grid!.points[i],
        dx = q.x - p.x,
        dy = q.y - p.y,
        distanceSquared = dx * dx + dy * dy;
      if (
        distanceSquared > reachSquared ||
        distanceSquared >= closestSquared ||
        !localSegment(r, p, q, layer)
      )
        continue;
      closest = i;
      closestSquared = distanceSquared;
    }
    return closest;
  };
  const from = nearest(start),
    to = nearest(end);
  if (from === undefined || to === undefined)
    throw Error("No traversable local route. Choose another position.");
  const parent = new Int32Array(grid.points.length).fill(-1),
    queue = [from];
  parent[from] = from;
  for (let head = 0; head < queue.length && parent[to] === -1; head++) {
    const i = queue[head];
    for (const n of grid.neighbors[i]) {
      if (parent[n] !== -1) continue;
      parent[n] = i;
      queue.push(n);
    }
  }
  if (parent[to] === -1)
    throw Error("No traversable local route. Choose another position.");
  const reverse = [to];
  while (reverse.at(-1) !== from) reverse.push(parent[reverse.at(-1)!]);
  const route = [start, ...reverse.reverse().map((i) => grid!.points[i]), end];
  const result: LocalPoint[] = [];
  let anchor = 0;
  while (anchor < route.length - 1) {
    let next = anchor + 1;
    while (
      next + 1 < route.length &&
      localSegment(r, route[anchor], route[next + 1], layer)
    )
      next++;
    result.push({ ...route[next] });
    anchor = next;
  }
  return result;
}
export function orderSquads(
  w: World,
  owner: number,
  ids: string[],
  mode: "move" | "hold",
  points: LocalPoint[],
  append = false,
) {
  if (!ids.length || ids.length > 32 || new Set(ids).size !== ids.length)
    throw Error("Select up to 32 distinct squads.");
  if (
    !["move", "hold"].includes(mode) ||
    points.length > 8 ||
    (mode === "move" && !points.length) ||
    (mode === "hold" && (points.length || append))
  )
    throw Error("Choose Hold or up to eight movement waypoints.");
  const squads = ids.map((id) => {
    const s = w.tactics?.squads.find((s) => s.id === id);
    const a = w.armies.find((a) => a.id === s?.army);
    if (!s || !a || a.owner !== owner || s.owner !== owner || s.strength <= 0)
      throw Error("You can only position your own living squads.");
    if (s.action === "retreating")
      throw Error("Wait for this squad to finish retreating.");
    const region = w.regions[s.region];
    if (!region || !onLocalLand(region, s, s.movementLayer))
      throw Error("Squad is not on traversable land.");
    return s;
  });
  // Validate common destinations before deriving nearby formation slots.
  for (const point of points)
    if (
      squads.some(
        (s) => !w.regions.some((r) => onLocalLand(r, point, s.movementLayer)),
      )
    )
      throw Error("Choose traversable land, not water or mountains.");
  const assigned = formationPoints(w, squads, points, append);
  const plans = squads.map((s) => {
    const previous = append ? s.localOrder : undefined;
    const squadPoints = assigned.get(s.id)!;
    const waypoints = [
      ...(previous?.waypoints ?? []),
      ...squadPoints.map((p) => ({ ...p })),
    ];
    if (waypoints.length > 8)
      throw Error("A squad can queue at most eight waypoints.");
    let start: RoutePoint = previous?.path.at(-1) ?? s;
    let from = start.region ?? s.region;
    const path = [...(previous?.path ?? [])];
    for (let i = 0; i < squadPoints.length; i++) {
      const point = squadPoints[i];
      let leg: RoutePoint[];
      try {
        leg = crossRegionPath(w, start, from, point, s.movementLayer);
      } catch (error) {
        // A nearby slot can be individually unreachable across pathological
        // legacy coastlines. The shared clicked point remains the safe fallback.
        leg = crossRegionPath(w, start, from, points[i], s.movementLayer);
        waypoints[waypoints.length - squadPoints.length + i] = { ...points[i] };
      }
      path.push(...leg);
      start = leg.at(-1)!;
      from = start.region!;
    }
    return {
      s,
      order: { region: s.region, mode, waypoints, path } satisfies LocalOrder,
    };
  });
  // Taking direct control retires the parent movement plan, without moving siblings.
  for (const armyId of new Set(plans.map(({ s }) => s.army))) {
    const army = w.armies.find((a) => a.id === armyId)!;
    army.order = "hold";
    army.route = [];
    army.target = null;
    army.progress = 0;
    army.status = "Following squad orders";
    delete army.cover;
    for (const sibling of w.tactics!.squads.filter((s) => s.army === armyId)) {
      sibling.independent = true;
      sibling.localOrder ??= {
        region: sibling.region,
        mode: "hold",
        path: [],
        waypoints: [],
      };
    }
  }
  // Each accepted group order has a persistent identity; a replacement order detaches its recipients.
  const movementGroup =
    mode === "move" && plans.length > 1
      ? (w.tactics!.movementSequence = (w.tactics!.movementSequence ?? 0) + 1)
      : undefined;
  // Validate every member before committing any part of a group order.
  for (const { s, order } of plans) {
    delete s.garrisonSite;
    delete s.captureSite;
    s.independent = true;
    s.localOrder = {
      ...order,
      ...(movementGroup === undefined ? {} : { movementGroup }),
    };
    s.target = null;
    s.action = mode === "move" ? "moving" : "holding";
  }
}
export function localSpeed(w: World, s: Squad): number {
  return (
    Math.max(20, Math.min(100, Math.sqrt(w.regions[s.region].area) * 0.22)) *
    (s.kind === "motorized" ? 0.9 : 0.6) *
    (s.kind === "armor" && w.regions[s.region].terrain === "forest" ? 0.4 : 1) *
    (1 - s.suppression * 0.6)
  );
}
export function movementSpeed(w: World, s: Squad): number {
  const group = s.localOrder?.movementGroup;
  if (group === undefined || s.localOrder?.retreat) return localSpeed(w, s);
  const members = w.tactics!.squads.filter(
    (other) =>
      other.owner === s.owner &&
      other.strength > 0 &&
      other.localOrder?.movementGroup === group &&
      other.localOrder.mode === "move" &&
      !other.localOrder.retreat,
  );
  return Math.min(
    localSpeed(w, s),
    ...members.map((member) => localSpeed(w, member)),
  );
}
export function stepLocal(
  w: World,
  s: Squad,
  hours: number,
  speed = movementSpeed(w, s),
) {
  const order = s.localOrder;
  if (!order || s.strength <= 0) return;
  let distance = speed * hours;
  while (order.path.length && distance > 0) {
    let next = order.path[0];
    if (
      blockedByRegion(w.regions[s.region], s, next, s.movementLayer) ||
      blockedByRegion(
        w.regions[next.region ?? s.region],
        s,
        next,
        s.movementLayer,
      )
    ) {
      try {
        let from = s.region,
          start: LocalPoint = s;
        const route: RoutePoint[] = [];
        for (const point of order.waypoints.length
          ? order.waypoints
          : [order.path.at(-1)!]) {
          const leg = crossRegionPath(w, start, from, point, s.movementLayer);
          route.push(...leg);
          start = leg.at(-1)!;
          from = leg.at(-1)!.region!;
        }
        order.path = route;
        next = route[0];
        if (!next) break;
      } catch {
        order.path = [];
        order.waypoints = [];
        break;
      }
    }
    // Do not march onward through contested land: win or withdraw first.
    if (
      !order.retreat &&
      next.region !== undefined &&
      next.region !== s.region &&
      w.regions[s.region].owner !== s.owner &&
      w.regions[next.region].owner !== s.owner
    )
      break;
    if (
      !order.retreat &&
      next.region !== undefined &&
      next.region !== s.region &&
      w.regions[next.region].owner !== s.owner &&
      w.regions[s.region].consolidation > 0
    )
      break;
    const length = Math.hypot(next.x - s.x, next.y - s.y);
    const fraction = Math.min(1, distance / Math.max(1e-9, length));
    s.x += (next.x - s.x) * fraction;
    s.y += (next.y - s.y) * fraction;
    if (
      next.region !== undefined &&
      next.region !== s.region &&
      onLocalLand(w.regions[next.region], s, s.movementLayer)
    ) {
      s.region = next.region;
      order.region = s.region;
    }
    distance -= length;
    if (fraction === 1) {
      if (next.region !== undefined) s.region = next.region;
      order.region = s.region;
      order.path.shift();
      if (order.waypoints[0]?.x === next.x && order.waypoints[0]?.y === next.y)
        order.waypoints.shift();
    }
  }
  if (!order.path.length) {
    order.mode = "hold";
    order.waypoints = [];
    delete order.retreat;
  }
  s.action = order.retreat
    ? "retreating"
    : order.path.length
      ? "moving"
      : "holding";
}
