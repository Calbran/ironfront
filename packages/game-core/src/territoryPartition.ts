/** Repartition inland enclaves with their enclosing territory, preserving IDs and land. */
export function openEnclosedTerritories(
  labels: Int32Array,
  cols: number,
  rows: number,
) {
  if (labels.length !== cols * rows)
    throw new Error("Invalid territory grid dimensions");
  const neighbors = (i: number) => [
    i % cols ? i - 1 : -1,
    i % cols < cols - 1 ? i + 1 : -1,
    i >= cols ? i - cols : -1,
    i < labels.length - cols ? i + cols : -1,
  ];
  let repairs = 0;
  // Each split uses exposed perimeter seeds, instead of the enclosed original site.
  // Keep unaffected regions exactly as generated.
  const limit = new Set(labels).size * 4;
  while (repairs < limit) {
    const cells = new Map<number, number[]>();
    const adjacent = new Map<number, Set<number>>();
    const coastal = new Set<number>();
    for (let i = 0; i < labels.length; i++) {
      const id = labels[i];
      if (id < 0) continue;
      if (!cells.has(id)) {
        cells.set(id, []);
        adjacent.set(id, new Set());
      }
      cells.get(id)!.push(i);
      for (const n of neighbors(i)) {
        if (n < 0 || labels[n] < 0) coastal.add(id);
        else if (labels[n] !== id) adjacent.get(id)!.add(labels[n]);
      }
    }
    const enclosed = [...cells.keys()].find(
      (id) => !coastal.has(id) && adjacent.get(id)!.size === 1,
    );
    if (enclosed === undefined) return repairs;
    const host = [...adjacent.get(enclosed)!][0];
    const union = [...cells.get(enclosed)!, ...cells.get(host)!];
    const belongs = (i: number) =>
      i >= 0 && (labels[i] === enclosed || labels[i] === host);
    const perimeter = union.filter((i) =>
      neighbors(i).some((n) => !belongs(n)),
    );
    // Deterministic, widely separated exposed sites prevent another enclosed core.
    const distance = (a: number, b: number) =>
      ((a % cols) - (b % cols)) ** 2 +
      (Math.floor(a / cols) - Math.floor(b / cols)) ** 2;
    const farthest = (from: number) =>
      perimeter.reduce(
        (best, i) => (distance(i, from) > distance(best, from) ? i : best),
        perimeter[0],
      );
    const a = farthest(perimeter[0]),
      b = farthest(a);
    if (a === b) return repairs;
    const available = new Set(union);
    labels[a] = enclosed;
    labels[b] = host;
    available.delete(a);
    available.delete(b);
    const queue = [a, b];
    for (let k = 0; k < queue.length; k++) {
      const i = queue[k];
      for (const n of neighbors(i))
        if (available.delete(n)) {
          labels[n] = labels[i];
          queue.push(n);
        }
    }
    repairs++;
  }
  throw new Error("Territory enclave repair did not converge");
}
