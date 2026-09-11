type Point = { x: number; z: number };

/** Shared city/sector movement: a simple guide with deterministic, checked foot placement. */
export function variedMovementRoute(
  route: Point[],
  id: number,
  infantry: boolean,
  clear: (a: Point, b: Point) => boolean,
) {
  if (!route.length) return { path: [], guide: [] };
  const guide = [route[0]];
  for (let i = 0; i < route.length - 1;) {
    let next = route.length - 1;
    while (next > i + 1 && !clear(route[i], route[next])) next--;
    guide.push(route[next]);
    i = next;
  }
  const length = guide
    .slice(1)
    .reduce(
      (sum, p, i) => sum + Math.hypot(p.x - guide[i].x, p.z - guide[i].z),
      0,
    );
  const spacing = Math.max(1.2, length / Math.max(1, 384 - guide.length));
  const result = [guide[0]];
  for (let i = 1; i < guide.length; i++) {
    const a = guide[i - 1],
      b = guide[i],
      dx = b.x - a.x,
      dz = b.z - a.z,
      d = Math.hypot(dx, dz),
      n = Math.max(1, Math.ceil(d / spacing));
    for (let j = 1; j <= n; j++) {
      if (j === n) {
        result.push({ ...b });
        continue;
      }
      const t = j / n,
        offset =
          (infantry ? 0.18 : 0) *
          Math.sin(t * Math.PI) *
          Math.sin((t * d) / 3 + id * 1.7);
      const base = { x: a.x + dx * t, z: a.z + dz * t },
        q = {
          x: base.x - (dz / (d || 1)) * offset,
          z: base.z + (dx / (d || 1)) * offset,
        };
      const nextT = Math.min(1, (j + 1) / n),
        next = { x: a.x + dx * nextT, z: a.z + dz * nextT };
      // Check the next baseline step, not the entire remaining country-length leg.
      result.push(clear(result.at(-1)!, q) && clear(q, next) ? q : base);
    }
  }
  return {
    guide,
    path: result.every((p, i) => !i || clear(result[i - 1], p))
      ? result
      : guide,
  };
}
