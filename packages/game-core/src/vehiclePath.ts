type Point = { x: number; z: number };

/** Simplify lattice routes and round only corners whose entire swept centerline is clear. */
export function smoothVehiclePath(
  path: Point[],
  clear: (a: Point, b: Point) => boolean,
): Point[] {
  if (path.length < 3) return path;
  const simple = [path[0]];
  for (let i = 0; i < path.length - 1;) {
    let next = i + 1;
    for (let j = i + 2; j < path.length; j++) {
      if (!clear(path[i], path[j])) break;
      next = j;
    }
    simple.push(path[next]);
    i = next;
  }
  const result = [simple[0]];
  for (let i = 1; i < simple.length - 1; i++) {
    const a = simple[i - 1],
      b = simple[i],
      c = simple[i + 1];
    const incoming = Math.hypot(b.x - a.x, b.z - a.z),
      outgoing = Math.hypot(c.x - b.x, c.z - b.z);
    let accepted = false;
    for (
      let radius = Math.min(6, incoming * 0.35, outgoing * 0.35);
      radius >= 0.5;
      radius /= 2
    ) {
      const entry = {
        x: b.x + ((a.x - b.x) * radius) / incoming,
        z: b.z + ((a.z - b.z) * radius) / incoming,
      };
      const exit = {
        x: b.x + ((c.x - b.x) * radius) / outgoing,
        z: b.z + ((c.z - b.z) * radius) / outgoing,
      };
      const curve = Array.from({ length: 13 }, (_, j) => {
        const t = j / 12,
          u = 1 - t;
        return {
          x: u * u * entry.x + 2 * u * t * b.x + t * t * exit.x,
          z: u * u * entry.z + 2 * u * t * b.z + t * t * exit.z,
        };
      });
      if (
        !clear(result.at(-1)!, entry) ||
        !clear(exit, c) ||
        curve.some((p, j) => j > 0 && !clear(curve[j - 1], p))
      )
        continue;
      result.push(...curve);
      accepted = true;
      break;
    }
    if (!accepted) result.push(b);
  }
  result.push(simple.at(-1)!);
  return result;
}
