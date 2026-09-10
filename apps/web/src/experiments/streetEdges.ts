import { segmentDistance } from "../../../../packages/game-core/src/organicCity";
import type {
  CityPoint,
  CityStreet,
} from "../../../../packages/game-core/src/organicCity";
type Point = CityPoint;
const cross = (a: Point, b: Point) => a.x * b.z - a.z * b.x;
const sub = (a: Point, b: Point) => ({ x: a.x - b.x, z: a.z - b.z });
const key = (p: Point) => `${p.x.toFixed(5)},${p.z.toFixed(5)}`;
/** Junction endpoints already terminate inside the receiving road's footprint. */
export function connectedRoadEnd(
  p: Point,
  owner: CityStreet,
  streets: CityStreet[],
) {
  const same = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z) < 1e-6;
  return streets.some((other) => {
    if (other === owner || other.alley || other.points.length < 2) return false;
    const a = owner.points[0],
      b = owner.points.at(-1)!,
      c = other.points[0],
      d = other.points.at(-1)!;
    if ((same(a, c) && same(b, d)) || (same(a, d) && same(b, c))) return false;
    return other.points
      .slice(1)
      .some((q, i) => segmentDistance(p, other.points[i], q) < 1e-5);
  });
}
/** Boundary of the union of square-ended road strips; no sample-based junction gaps. */
export function streetOutlines(streets: CityStreet[]) {
  const polygons: Point[][] = [];
  for (const s of streets) {
    if (s.alley) continue;
    const points = s.points.filter(
      (p, i, ps) =>
        i === 0 ||
        i === ps.length - 1 ||
        Math.abs(cross(sub(p, ps[i - 1]), sub(ps[i + 1], p))) > 1e-7,
    );
    if (points.length < 2) continue;
    const h = s.width / 2 + 0.12;
    const sections = points.map((p, i) => {
      const tangent = (a: Point, b: Point) => {
        const d = sub(b, a),
          l = Math.hypot(d.x, d.z);
        return { x: d.x / l, z: d.z / l };
      };
      const before = tangent(
        points[Math.max(0, i - 1)],
        points[Math.max(1, i)],
      );
      const after = tangent(
        points[Math.min(i, points.length - 2)],
        points[Math.min(i + 1, points.length - 1)],
      );
      const nx = -before.z - after.z,
        nz = before.x + after.x,
        l = Math.hypot(nx, nz);
      const n = { x: nx / l, z: nz / l },
        den = Math.max(0.25, n.x * -after.z + n.z * after.x);
      const cap =
        (i === 0 || i === points.length - 1) && connectedRoadEnd(p, s, streets)
          ? 0
          : i === 0
            ? -h
            : i === points.length - 1
              ? h
              : 0;
      const center = { x: p.x + after.x * cap, z: p.z + after.z * cap };
      return {
        left: { x: center.x + (n.x * h) / den, z: center.z + (n.z * h) / den },
        right: { x: center.x - (n.x * h) / den, z: center.z - (n.z * h) / den },
      };
    });
    for (let i = 1; i < sections.length; i++) {
      const a = sections[i - 1],
        b = sections[i];
      polygons.push([a.right, b.right, b.left, a.left]);
    }
  }
  const inside = (p: Point) =>
    polygons.some((poly) =>
      poly.every(
        (a, i) => cross(sub(poly[(i + 1) % 4], a), sub(p, a)) >= -1e-8,
      ),
    );
  const edges = new Map<string, { a: Point; b: Point }>();
  for (const poly of polygons)
    for (let i = 0; i < 4; i++) {
      const a = poly[i],
        b = poly[(i + 1) % 4],
        d = sub(b, a),
        len = Math.hypot(d.x, d.z),
        cuts = [0, 1];
      for (const q of polygons)
        for (let j = 0; j < 4; j++) {
          const c = q[j],
            e = sub(q[(j + 1) % 4], c),
            den = cross(d, e),
            ca = sub(c, a);
          if (Math.abs(den) > 1e-9) {
            const t = cross(ca, e) / den,
              u = cross(ca, d) / den;
            if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
          } else if (Math.abs(cross(ca, d)) < 1e-7)
            for (const p of [c, q[(j + 1) % 4]]) {
              const t = ((p.x - a.x) * d.x + (p.z - a.z) * d.z) / (len * len);
              if (t > 0 && t < 1) cuts.push(t);
            }
        }
      cuts.sort((a, b) => a - b);
      for (let j = 1; j < cuts.length; j++) {
        const lo = cuts[j - 1],
          hi = cuts[j];
        if (hi - lo < 1e-7) continue;
        const at = (t: number) => ({ x: a.x + d.x * t, z: a.z + d.z * t }),
          m = at((lo + hi) / 2),
          eps = 1e-4;
        const left = inside({
            x: m.x - (d.z / len) * eps,
            z: m.z + (d.x / len) * eps,
          }),
          right = inside({
            x: m.x + (d.z / len) * eps,
            z: m.z - (d.x / len) * eps,
          });
        if (left === right) continue;
        const p = at(left ? lo : hi),
          q = at(left ? hi : lo);
        edges.set(`${key(p)}:${key(q)}`, { a: p, b: q });
      }
    }
  const starts = new Map<string, { a: Point; b: Point }[]>();
  for (const e of edges.values()) {
    const list = starts.get(key(e.a)) ?? [];
    list.push(e);
    starts.set(key(e.a), list);
  }
  const loops: Point[][] = [];
  const used = new Set<object>();
  for (const first of edges.values()) {
    if (used.has(first)) continue;
    const loop: Point[] = [];
    let e = first;
    while (!used.has(e)) {
      used.add(e);
      loop.push(e.a);
      const next = starts.get(key(e.b))?.find((n) => !used.has(n));
      if (!next) break;
      e = next;
    }
    if (loop.length >= 3 && key(e.b) === key(first.a)) loops.push(loop);
  }
  return loops;
}
/** Offset toward the outside of an oriented union boundary, joining neighboring edges. */
export function offsetOutline(loop: Point[], distance: number) {
  return loop.map((p, i) => {
    const prev = loop[(i + loop.length - 1) % loop.length],
      next = loop[(i + 1) % loop.length];
    const a = sub(p, prev),
      b = sub(next, p),
      la = Math.hypot(a.x, a.z),
      lb = Math.hypot(b.x, b.z);
    const n1 = { x: a.z / la, z: -a.x / la },
      n2 = { x: b.z / lb, z: -b.x / lb };
    const denom = 1 + n1.x * n2.x + n1.z * n2.z;
    // Bound acute-corner miters; ordinary right-angle corners retain their join.
    const factor =
      Math.sign(distance) *
      Math.min(
        Math.abs(distance) / Math.max(0.15, denom),
        (1.5 * Math.abs(distance)) /
          Math.max(1e-8, Math.hypot(n1.x + n2.x, n1.z + n2.z)),
      );
    return { x: p.x + (n1.x + n2.x) * factor, z: p.z + (n1.z + n2.z) * factor };
  });
}
