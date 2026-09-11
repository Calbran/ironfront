import {
  segmentDistance,
  type CityPoint,
  type CityStreet,
} from "./organicCity";

/** Prune unserved dead ends, retaining front doors, civic approaches and the country exit. */
export function trimSettlementStreets(
  streets: CityStreet[],
  frontages: CityPoint[],
) {
  const keys = (p: CityPoint) => `${p.x.toFixed(3)}:${p.z.toFixed(3)}`;
  // Rendering samples are not street junctions. Collapse straight runs for graph work,
  // preserving every real terminal/T-junction, then restore smooth rendering samples.
  const junctions = new Set(
    streets.flatMap((s) => [keys(s.points[0]), keys(s.points.at(-1)!)]),
  );
  const simplified = streets.map((s) => ({
    ...s,
    points: s.points.filter((p, i, ps) => {
      if (i === 0 || i === ps.length - 1 || junctions.has(keys(p))) return true;
      const a = ps[i - 1],
        b = ps[i + 1];
      return (
        Math.abs((p.x - a.x) * (b.z - p.z) - (p.z - a.z) * (b.x - p.x)) > 1e-5
      );
    }),
  }));
  const edges = simplified.flatMap((s) =>
    s.points.slice(1).map((b, i) => ({
      a: s.points[i],
      b,
      width: s.width,
      alley: s.alley,
      active: true,
      served: [] as number[],
      exit: false,
    })),
  );
  const anchors = [
    ...frontages,
    { x: 0, z: 19 },
    { x: 0, z: -18 },
    { x: -38, z: -6 },
    { x: 38, z: -6 },
  ];
  for (const e of edges) {
    const dx = e.b.x - e.a.x,
      dz = e.b.z - e.a.z,
      length = Math.hypot(dx, dz);
    e.served = anchors
      .filter((p) => segmentDistance(p, e.a, e.b) < 0.4)
      .map((p) =>
        Math.max(
          0,
          Math.min(
            length,
            ((p.x - e.a.x) * dx + (p.z - e.a.z) * dz) / (length || 1),
          ),
        ),
      );
    e.exit =
      Math.abs(e.b.x - e.a.x) > Math.abs(e.b.z - e.a.z) * 3 &&
      [e.a, e.b].some((p) => p.x > 150 && Math.abs(p.z - 19) < 0.1);
  }
  function adjacency() {
    const map = new Map<string, number[]>();
    edges.forEach((e, i) => {
      if (e.active)
        for (const p of [e.a, e.b]) {
          const k = keys(p),
            list = map.get(k) ?? [];
          list.push(i);
          map.set(k, list);
        }
    });
    return map;
  }
  let changed = true;
  while (changed) {
    changed = false;
    const map = adjacency();
    for (const e of edges)
      if (
        e.active &&
        !e.exit &&
        !e.served.length &&
        ((map.get(keys(e.a))?.length ?? 0) < 2 ||
          (map.get(keys(e.b))?.length ?? 0) < 2)
      ) {
        e.active = false;
        changed = true;
      }
  }
  // Remove redundant empty loop edges without breaking a connection.
  const graph = adjacency();
  for (const [index, e] of edges.entries())
    if (e.active && !e.exit && !e.served.length) {
      const target = keys(e.b),
        seen = new Set([keys(e.a)]),
        queue = [keys(e.a)];
      for (let at = 0; at < queue.length && !seen.has(target); at++) {
        for (const i of graph.get(queue[at]) ?? []) {
          if (i === index || !edges[i].active) continue;
          const edge = edges[i];
          for (const p of [edge.a, edge.b]) {
            const k = keys(p);
            if (!seen.has(k)) {
              seen.add(k);
              queue.push(k);
            }
          }
        }
      }
      if (seen.has(target)) e.active = false;
    }
  changed = true;
  while (changed) {
    changed = false;
    const map = adjacency();
    for (const e of edges)
      if (
        e.active &&
        !e.exit &&
        !e.served.length &&
        ((map.get(keys(e.a))?.length ?? 0) < 2 ||
          (map.get(keys(e.b))?.length ?? 0) < 2)
      ) {
        e.active = false;
        changed = true;
      }
  }
  const map = adjacency();
  return edges
    .filter((e) => e.active)
    .flatMap((e) => {
      const dx = e.b.x - e.a.x,
        dz = e.b.z - e.a.z,
        length = Math.hypot(dx, dz);
      let lo = 0,
        hi = length;
      if (!e.exit && e.served.length) {
        if (map.get(keys(e.a))!.length === 1)
          lo = Math.max(0, Math.min(...e.served) - 6);
        if (map.get(keys(e.b))!.length === 1)
          hi = Math.min(length, Math.max(...e.served) + 6);
      }
      if (hi - lo < 0.05) return [];
      return [
        {
          width: e.width,
          alley: e.alley,
          points: Array.from(
            { length: Math.ceil((hi - lo) / 1.5) + 1 },
            (_, i) => {
              const d = lo + ((hi - lo) * i) / Math.ceil((hi - lo) / 1.5);
              return {
                x: e.a.x + (dx * d) / length,
                z: e.a.z + (dz * d) / length,
              };
            },
          ),
        },
      ];
    });
}
