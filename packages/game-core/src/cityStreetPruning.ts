import type { CityLot, CityPoint, CityStreet } from "./organicCity";
/** Keep frontage access and short connecting routes, rather than every imported road. */
export function pruneCityStreets(streets: CityStreet[], lots: CityLot[]) {
  const nodes: CityPoint[] = [],
    ids = new Map<string, number>(),
    edges: {
      a: number;
      b: number;
      width: number;
      alley: boolean;
      length: number;
    }[] = [],
    adj: number[][] = [];
  const node = (p: CityPoint) => {
    const key = `${Math.round(p.x * 20)},${Math.round(p.z * 20)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = nodes.length;
      ids.set(key, id);
      nodes.push(p);
      adj.push([]);
    }
    return id;
  };
  const edgeKeys = new Set<string>();
  for (const street of streets)
    for (let i = 1; i < street.points.length; i++) {
      const a = node(street.points[i - 1]),
        b = node(street.points[i]);
      if (a === b) continue;
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      const id = edges.length;
      edges.push({
        a,
        b,
        width: street.width,
        alley: street.alley,
        length: Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z),
      });
      adj[a].push(id);
      adj[b].push(id);
    }
  const terminals = new Set<number>();
  for (const lot of lots) {
    let best = -1,
      distance = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i],
        d = Math.hypot(p.x - lot.x, p.z - lot.z);
      if (d < distance) {
        distance = d;
        best = i;
      }
    }
    if (best >= 0) terminals.add(best);
  }
  // Each source component keeps a civic-facing root; unused components disappear entirely.
  const seen = new Set<number>(),
    roots: number[] = [],
    components: number[][] = [];
  for (let start = 0; start < nodes.length; start++) {
    if (seen.has(start)) continue;
    const component = [start];
    seen.add(start);
    for (let j = 0; j < component.length; j++)
      for (const eid of adj[component[j]]) {
        const e = edges[eid],
          next = e.a === component[j] ? e.b : e.a;
        if (!seen.has(next)) {
          seen.add(next);
          component.push(next);
        }
      }
    if (!component.some((i) => terminals.has(i))) continue;
    components.push(component);
    roots.push(
      component.reduce((a, b) =>
        Math.hypot(nodes[a].x, nodes[a].z) < Math.hypot(nodes[b].x, nodes[b].z)
          ? a
          : b,
      ),
    );
  }
  // Three deliberate approaches on the principal network, not dozens of empty stubs.
  const main = components.sort((a, b) => b.length - a.length)[0] ?? [];
  for (const angle of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
    let best = -1,
      score = -Infinity;
    for (const i of main) {
      const p = nodes[i],
        s = p.x * Math.cos(angle) + p.z * Math.sin(angle);
      if (s > score) {
        score = s;
        best = i;
      }
    }
    if (best >= 0) terminals.add(best);
  }
  const distance = nodes.map(() => Infinity),
    previous = nodes.map(() => -1),
    heap: { id: number; d: number }[] = [];
  const push = (item: { id: number; d: number }) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i) {
      const p = (i - 1) >> 1;
      if (heap[p].d <= item.d) break;
      heap[i] = heap[p];
      i = p;
    }
    heap[i] = item;
  };
  const pop = () => {
    const first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let c = i * 2 + 1;
        if (c + 1 < heap.length && heap[c + 1].d < heap[c].d) c++;
        if (heap[c].d >= last.d) break;
        heap[i] = heap[c];
        i = c;
      }
      heap[i] = last;
    }
    return first;
  };
  for (const root of roots) {
    distance[root] = 0;
    push({ id: root, d: 0 });
  }
  while (heap.length) {
    const current = pop();
    if (current.d !== distance[current.id]) continue;
    for (const eid of adj[current.id]) {
      const e = edges[eid],
        next = e.a === current.id ? e.b : e.a,
        d = current.d + e.length * (e.alley ? 1.15 : 1);
      if (d < distance[next]) {
        distance[next] = d;
        previous[next] = eid;
        push({ id: next, d });
      }
    }
  }
  const kept = new Set<number>();
  for (const terminal of terminals) {
    let current = terminal;
    while (previous[current] >= 0) {
      const eid = previous[current];
      if (kept.has(eid)) break;
      kept.add(eid);
      const e = edges[eid];
      current = e.a === current ? e.b : e.a;
    }
  }
  // Reassemble degree-two runs so renderer furniture spacing remains meaningful.
  const keptAdj = adj.map((list) => list.filter((id) => kept.has(id))),
    visited = new Set<number>(),
    result: CityStreet[] = [];
  const trace = (start: number, eid: number) => {
    const first = edges[eid],
      points = [nodes[start]];
    let at = start;
    while (!visited.has(eid)) {
      visited.add(eid);
      const e = edges[eid];
      at = e.a === at ? e.b : e.a;
      points.push(nodes[at]);
      const next = keptAdj[at].filter((id) => !visited.has(id));
      if (keptAdj[at].length !== 2 || next.length !== 1) break;
      const candidate = edges[next[0]];
      if (candidate.width !== first.width || candidate.alley !== first.alley)
        break;
      eid = next[0];
    }
    result.push({ points, width: first.width, alley: first.alley });
  };
  for (const eid of kept) {
    if (visited.has(eid)) continue;
    const e = edges[eid];
    if (keptAdj[e.a].length !== 2) trace(e.a, eid);
    else if (keptAdj[e.b].length !== 2) trace(e.b, eid);
  }
  for (const eid of kept) if (!visited.has(eid)) trace(edges[eid].a, eid);
  return result;
}
