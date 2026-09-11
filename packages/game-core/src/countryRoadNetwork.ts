import type { World } from "./index";
import { terrainHeight, type TerrainSurface } from "./connectedTerrain";
import type { RuralField } from "./pacingCountryside";
import { hitsRect } from "./pacingCorridor";

export type RoadPoint = { x: number; y: number };
/** Radius/entrance offsets are already converted to logical world coordinates. */
export type RoadDestination = RoadPoint & {
  id: string;
  name: string;
  major: boolean;
  radius: number;
  entrances: RoadPoint[];
};
export type CountryRoad = {
  id: string;
  highway: boolean;
  width: number;
  startWidth?: number;
  transitionLength?: number;
  path: RoadPoint[];
};

/** Physical width eases out of the city throat after its junction clearance. */
export function countryRoadWidthAt(road: CountryRoad, distance: number) {
  if (road.startWidth === undefined) return road.width;
  const t = Math.max(
    0,
    Math.min(1, (distance - 6) / (road.transitionLength ?? 32)),
  );
  return road.startWidth + (road.width - road.startWidth) * t * t * (3 - 2 * t);
}
export type CountryBridge = {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
};
export type CountryRoadNetwork = {
  roads: CountryRoad[];
  bridges: CountryBridge[];
  connections: { from: string; to: string; highway: boolean }[];
  unreachable: { id: string; name: string; reason: string }[];
  connectedSites: number;
  components: number;
  scale: number;
  step: number;
};
export const COUNTRY_HIGHWAY_WIDTH = 6;

/** Keep bends on the banks: the road and its physical crossing share one straight axis. */
export function alignBridgeApproaches(network: CountryRoadNetwork) {
  for (const bridge of network.bridges) {
    const c = Math.cos(bridge.angle),
      s = Math.sin(bridge.angle);
    const local = (p: RoadPoint) => ({
      along: ((p.x - bridge.x) * c + (p.y - bridge.y) * s) * network.scale,
      across: (-(p.x - bridge.x) * s + (p.y - bridge.y) * c) * network.scale,
    });
    for (const road of network.roads) {
      const crossing = road.path.findIndex((p, i) => {
        if (!i) return false;
        const a = local(road.path[i - 1]),
          b = local(p);
        const t = -a.along / (b.along - a.along);
        return (
          t >= 0 &&
          t <= 1 &&
          Math.abs(a.across + (b.across - a.across) * t) < 0.1
        );
      });
      if (crossing < 1) continue;
      let first = crossing - 1,
        last = crossing;
      const reach = bridge.length / 2 + 8;
      while (first > 0 && Math.abs(local(road.path[first]).along) < reach)
        first--;
      while (
        last < road.path.length - 1 &&
        Math.abs(local(road.path[last]).along) < reach
      )
        last++;
      const direction =
        Math.sign(
          local(road.path[last]).along - local(road.path[first]).along,
        ) || 1;
      const end = (sign: number): RoadPoint => ({
        x: bridge.x + (c * sign * bridge.length) / (2 * network.scale),
        y: bridge.y + (s * sign * bridge.length) / (2 * network.scale),
      });
      road.path.splice(
        first + 1,
        last - first - 1,
        end(-direction),
        end(direction),
      );
    }
  }
}
export const COUNTRY_LOCAL_ROAD_WIDTH = 3;
const MAX_ROAD_GRADE = 0.18;
const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
const distance = (a: RoadPoint, b: RoadPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

class Heap {
  items: { node: number; cost: number }[] = [];
  push(node: number, cost: number) {
    const item = { node, cost };
    let i = this.items.length;
    this.items.push(item);
    while (i) {
      const p = (i - 1) >> 1;
      if (this.items[p].cost <= cost) break;
      this.items[i] = this.items[p];
      i = p;
    }
    this.items[i] = item;
  }
  pop() {
    const first = this.items[0],
      last = this.items.pop()!;
    if (this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let c = i * 2 + 1;
        if (
          c + 1 < this.items.length &&
          this.items[c + 1].cost < this.items[c].cost
        )
          c++;
        if (this.items[c].cost >= last.cost) break;
        this.items[i] = this.items[c];
        i = c;
      }
      this.items[i] = last;
    }
    return first;
  }
}

/** One weighted flood connects every reachable destination, with shared approaches. */
export function buildCountryRoadNetwork(
  world: World,
  surface: TerrainSurface,
  destinations: readonly RoadDestination[],
): CountryRoadNetwork {
  const { cols, rows, step, scale, heights, land, biomes } = surface,
    n = land.length;
  const result: CountryRoadNetwork = {
    roads: [],
    bridges: [],
    connections: [],
    unreachable: [],
    connectedSites: 0,
    components: 0,
    scale,
    step,
  };
  if (!destinations.length) return result;
  const point = (i: number): RoadPoint => ({
    x: (i % cols) * step,
    y: Math.floor(i / cols) * step,
  });
  const nearest = (p: RoadPoint) =>
    Math.round(p.y / step) * cols + Math.round(p.x / step);
  const valid = new Uint8Array(n);
  // A dry-cell margin prevents diagonal shortcuts across bays and coast corners.
  for (let y = 1; y < rows - 1; y++)
    for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x;
      valid[i] = Number(
        biomes[i] !== 4 &&
          [
            -cols - 1,
            -cols,
            -cols + 1,
            -1,
            0,
            1,
            cols - 1,
            cols,
            cols + 1,
          ].every((d) => land[i + d]),
      );
    }
  const blockers = new Map<number, number[]>();
  destinations.forEach((p, j) => {
    const radius = p.radius + COUNTRY_HIGHWAY_WIDTH / scale;
    for (
      let y = Math.max(0, Math.floor((p.y - radius) / step));
      y <= Math.min(rows - 1, Math.floor((p.y + radius) / step));
      y++
    )
      for (
        let x = Math.max(0, Math.floor((p.x - radius) / step));
        x <= Math.min(cols - 1, Math.floor((p.x + radius) / step));
        x++
      ) {
        const i = y * cols + x,
          list = blockers.get(i) ?? [];
        list.push(j);
        blockers.set(i, list);
      }
  });
  function clear(a: RoadPoint, b: RoadPoint, ignore = -1) {
    const length = distance(a, b),
      steps = Math.max(2, Math.ceil(length / (step * 0.25)));
    let last = terrainHeight(surface, a.x, a.y);
    for (let k = 0; k <= steps; k++) {
      const p = {
          x: a.x + ((b.x - a.x) * k) / steps,
          y: a.y + ((b.y - a.y) * k) / steps,
        },
        i = nearest(p);
      if (
        p.x < step ||
        p.y < step ||
        p.x > step * (cols - 2) ||
        p.y > step * (rows - 2) ||
        !valid[i]
      )
        return false;
      const h = terrainHeight(surface, p.x, p.y);
      if (
        k &&
        Math.abs(h - last) / ((length / steps) * scale || 1) > MAX_ROAD_GRADE
      )
        return false;
      last = h;
    }
    const checked = new Set<number>();
    for (
      let y = Math.max(0, Math.floor(Math.min(a.y, b.y) / step));
      y <= Math.min(rows - 1, Math.floor(Math.max(a.y, b.y) / step));
      y++
    )
      for (
        let x = Math.max(0, Math.floor(Math.min(a.x, b.x) / step));
        x <= Math.min(cols - 1, Math.floor(Math.max(a.x, b.x) / step));
        x++
      )
        for (const j of blockers.get(y * cols + x) ?? []) {
          if (j === ignore || checked.has(j)) continue;
          checked.add(j);
          const p = destinations[j],
            dx = b.x - a.x,
            dy = b.y - a.y,
            t = Math.max(
              0,
              Math.min(
                1,
                ((p.x - a.x) * dx + (p.y - a.y) * dy) /
                  (dx * dx + dy * dy || 1),
              ),
            );
          if (
            Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) <
            p.radius + COUNTRY_HIGHWAY_WIDTH / scale
          )
            return false;
        }
    return true;
  }
  const terminals: { site: number; node: number; port: RoadPoint }[] = [];
  destinations.forEach((site, j) => {
    const candidates: { node: number; port: RoadPoint; d: number }[] = [];
    for (const port of site.entrances) {
      const ox = port.x - site.x,
        oy = port.y - site.y;
      const cx = Math.round(port.x / step),
        cy = Math.round(port.y / step);
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const x = cx + dx,
            y = cy + dy,
            i = y * cols + x;
          if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1 || !valid[i])
            continue;
          const p = point(i);
          if ((p.x - port.x) * ox + (p.y - port.y) * oy < 0) continue;
          candidates.push({ node: i, port, d: distance(port, p) });
        }
    }
    candidates.sort((a, b) => a.d - b.d || a.node - b.node);
    const c = candidates.find(
      (c) =>
        clear(point(c.node), point(c.node)) && clear(c.port, point(c.node), j),
    );
    if (c) terminals.push({ site: j, node: c.node, port: c.port });
    else
      result.unreachable.push({
        id: site.id,
        name: site.name,
        reason: "No dry, gentle approach to an entrance",
      });
  });
  const costs = new Float64Array(n).fill(Infinity),
    owners = new Int32Array(n).fill(-1),
    previous = new Int32Array(n).fill(-1),
    heap = new Heap();
  type Candidate = { a: number; b: number; i: number; j: number; cost: number };
  const meetings = new Map<string, Candidate>();
  function meeting(a: number, b: number, i: number, j: number, cost: number) {
    if (a === b) return;
    const id = key(a, b),
      old = meetings.get(id);
    if (!old || cost < old.cost) meetings.set(id, { a, b, i, j, cost });
  }
  terminals.forEach((t, j) => {
    if (owners[t.node] >= 0) {
      meeting(owners[t.node], j, t.node, t.node, 0);
      return;
    }
    costs[t.node] = 0;
    owners[t.node] = j;
    heap.push(t.node, 0);
  });
  const edgeCache = new Map<string, number>();
  const offsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  while (heap.items.length) {
    const { node: i, cost } = heap.pop();
    if (cost > costs[i]) continue;
    const x = i % cols,
      y = Math.floor(i / cols),
      a = point(i);
    for (const [dx, dy] of offsets) {
      const nx = x + dx,
        ny = y + dy,
        j = ny * cols + nx;
      if (nx < 1 || ny < 1 || nx >= cols - 1 || ny >= rows - 1 || !valid[j])
        continue;
      if (dx && dy && (!valid[i + dx] || !valid[i + dy * cols])) continue;
      const id = key(i, j);
      let weight = edgeCache.get(id);
      if (weight === undefined) {
        const b = point(j),
          length = distance(a, b);
        weight = clear(a, b)
          ? length *
            (1 +
              (Math.abs(heights[j] - heights[i]) / (length * scale)) * 12 +
              (biomes[j] === 2 ? 0.18 : 0))
          : Infinity;
        edgeCache.set(id, weight);
      }
      if (!Number.isFinite(weight)) continue;
      if (cost + weight < costs[j]) {
        costs[j] = cost + weight;
        owners[j] = owners[i];
        previous[j] = i;
        heap.push(j, costs[j]);
      }
    }
  }
  // Only join finalized catchments: tentative owners may change during the flood.
  for (const [id, weight] of edgeCache) {
    if (!Number.isFinite(weight)) continue;
    const [i, j] = id.split(":").map(Number);
    if (owners[i] >= 0 && owners[j] >= 0 && owners[i] !== owners[j])
      meeting(owners[i], owners[j], i, j, costs[i] + weight + costs[j]);
  }
  const parent = terminals.map((_, i) => i),
    find = (i: number): number =>
      parent[i] === i ? i : (parent[i] = find(parent[i]));
  const selected: Candidate[] = [];
  for (const e of [...meetings.values()].sort(
    (a, b) => a.cost - b.cost || a.a - b.a || a.b - b.b,
  )) {
    const a = find(e.a),
      b = find(e.b);
    if (a === b) continue;
    parent[a] = b;
    selected.push(e);
  }
  const graph = terminals.map(() => [] as { to: number; edge: number }[]);
  selected.forEach((e, i) => {
    graph[e.a].push({ to: e.b, edge: i });
    graph[e.b].push({ to: e.a, edge: i });
  });
  const highway = new Set<number>(),
    visited = new Set<number>(),
    participating = new Set<number>();
  // Prune minor branches from each tree to identify the major-center backbone.
  for (let root = 0; root < terminals.length; root++) {
    if (visited.has(root)) continue;
    const order = [root],
      parents = new Map<number, { to: number; edge: number }>();
    visited.add(root);
    for (let k = 0; k < order.length; k++)
      for (const e of graph[order[k]])
        if (!visited.has(e.to)) {
          visited.add(e.to);
          parents.set(e.to, { to: order[k], edge: e.edge });
          order.push(e.to);
        }
    if (order.length < 2) {
      const s = destinations[terminals[root].site];
      result.unreachable.push({
        id: s.id,
        name: s.name,
        reason: "Isolated land or terrain component",
      });
      continue;
    }
    result.components++;
    order.forEach((i) => participating.add(i));
    const total = order.filter(
        (i) => destinations[terminals[i].site].major,
      ).length,
      subtree = new Map<number, number>();
    for (const i of order.reverse()) {
      const count =
          (subtree.get(i) ?? 0) + Number(destinations[terminals[i].site].major),
        p = parents.get(i);
      if (p) {
        if (count > 0 && count < total) highway.add(p.edge);
        subtree.set(p.to, (subtree.get(p.to) ?? 0) + count);
      }
    }
  }
  const physical = new Map<
    string,
    { a: number; b: number; highway: boolean }
  >();
  const trace = (start: number, terminal: number) => {
    const path = [start];
    let i = start;
    while (
      i !== terminals[terminal].node &&
      previous[i] >= 0 &&
      path.length < n
    ) {
      i = previous[i];
      path.push(i);
    }
    return path;
  };
  selected.forEach((e, index) => {
    const trunk = highway.has(index),
      a = trace(e.i, e.a).reverse(),
      b = trace(e.j, e.b),
      path = [...a, ...b];
    result.connections.push({
      from: destinations[terminals[e.a].site].id,
      to: destinations[terminals[e.b].site].id,
      highway: trunk,
    });
    for (let i = 1; i < path.length; i++) {
      if (path[i] === path[i - 1]) continue;
      const id = key(path[i - 1], path[i]),
        old = physical.get(id);
      physical.set(id, {
        a: path[i - 1],
        b: path[i],
        highway: trunk || !!old?.highway,
      });
    }
  });
  const edges = [...physical.values()],
    adj = new Map<number, number[]>();
  edges.forEach((e, i) => {
    for (const p of [e.a, e.b]) {
      const list = adj.get(p) ?? [];
      list.push(i);
      adj.set(p, list);
    }
  });
  const stops = new Set(
    terminals.filter((_, i) => participating.has(i)).map((t) => t.node),
  );
  for (const [i, list] of adj)
    if (list.length !== 2 || edges[list[0]].highway !== edges[list[1]].highway)
      stops.add(i);
  const used = new Set<number>();
  function addRoad(path: RoadPoint[], highway: boolean) {
    if (path.length < 2) return;
    // Cut grid corners only when the rounded segments still pass clearance/grade checks.
    const curve = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
      const a = path[i - 1],
        b = path[i],
        c = path[i + 1],
        p = { x: b.x + (a.x - b.x) * 0.22, y: b.y + (a.y - b.y) * 0.22 },
        q = { x: b.x + (c.x - b.x) * 0.22, y: b.y + (c.y - b.y) * 0.22 };
      if (clear(curve[curve.length - 1], p) && clear(p, q) && clear(q, c))
        curve.push(p, q);
      else curve.push(b);
    }
    curve.push(path[path.length - 1]);
    result.roads.push({
      id: `country-road-${result.roads.length}`,
      highway,
      width: highway ? COUNTRY_HIGHWAY_WIDTH : COUNTRY_LOCAL_ROAD_WIDTH,
      path: curve,
    });
  }
  for (const start of stops)
    for (const first of adj.get(start) ?? []) {
      if (used.has(first)) continue;
      const path = [point(start)],
        trunk = edges[first].highway;
      let at = start,
        index = first;
      while (!used.has(index)) {
        used.add(index);
        const e = edges[index];
        at = e.a === at ? e.b : e.a;
        path.push(point(at));
        if (stops.has(at)) break;
        index = adj.get(at)!.find((i) => !used.has(i))!;
        if (index === undefined) break;
      }
      addRoad(path, trunk);
    }
  for (const i of participating) {
    const t = terminals[i],
      major = destinations[t.site].major;
    result.roads.push({
      id: `entrance-${destinations[t.site].id}`,
      highway: major,
      width: major ? COUNTRY_HIGHWAY_WIDTH : COUNTRY_LOCAL_ROAD_WIDTH,
      path: [t.port, point(t.node)],
    });
  }
  result.connectedSites = participating.size;
  // River crossings get explicit physical decks; open sea is never bridged by the flood.
  const rivers = (world.geography?.rivers ?? []).flatMap((r) =>
    r.slice(1).map((b, i) => ({
      a: { x: r[i][0], y: r[i][1] },
      b: { x: b[0], y: b[1] },
    })),
  );
  const bridgeKeys = new Set<string>();
  for (const road of result.roads)
    for (let i = 1; i < road.path.length; i++)
      for (const river of rivers) {
        const a = road.path[i - 1],
          b = road.path[i],
          c = river.a,
          d = river.b,
          dx = b.x - a.x,
          dy = b.y - a.y,
          rx = d.x - c.x,
          ry = d.y - c.y,
          den = dx * ry - dy * rx;
        if (Math.abs(den) < 1e-10) continue;
        const t = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den,
          u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / den;
        if (t < 0 || t > 1 || u < 0 || u > 1) continue;
        const x = a.x + t * dx,
          y = a.y + t * dy,
          id = `${Math.round((x * scale) / 8)}:${Math.round((y * scale) / 8)}`;
        if (bridgeKeys.has(id)) continue;
        bridgeKeys.add(id);
        const sine = Math.abs(den) / (Math.hypot(dx, dy) * Math.hypot(rx, ry));
        result.bridges.push({
          x,
          y,
          angle: Math.atan2(dy, dx),
          length: Math.max(24, 12 / Math.max(0.05, sine)),
          width: road.width + 1,
        });
      }
  alignBridgeApproaches(result);
  return result;
}

/** Index road segments once to clear crop parcels without an all-fields/all-roads scan. */
export function countryRoadFieldFilter(network: CountryRoadNetwork) {
  const cells = new Map<
      string,
      { a: RoadPoint; b: RoadPoint; width: number }[]
    >(),
    step = network.step;
  for (const r of network.roads)
    for (let i = 1; i < r.path.length; i++) {
      const a = r.path[i - 1],
        b = r.path[i],
        margin = (r.width + 4) / network.scale,
        s = { a, b, width: r.width };
      for (
        let y = Math.floor((Math.min(a.y, b.y) - margin) / step);
        y <= Math.floor((Math.max(a.y, b.y) + margin) / step);
        y++
      )
        for (
          let x = Math.floor((Math.min(a.x, b.x) - margin) / step);
          x <= Math.floor((Math.max(a.x, b.x) + margin) / step);
          x++
        ) {
          const key = `${x}:${y}`,
            list = cells.get(key) ?? [];
          list.push(s);
          cells.set(key, list);
        }
    }
  return (f: RuralField) => {
    const w = f.width / network.scale,
      d = f.depth / network.scale;
    for (
      let y = Math.floor((f.y - d / 2) / step);
      y <= Math.floor((f.y + d / 2) / step);
      y++
    )
      for (
        let x = Math.floor((f.x - w / 2) / step);
        x <= Math.floor((f.x + w / 2) / step);
        x++
      )
        for (const s of cells.get(`${x}:${y}`) ?? [])
          if (
            hitsRect(
              s.a,
              s.b,
              f,
              w + (s.width + 4) / network.scale,
              d + (s.width + 4) / network.scale,
            )
          )
            return false;
    return true;
  };
}
