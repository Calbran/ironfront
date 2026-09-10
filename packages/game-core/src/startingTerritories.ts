import type { Region } from "./index.ts";

/** Plan every start before ownership changes, keeping neutral land between borders. */
export function startingTerritories(
  regions: Region[],
  seats: number,
): number[][] {
  const land = regions.filter((r) => r.terrain !== "mountains");
  const distances = (sources: number[]) => {
    const distance = new Map(sources.map((id) => [id, 0])),
      queue = [...sources];
    for (let i = 0; i < queue.length; i++)
      for (const n of regions[queue[i]].neighbors) {
        if (regions[n].terrain === "mountains" || distance.has(n)) continue;
        distance.set(n, distance.get(queue[i])! + 1);
        queue.push(n);
      }
    return distance;
  };
  // Prefer two intervening neutral regions. Never fall back to touching borders.
  for (const buffer of [2, 1]) {
    let budget = 4000;
    const search = (plans: number[][]): number[][] | null => {
      if (plans.length === seats) return plans;
      if (--budget < 0) return null;
      const distance = distances(plans.flat());
      const allowed = new Set(
        land
          .filter((r) => !distance.has(r.id) || distance.get(r.id)! > buffer)
          .map((r) => r.id),
      );
      if (allowed.size < (seats - plans.length) * 4) return null;
      const roots = land
        .filter((r) => allowed.has(r.id))
        .sort(
          (a, b) =>
            (distance.get(b.id) ?? 0) - (distance.get(a.id) ?? 0) ||
            a.id - b.id,
        );
      const tried = new Set<string>();
      for (const root of roots) {
        const cluster = [root.id],
          seen = new Set(cluster);
        for (let i = 0; i < cluster.length && cluster.length < 4; i++) {
          const candidates = regions[cluster[i]].neighbors
            .filter((id) => allowed.has(id) && !seen.has(id))
            .sort(
              (a, b) =>
                Math.hypot(regions[a].x - root.x, regions[a].y - root.y) -
                  Math.hypot(regions[b].x - root.x, regions[b].y - root.y) ||
                a - b,
            );
          for (const id of candidates) {
            if (cluster.length === 4) break;
            seen.add(id);
            cluster.push(id);
          }
        }
        if (cluster.length !== 4) continue;
        const key = [...cluster].sort((a, b) => a - b).join(",");
        if (tried.has(key)) continue;
        tried.add(key);
        const result = search([...plans, cluster]);
        if (result) return result;
        if (budget < 0) break;
      }
      return null;
    };
    const result = search([]);
    if (result) return result;
  }
  throw Error(
    "This terrain cannot fit separated starting nations. Generate another map.",
  );
}
