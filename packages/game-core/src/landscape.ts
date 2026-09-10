import { farmClipper, farmCircle, farmCorridor } from "./farmClipping.ts";
import type { World, Region } from "./index.ts";
import type { CityPoint } from "./cityLayout.ts";
import type { CityRoad } from "./cityRoads.ts";
import type { AccentCity, TerrainAccent } from "./terrainAccents.ts";
import { onLocalLand, localSegment } from "./localMovement.ts";
import { visualScale } from "./visualScale.ts";
export interface FieldParcel {
  points: CityPoint[];
  kind: "pasture" | "plowed" | "crop";
  district?: string;
  fragments?: CityPoint[][];
}
/** Cosmetic land use: clusters have a landscape footprint, while plants retain world scale. */
export function generateLandscape(
  w: World,
  cities: readonly AccentCity[],
  roads: readonly CityRoad[],
  biome: (r: Region, p: CityPoint) => Region["terrain"] = (r) => r.terrain,
) {
  const scale = visualScale(w),
    cell = w.geography?.cellSize ?? 8;
  let seed = 2166136261;
  for (const ch of `${w.seed}:landscape-v1`)
    seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const fields: FieldParcel[] = [],
    sprites: TerrainAccent[] = [];
  const segments = roads.flatMap((r) =>
    r.points.slice(1).map((b, i) => [r.points[i], b] as const),
  );
  const rivers = (w.geography?.rivers ?? []).flatMap((r) =>
    r.slice(1).map(
      (b, i) =>
        [
          { x: r[i][0], y: r[i][1] },
          { x: b[0], y: b[1] },
        ] as const,
    ),
  );
  function distance(p: CityPoint, a: CityPoint, b: CityPoint) {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  const near = (p: CityPoint, radius: number, list: typeof segments) =>
    list.some(([a, b]) => distance(p, a, b) < radius);
  const clearCity = (p: CityPoint, radius: number) =>
    cities.every(
      (c) => Math.hypot(c.x - p.x, c.y - p.y) > c.layout.radius + radius,
    );
  const placed: { x: number; y: number; radius: number }[] = [];
  const lanes: CityPoint[][] = [];
  const district = new Map<number, number>();
  const eligible = new Set(
    w.regions
      .filter((r) =>
        r.landUse ? r.landUse === "agricultural" : r.terrain === "plains",
      )
      .map((r) => r.id),
  );
  for (const id of eligible)
    if (!district.has(id)) {
      const queue = [id];
      district.set(id, id);
      for (let i = 0; i < queue.length; i++)
        for (const n of w.regions[queue[i]].neighbors)
          if (eligible.has(n) && !district.has(n)) {
            district.set(n, id);
            queue.push(n);
          }
    }
  const salt = seed;
  const pattern = (x: number, y: number, d: number) => {
    let h =
      Math.imul(x, 374761393) ^
      Math.imul(y, 668265263) ^
      Math.imul(d + 1, 1274126177) ^
      salt;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  // Agricultural land use belongs to regions, independent of settlement presence.
  // Shared, jittered lattice vertices give neighboring parcels matching boundaries.
  for (const r of w.regions) {
    if (!eligible.has(r.id)) continue;
    const districtId = district.get(r.id)!;
    const direction = pattern(0, 0, districtId) * Math.PI;
    const cos = Math.cos(direction),
      sin = Math.sin(direction);
    const local = (p: number[]) => ({
      x: p[0] * cos + p[1] * sin,
      y: -p[0] * sin + p[1] * cos,
    });
    const boundary = r.polygon.map(local);
    const step = cell * (3.5 + pattern(1, 0, districtId) * 1.5);
    const minX = Math.floor(Math.min(...boundary.map((p) => p.x)) / step) - 1,
      maxX = Math.ceil(Math.max(...boundary.map((p) => p.x)) / step) + 1;
    const minY = Math.floor(Math.min(...boundary.map((p) => p.y)) / step) - 1,
      maxY = Math.ceil(Math.max(...boundary.map((p) => p.y)) / step) + 1;
    const clip = farmClipper(r, [
      ...segments.map(([a, b]) => farmCorridor(a, b, scale.road * 2.5)),
      ...rivers.map(([a, b]) => farmCorridor(a, b, cell * 0.55)),
      ...cities.map((c) => farmCircle(c.x, c.y, c.layout.radius + cell * 0.4)),
      ...(r.mountainObstacles ?? []).map((o) =>
        farmCircle(o.x, o.y, o.radius + cell * 0.2),
      ),
    ]);
    const vertices = new Map<string, CityPoint>();
    const vertex = (x: number, y: number) => {
      const key = `${x}:${y}`;
      let p = vertices.get(key);
      if (!p) {
        const u = (x + (pattern(x, y, districtId) - 0.5) * 0.18) * step,
          v = (y + (pattern(y, x, districtId + 1) - 0.5) * 0.18) * step;
        p = { x: u * cos - v * sin, y: u * sin + v * cos };
        vertices.set(key, p);
      }
      return p;
    };
    for (let y = minY; y < maxY; y++)
      for (let x = minX; x < maxX; x++) {
        const corners = [
          vertex(x, y),
          vertex(x + 1, y),
          vertex(x + 1, y + 1),
          vertex(x, y + 1),
        ];
        const center = {
          x: corners.reduce((n, p) => n + p.x, 0) / 4,
          y: corners.reduce((n, p) => n + p.y, 0) / 4,
        };
        const radius = Math.max(
          ...corners.map((p) => Math.hypot(p.x - center.x, p.y - center.y)),
        );
        // Narrow grassy strips divide cultivated parcels; selected edges carry farm lanes.
        const points = corners.map((p) => ({
          x: p.x + (center.x - p.x) * 0.025,
          y: p.y + (center.y - p.y) * 0.025,
        }));
        const fragments = clip(points);
        if (!fragments.length) continue;
        fields.push({
          points,
          fragments,
          district: `farmland-${districtId}`,
          kind: (["pasture", "plowed", "crop", "crop"] as const)[
            Math.floor(random() * 4)
          ],
        });
        placed.push({ ...center, radius });
        for (const edge of [0, 3]) {
          const a = corners[edge],
            b = corners[(edge + 1) % 4];
          if (
            (edge === 0 ? y : x) % 3 === 0 &&
            localSegment(r, a, b) &&
            clearCity(a, cell) &&
            clearCity(b, cell) &&
            !near(a, scale.road * 2, segments) &&
            !near(b, scale.road * 2, segments)
          )
            lanes.push([a, b]);
          // Sparse individual trees keep their physical scale along extensive hedges.
          const count = Math.floor(
            Math.hypot(b.x - a.x, b.y - a.y) / (scale.tree * 5),
          );
          for (let j = 1; j < count; j++)
            if (random() < 0.35) {
              const t = j / count;
              const tree = {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
              };
              if (
                !onLocalLand(r, tree) ||
                !clearCity(tree, scale.tree) ||
                near(tree, scale.tree, segments) ||
                near(tree, scale.tree, rivers)
              )
                continue;
              sprites.push({
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                width: scale.tree * (0.8 + random() * 0.3),
                atlas: "trees",
                variant: 0,
                minZoom: 3,
                alpha: 0.8,
              });
            }
        }
      }
  }
  function scatter(
    center: CityPoint,
    rx: number,
    ry: number,
    angle: number,
    kind: "meadow" | "scrub" | "grove" | "bank",
  ) {
    const r = w.regions.find((r) => onLocalLand(r, center));
    if (!r || r.terrain === "mountains") return;
    const variant = random() < 0.5 ? 4 : 5;
    const count = kind === "grove" ? 14 : 32;
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2,
        d = Math.sqrt(random()),
        u = Math.cos(a) * rx * d,
        v = Math.sin(a) * ry * d;
      const p = {
        x: center.x + u * Math.cos(angle) - v * Math.sin(angle),
        y: center.y + u * Math.sin(angle) + v * Math.cos(angle),
      };
      const tree = kind === "grove" || (kind === "bank" && i % 9 === 0);
      const width =
        (tree
          ? scale.tree
          : kind === "bank"
            ? scale.reeds
            : kind === "scrub"
              ? scale.scrub
              : scale.flowers) *
        (0.8 + random() * 0.4);
      if (
        !clearCity(p, width) ||
        !onLocalLand(r, p) ||
        near(p, width * 0.55 + scale.road, segments) ||
        near(p, width * 0.5 + cell * 0.3, rivers) ||
        placed.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < q.radius + width)
      )
        continue;
      if (
        ![
          { x: p.x - width * 0.5, y: p.y },
          { x: p.x + width * 0.5, y: p.y },
          { x: p.x, y: p.y - width * 0.5 },
          { x: p.x, y: p.y + width * 0.5 },
        ].every((q) => localSegment(r, p, q))
      )
        continue;
      sprites.push({
        ...p,
        width,
        variant: tree
          ? Math.floor(random() * 4)
          : kind === "bank"
            ? 6
            : kind === "scrub"
              ? 2
              : i % 4 === 0
                ? 3
                : variant,
        atlas: tree ? "trees" : undefined,
        minZoom: tree ? 2.2 : 3,
        alpha: tree ? 0.9 : 0.85,
      });
    }
  }
  // Broadly spaced pockets, rather than one enlarged flower or bush per territory.
  for (const r of w.regions) {
    if (r.terrain === "mountains" || r.terrain === "forest") continue;
    const xs = r.polygon.map((p) => p[0]),
      ys = r.polygon.map((p) => p[1]);
    for (let i = 0; i < 5; i++) {
      const p = {
        x: Math.min(...xs) + random() * (Math.max(...xs) - Math.min(...xs)),
        y: Math.min(...ys) + random() * (Math.max(...ys) - Math.min(...ys)),
      };
      if (onLocalLand(r, p))
        scatter(
          p,
          cell * (7 + random() * 7),
          cell * (1 + random() * 1.5),
          random() * Math.PI,
          i === 0 ? "grove" : r.terrain === "highlands" ? "scrub" : "meadow",
        );
    }
  }
  // Follow banks with elongated reed beds and occasional trees, leaving channels clear.
  for (const [a, b] of rivers) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      length = Math.hypot(dx, dy);
    if (length < cell * 2) continue;
    const count = Math.ceil(length / (cell * 8));
    for (let i = 0; i < count; i++) {
      if (random() > 0.6) continue;
      const t = (i + 0.5) / count,
        side = random() < 0.5 ? -1 : 1;
      scatter(
        {
          x: a.x + dx * t - (dy / length) * cell * 1.4 * side,
          y: a.y + dy * t + (dx / length) * cell * 1.4 * side,
        },
        Math.min(cell * 3, (length / count) * 0.45),
        cell * 0.6,
        Math.atan2(dy, dx),
        "bank",
      );
    }
  }
  return { fields, sprites, lanes };
}
