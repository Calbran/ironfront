import type { MiniatureData } from "./miniatureData";
import { presentationRivers } from "./riverPresentation";
import { onLocalLand } from "../../../../packages/game-core/src/localMovement";
import {
  buildingCorners,
  buildingsOverlap,
} from "../../../../packages/game-core/src/cityLayout";
/** Cosmetic placement repair for the miniature preview; never edits authoritative features. */
export function clearRiverfrontBuildings(data: MiniatureData) {
  const segments = presentationRivers(data).flatMap((r) =>
    r.slice(1).map((b, i) => [r[i], b] as const),
  );
  const distance = (
    x: number,
    y: number,
    a: readonly number[],
    b: readonly number[],
  ) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      t = Math.max(
        0,
        Math.min(
          1,
          ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
    return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
  };
  let moved = 0,
    omitted = 0;
  for (const city of data.cities) {
    const buildings = city.layout.buildings;
    // Shared miniature variants include eaves, porches and wider factory silhouettes.
    const extent = (b: (typeof buildings)[number]) =>
      Math.max(b.width, b.height) * 0.95;
    const margin = 180 + Math.max(0, ...buildings.map(extent)) + 13;
    const minX = Math.min(...buildings.map((b) => b.x)) - margin,
      maxX = Math.max(...buildings.map((b) => b.x)) + margin,
      minY = Math.min(...buildings.map((b) => b.y)) - margin,
      maxY = Math.max(...buildings.map((b) => b.y)) + margin;
    const nearby = segments.filter(
      ([a, b]) =>
        Math.max(a[0], b[0]) >= minX &&
        Math.min(a[0], b[0]) <= maxX &&
        Math.max(a[1], b[1]) >= minY &&
        Math.min(a[1], b[1]) <= maxY,
    );
    const dry = (b: (typeof buildings)[number]) =>
      nearby.every(([a, c]) => distance(b.x, b.y, a, c) > extent(b) + 13);
    const fixed = buildings.filter(dry);
    const kept: typeof buildings = [];
    for (const original of buildings) {
      if (fixed.includes(original)) {
        kept.push(original);
        continue;
      }
      let found: typeof original | undefined;
      for (let radius = 12; radius <= 180 && !found; radius += 12)
        for (let step = 0; step < 24; step++) {
          const angle = (step * Math.PI) / 12,
            candidate = {
              ...original,
              x: original.x + Math.cos(angle) * radius,
              y: original.y + Math.sin(angle) * radius,
            };
          const envelope = {
            ...candidate,
            width: extent(candidate) * 2,
            height: extent(candidate) * 2,
          };
          if (
            !dry(candidate) ||
            !buildingCorners(envelope).every((p) =>
              onLocalLand(data.world.regions[city.region], p),
            )
          )
            continue;
          if (
            [...kept, ...fixed].some((b) =>
              buildingsOverlap(
                envelope,
                { ...b, width: extent(b) * 2, height: extent(b) * 2 },
                4,
              ),
            )
          )
            continue;
          if (
            city.layout.roads.some((r) =>
              r
                .slice(1)
                .some(
                  (b, i) =>
                    distance(
                      candidate.x,
                      candidate.y,
                      [r[i].x, r[i].y],
                      [b.x, b.y],
                    ) <
                    extent(candidate) + 5,
                ),
            )
          )
            continue;
          found = candidate;
          break;
        }
      if (found) {
        kept.push(found);
        moved++;
        city.layout.radius = Math.max(
          city.layout.radius,
          Math.hypot(found.x - city.feature.x, found.y - city.feature.y) +
            extent(found),
        );
      } else omitted++;
    }
    city.layout.buildings = kept;
  }
  return { moved, omitted };
}
