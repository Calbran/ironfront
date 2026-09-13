import type { SlicePlan, SlicePoint, SliceUnit } from "./countrySlice";
import { terrainHeight } from "./connectedTerrain";
import { countryBridgeContains } from "./countryRoadNetwork";
import { segmentDistance } from "./organicCity";
type Kind = SliceUnit["kind"];
/** Exact narrow obstacle intersections complement coarse terrain samples on long routes. */
export function countryLongSegmentClear(
  plan: SlicePlan,
  a: SlicePoint,
  b: SlicePoint,
  kind: Kind,
) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    length = Math.hypot(dx, dz),
    radius = kind === "tank" ? 1.8 : 0.3;
  for (const o of plan.obstacles) {
    if (kind === "tank" && o.id.startsWith("campaign-bag-")) continue;
    const reach = Math.hypot(o.width, o.depth) / 2 + radius;
    if (segmentDistance(o, a, b) > reach) continue;
    const c = Math.cos(o.angle),
      s = Math.sin(o.angle),
      ax = (a.x - o.x) * c - (a.z - o.z) * s,
      az = (a.x - o.x) * s + (a.z - o.z) * c;
    let lo = 0,
      hi = 1;
    for (const [v, d, h] of [
      [ax, dx * c - dz * s, o.width / 2 + radius],
      [az, dx * s + dz * c, o.depth / 2 + radius],
    ]) {
      if (Math.abs(d) < 1e-9) {
        if (Math.abs(v) < h) continue;
        lo = 2;
        break;
      }
      const p = (-h - v) / d,
        q = (h - v) / d;
      lo = Math.max(lo, Math.min(p, q));
      hi = Math.min(hi, Math.max(p, q));
    }
    if (lo <= hi && hi >= 0 && lo <= 1) return false;
  }
  for (const river of plan.rivers)
    for (let i = 1; i < river.length; i++) {
      const p = river[i - 1],
        q = river[i],
        rx = q.x - p.x,
        rz = q.z - p.z,
        den = dx * rz - dz * rx;
      let contact: SlicePoint | undefined;
      if (Math.abs(den) > 1e-8) {
        const t = ((p.x - a.x) * rz - (p.z - a.z) * rx) / den,
          u = ((p.x - a.x) * dz - (p.z - a.z) * dx) / den;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1)
          contact = { x: a.x + t * dx, z: a.z + t * dz };
      }
      if (!contact) {
        const e = [p, q].find((v) => segmentDistance(v, a, b) < 6 + radius);
        if (e) contact = e;
        else if (segmentDistance(a, p, q) < 6 + radius) contact = a;
        else if (segmentDistance(b, p, q) < 6 + radius) contact = b;
      }
      if (
        contact &&
        !plan.roads.bridges.some((br) =>
          countryBridgeContains(
            br,
            1,
            { x: contact!.x, y: contact!.z },
            radius,
          ),
        )
      )
        return false;
    }
  const n = Math.max(
      1,
      Math.ceil(length / Math.min(16, plan.surface.step / 4)),
    ),
    s = plan.surface;
  let h = terrainHeight(s, a.x, a.z);
  for (let j = 0; j <= n; j++) {
    const x = a.x + (dx * j) / n,
      z = a.z + (dz * j) / n,
      i = Math.round(z / s.step) * s.cols + Math.round(x / s.step),
      next = terrainHeight(s, x, z);
    if (
      x < 3 ||
      z < 3 ||
      x > plan.width - 3 ||
      z > plan.depth - 3 ||
      !s.land[i] ||
      s.biomes[i] === 4 ||
      (j && Math.abs(next - h) / (length / n || 1) > 0.18)
    )
      return false;
    h = next;
  }
  return true;
}
/** A reusable road graph keeps continental orders independent of a metre-sized world grid. */
export function createCountryTravelGraph(
  plan: SlicePlan,
  clear: (a: SlicePoint, b: SlicePoint, k: Kind) => boolean,
) {
  const nodes: SlicePoint[] = [],
    adj: { to: number; cost: number }[][] = [],
    ids = new Map<string, number>(),
    checked = new Map<string, boolean>();
  function node(p: SlicePoint) {
    const key = p.x.toFixed(3) + ":" + p.z.toFixed(3);
    let id = ids.get(key);
    if (id === undefined) {
      id = nodes.length;
      ids.set(key, id);
      nodes.push(p);
      adj.push([]);
    }
    return id;
  }
  for (const r of plan.roads.roads)
    for (let i = 1; i < r.path.length; i++) {
      const a = node({ x: r.path[i - 1].x, z: r.path[i - 1].y }),
        b = node({ x: r.path[i].x, z: r.path[i].y }),
        cost = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
      adj[a].push({ to: b, cost });
      adj[b].push({ to: a, cost });
    }
  return (start: SlicePoint, end: SlicePoint, kind: Kind) => {
    const sockets = (p: SlicePoint) =>
      nodes
        .map((q, i) => ({ i, d: Math.hypot(p.x - q.x, p.z - q.z) }))
        .filter((q) => q.d < 6000)
        .sort((a, b) => a.d - b.d)
        .slice(0, 24)
        .filter((q) => clear(p, nodes[q.i], kind))
        .slice(0, 6);
    const starts = sockets(start),
      ends = new Map(sockets(end).map((q) => [q.i, q.d]));
    if (!starts.length || !ends.size)
      throw Error("No safe road approach. Move closer to a road first.");
    const costs = new Map(starts.map((q) => [q.i, q.d])),
      previous = new Map<number, number>(),
      open = new Set(starts.map((q) => q.i)),
      closed = new Set<number>();
    let goal: number | undefined,
      best = Infinity;
    while (open.size) {
      let at = -1,
        cost = Infinity;
      for (const i of open) {
        const c = costs.get(i)!;
        if (c < cost) {
          at = i;
          cost = c;
        }
      }
      if (cost >= best) break;
      open.delete(at);
      closed.add(at);
      if (ends.has(at) && cost + ends.get(at)! < best) {
        goal = at;
        best = cost + ends.get(at)!;
      }
      for (const edge of adj[at]) {
        if (closed.has(edge.to)) continue;
        const next = cost + edge.cost;
        if (next >= (costs.get(edge.to) ?? Infinity) || next >= best) continue;
        const key =
          kind + ":" + Math.min(at, edge.to) + ":" + Math.max(at, edge.to);
        let valid = checked.get(key);
        if (valid === undefined) {
          valid = clear(nodes[at], nodes[edge.to], kind);
          checked.set(key, valid);
        }
        if (!valid) continue;
        costs.set(edge.to, next);
        previous.set(edge.to, at);
        open.add(edge.to);
      }
    }
    if (goal === undefined)
      throw Error(
        "No connected land route. Water and impassable terrain separate these positions.",
      );
    const path = [{ ...end }];
    let i = goal;
    while (true) {
      path.push(nodes[i]);
      const p = previous.get(i);
      if (p === undefined) break;
      i = p;
    }
    return path.reverse();
  };
}
