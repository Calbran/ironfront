import type { Region } from "./index.ts";
import type { Geography } from "./geography.ts";
import {
  onLocalLand,
  localSegment,
  invalidateLocalPaths,
  localPath,
} from "./localMovement.ts";
import {
  polygonDistance,
  segmentDistance,
  type TerrainLayout,
  type TerrainPoint,
} from "./terrainLayout.ts";

const point = (p: number[]) => ({ x: p[0], y: p[1] });
function randomFor(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => (h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const rectangle = (
  x: number,
  y: number,
  rx: number,
  ry: number,
): TerrainPoint[] => [
  { x: x - rx, y: y - ry },
  { x: x + rx, y: y - ry },
  { x: x + rx, y: y + ry },
  { x: x - rx, y: y + ry },
];

/** Preserve each pre-existing navigation component, including every surviving border approach. */
export function layoutPreservesConnectivity(r: Region, layout: TerrainLayout) {
  const original = r.terrainLayout;
  const step = r.navigationCellSize ?? 8;
  const xs = r.polygon.map((p) => p[0]),
    ys = r.polygon.map((p) => p[1]);
  const minX = Math.floor(Math.min(...xs) / step) * step + step / 2,
    minY = Math.floor(Math.min(...ys) / step) * step + step / 2;
  const cols = Math.ceil((Math.max(...xs) - minX) / step),
    rows = Math.ceil((Math.max(...ys) - minY) / step);
  const positions = Array.from({ length: cols * rows }, (_, i) => ({
    x: minX + (i % cols) * step,
    y: minY + Math.floor(i / cols) * step,
  }));
  try {
    delete r.terrainLayout;
    const base = positions.map((p) => onLocalLand(r, p));
    const baseGroup = new Int32Array(base.length).fill(-1);
    const adjacent = (i: number) =>
      [
        i % cols ? i - 1 : -1,
        i % cols < cols - 1 ? i + 1 : -1,
        i >= cols ? i - cols : -1,
        i + cols < base.length ? i + cols : -1,
      ].filter((j) => j >= 0);
    let groups = 0;
    for (let i = 0; i < base.length; i++)
      if (base[i] && baseGroup[i] < 0) {
        const queue = [i];
        baseGroup[i] = groups++;
        for (let head = 0; head < queue.length; head++)
          for (const j of adjacent(queue[head]))
            if (
              base[j] &&
              baseGroup[j] < 0 &&
              localSegment(r, positions[queue[head]], positions[j])
            ) {
              baseGroup[j] = baseGroup[i];
              queue.push(j);
            }
      }
    r.terrainLayout = layout;
    if (!onLocalLand(r, r)) return false;
    const open = base.map((b, i) => b && onLocalLand(r, positions[i]));
    const visited = new Uint8Array(base.length),
      seenGroups = new Set<number>();
    for (let i = 0; i < open.length; i++)
      if (open[i] && !visited[i]) {
        const group = baseGroup[i];
        if (seenGroups.has(group)) return false;
        seenGroups.add(group);
        const queue = [i];
        visited[i] = 1;
        for (let head = 0; head < queue.length; head++)
          for (const j of adjacent(queue[head]))
            if (
              open[j] &&
              !visited[j] &&
              localSegment(r, positions[queue[head]], positions[j])
            ) {
              visited[j] = 1;
              queue.push(j);
            }
      }
    return true;
  } finally {
    r.terrainLayout = original;
    invalidateLocalPaths(r);
  }
}

/** Called after geography scaling, before any settlement reservations or road generation. */
export function generateTerrainLayouts(
  map: { regions: Region[]; geography: Geography },
  seed: string,
) {
  const random = randomFor(seed + ":physical-themes-v1"),
    cell = map.geography.cellSize;
  const candidates = map.regions
    .filter(
      (r) =>
        r.terrain !== "mountains" && !r.coastal && r.landUse !== "agricultural",
    )
    .map((r) => ({ r, score: random() }))
    .sort((a, b) => a.score - b.score);
  const quota = Math.max(1, Math.round(map.regions.length * 0.025));
  for (const theme of ["lake", "scrapyard", "mountain-pass"] as const) {
    let made = 0;
    for (const { r } of candidates) {
      if (made >= quota) break;
      if (
        r.terrainLayout ||
        (theme === "mountain-pass"
          ? r.terrain !== "highlands"
          : r.terrain !== "plains")
      )
        continue;
      const rings = (r.contours ?? [r.polygon]).map((ring) => ring.map(point));
      const boundary = rings.flatMap((ring) =>
        ring.map((p, i) => [p, ring[(i + 1) % ring.length]]),
      );
      const edgeDistance = (p: TerrainPoint) =>
        Math.min(...boundary.map(([a, b]) => segmentDistance(p, a, b)));
      const xs = r.polygon.map((p) => p[0]),
        ys = r.polygon.map((p) => p[1]);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs),
        minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const layout: TerrainLayout = {
        version: 1,
        theme,
        obstacles: [],
        crossings: [],
        routes: [],
      };
      if (theme === "lake") {
        let best: { p: TerrainPoint; radius: number } | undefined;
        for (let i = 0; i < 100; i++) {
          const p = {
            x: minX + random() * (maxX - minX),
            y: minY + random() * (maxY - minY),
          };
          if (!onLocalLand(r, p)) continue;
          const radius = Math.min(
            edgeDistance(p) - cell * 3,
            Math.hypot(p.x - r.x, p.y - r.y) - cell * 4,
            Math.min(maxX - minX, maxY - minY) * 0.32,
          );
          if (radius > cell * 5 && (!best || radius > best.radius))
            best = { p, radius };
        }
        if (!best) continue;
        const { p, radius } = best,
          rx = radius * 0.94,
          ry = radius * 0.68;
        const polygon = Array.from({ length: 32 }, (_, i) => {
          const angle = (i * Math.PI) / 16,
            wave =
              1 + 0.055 * Math.sin(angle * 3) + 0.035 * Math.cos(angle * 5);
          return {
            x: p.x + Math.cos(angle) * rx * wave,
            y: p.y + Math.sin(angle) * ry * wave,
          };
        });
        layout.obstacles.push({ id: `${r.id}-lake`, kind: "water", polygon });
        const bridge = {
          id: `${r.id}-bridge`,
          polygon: rectangle(p.x, p.y, cell * 1.6, ry + cell * 2),
          points: [
            { x: p.x, y: p.y - ry - cell * 2 },
            { x: p.x, y: p.y + ry + cell * 2 },
          ],
          width: cell * 3.2,
        };
        if (!bridge.polygon.every((q) => onLocalLand(r, q))) continue;
        layout.crossings.push(bridge);
        // Rocky shore abutments provide real cover beside both approaches.
        for (const y of [p.y - ry - cell * 2, p.y + ry + cell * 2]) {
          const rock = rectangle(p.x + cell * 2.6, y, cell * 0.7, cell * 0.65);
          if (rock.every((q) => onLocalLand(r, q) && edgeDistance(q) > cell))
            layout.obstacles.push({
              id: `${r.id}-abutment-${y}`,
              kind: "ridge",
              polygon: rock,
            });
        }
      } else {
        const pitch = cell * (theme === "scrapyard" ? 4.5 : 5.5),
          halfX = pitch * 0.31,
          halfY = pitch * (theme === "scrapyard" ? 0.27 : 0.42);
        for (
          let y = r.y + Math.floor((minY - r.y) / pitch) * pitch;
          y < maxY;
          y += pitch
        )
          for (
            let x = r.x + Math.floor((minX - r.x) / pitch) * pitch;
            x < maxX;
            x += pitch
          ) {
            if (
              Math.abs(x - r.x) < pitch * 0.6 ||
              Math.abs(y - r.y) < pitch * 0.6 ||
              Math.hypot(x - r.x, y - r.y) < cell * 3
            )
              continue;
            const center = { x, y };
            if (!onLocalLand(r, center)) continue;
            const polygon =
              theme === "scrapyard"
                ? rectangle(x, y, halfX, halfY)
                : [
                    { x: x - halfX, y: y - halfY * 0.8 },
                    { x: x - halfX * 0.4, y: y - halfY },
                    { x: x + halfX * 0.35, y: y - halfY * 0.65 },
                    { x: x + halfX, y: y - halfY * 0.25 },
                    { x: x + halfX * 0.8, y: y + halfY },
                    { x: x, y: y + halfY * 0.72 },
                    { x: x - halfX * 0.9, y: y + halfY * 0.4 },
                  ];
            if (
              !polygon.every(
                (q, i) =>
                  onLocalLand(r, q) &&
                  edgeDistance(q) > cell * 1.5 &&
                  localSegment(r, q, polygon[(i + 1) % polygon.length]),
              )
            )
              continue;
            if (
              (map.geography.rivers ?? []).some((line) =>
                line
                  .slice(1)
                  .some(
                    (b, i) =>
                      segmentDistance(center, point(line[i]), point(b)) <
                      Math.hypot(halfX, halfY) + cell * 2,
                  ),
              )
            )
              continue;
            layout.obstacles.push({
              id: `${r.id}-${layout.obstacles.length}`,
              kind: theme === "scrapyard" ? "scrap" : "ridge",
              polygon,
            });
          }
        if (layout.obstacles.length < 4) continue;
      }
      if (!layoutPreservesConnectivity(r, layout)) continue;
      r.terrainLayout = layout;
      invalidateLocalPaths(r);
      try {
        if (theme === "scrapyard") {
          // A connected service grid replaces independent radial routes to every storage bay.
          const pitch = cell * 4.5;
          const nodes: TerrainPoint[] = [{ x: r.x, y: r.y }],
            lookup = new Map<string, number>();
          const graph: number[][] = [[]];
          const key = (i: number, j: number) => i + ":" + j;
          const loI = Math.floor((minX - r.x) / pitch),
            hiI = Math.ceil((maxX - r.x) / pitch);
          const loJ = Math.floor((minY - r.y) / pitch),
            hiJ = Math.ceil((maxY - r.y) / pitch);
          for (let j = loJ; j <= hiJ; j++)
            for (let i = loI; i <= hiI; i++) {
              const p = {
                x: r.x + (i + 0.5) * pitch,
                y: r.y + (j + 0.5) * pitch,
              };
              if (!onLocalLand(r, p) || edgeDistance(p) < cell) continue;
              lookup.set(key(i, j), nodes.length);
              nodes.push(p);
              graph.push([]);
            }
          const connect = (a: number, b: number) => {
            if (localSegment(r, nodes[a], nodes[b])) {
              graph[a].push(b);
              graph[b].push(a);
            }
          };
          for (let j = loJ; j <= hiJ; j++)
            for (let i = loI; i <= hiI; i++) {
              const a = lookup.get(key(i, j));
              if (a === undefined) continue;
              for (const [di, dj] of [
                [1, 0],
                [0, 1],
              ]) {
                const b = lookup.get(key(i + di, j + dj));
                if (b !== undefined) connect(a, b);
              }
              if (Math.hypot(nodes[a].x - r.x, nodes[a].y - r.y) < pitch)
                connect(0, a);
            }
          const reached = new Set([0]),
            queue = [0];
          for (let i = 0; i < queue.length; i++)
            for (const n of graph[queue[i]])
              if (!reached.has(n)) {
                reached.add(n);
                queue.push(n);
              }
          for (const a of reached)
            for (const b of graph[a])
              if (b > a && reached.has(b))
                layout.routes.push({
                  points: [nodes[a], nodes[b]],
                  width: cell * 0.22,
                });
        } else if (theme === "mountain-pass") {
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            let end: TerrainPoint = { x: r.x, y: r.y };
            for (let i = 1; i < 200; i++) {
              const q = { x: r.x + dx * i * cell, y: r.y + dy * i * cell };
              if (
                !onLocalLand(r, q) ||
                edgeDistance(q) < cell ||
                !localSegment(r, end, q)
              )
                break;
              end = q;
            }
            if (Math.hypot(end.x - r.x, end.y - r.y) > cell * 2)
              layout.routes.push({
                points: [{ x: r.x, y: r.y }, end],
                width: cell * 0.2,
              });
          }
        }
        for (const crossing of layout.crossings) {
          // These links establish bridge access even when a region has no settlement.
          for (const end of crossing.points)
            layout.routes.push({
              points: [{ x: r.x, y: r.y }, ...localPath(r, r, end)],
              width: cell * 0.55,
            });
          if (!localSegment(r, crossing.points[0], crossing.points[1]))
            throw Error("Disconnected bridge");
        }
      } catch {
        delete r.terrainLayout;
        invalidateLocalPaths(r);
        continue;
      }
      made++;
    }
  }
}

/** Reserve enough space for the largest settlement sprite around candidate sites. */
export function supportsSettlement(r: Region, p: TerrainPoint) {
  return (
    onLocalLand(r, p) &&
    (!r.terrainLayout ||
      (r.terrainLayout.obstacles.every(
        (o) => polygonDistance(o.polygon, p) > 500,
      ) &&
        r.terrainLayout.crossings.every(
          (c) => polygonDistance(c.polygon, p) > 500,
        )))
  );
}
