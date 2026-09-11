import { polygonContains } from "./terrainLayout.ts";
import { uniqueRoadSegments } from "./roadNetwork.ts";
import { landscapeClearance } from "./landscapeClearance.ts";
import { generateLandscape, settlementClearance } from "./landscape.ts";
import { visualScale } from "./visualScale.ts";
import type { CityRoad } from "./cityRoads.ts";
import type { World, Region, RegionFeature } from "./index.ts";
import type { CityLayout, CityPoint } from "./cityLayout.ts";
import { localSegment, onLocalLand } from "./localMovement.ts";
export interface TerrainAccent extends CityPoint {
  atlas?: "trees";
  width: number;
  variant: number;
  minZoom: number;
  alpha: number;
}
export interface AccentLine {
  points: CityPoint[];
  kind: "utility" | "field";
  minZoom: number;
}
export interface AccentCity extends CityPoint {
  region: number;
  size?: RegionFeature["size"];
  layout: CityLayout;
}
export function generateTerrainAccents(
  w: World,
  cities: readonly AccentCity[],
  roads: readonly CityRoad[] = [],
) {
  const cell = w.geography?.cellSize ?? 8;
  const sizes = visualScale(w);
  const cityClearances = cities.map((city) => settlementClearance(city, cell));
  let seed = 2166136261;
  for (const c of `${w.seed}:accents-v1`)
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const sprites: TerrainAccent[] = [],
    lines: AccentLine[] = [];
  const patches = (w.geography?.terrainPatches ?? []).map((p) => {
    const pts = p.contours.flat();
    return {
      ...p,
      minX: Math.min(...pts.map((p) => p[0])),
      maxX: Math.max(...pts.map((p) => p[0])),
      minY: Math.min(...pts.map((p) => p[1])),
      maxY: Math.max(...pts.map((p) => p[1])),
    };
  });
  function biome(r: Region, p: CityPoint) {
    let type = r.terrain;
    for (const patch of patches) {
      if (
        p.x < patch.minX ||
        p.x > patch.maxX ||
        p.y < patch.minY ||
        p.y > patch.maxY
      )
        continue;
      let hit = false;
      for (const ring of patch.contours)
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const a = ring[i],
            b = ring[j];
          if (
            a[1] > p.y !== b[1] > p.y &&
            p.x < ((b[0] - a[0]) * (p.y - a[1])) / (b[1] - a[1]) + a[0]
          )
            hit = !hit;
        }
      if (hit) type = patch.terrain;
    }
    return type;
  }
  const outsideCity = (p: CityPoint, padding: number) =>
    cityClearances.every((city) => {
      const dx = (p.x - city.x) / (city.radiusX + padding),
        dy = (p.y - city.y) / (city.radiusY + padding);
      return dx * dx + dy * dy > 1;
    });
  function fits(r: Region, p: CityPoint, width: number) {
    const half = width * 0.5;
    return [
      [0, 0],
      [-half, -half],
      [half, -half],
      [-half, half],
      [half, half],
    ].every(([dx, dy]) => onLocalLand(r, { x: p.x + dx, y: p.y + dy }));
  }
  for (const r of w.regions) {
    if (r.terrain === "mountains") continue;
    const pts = r.polygon,
      step = cell * 4.5;
    for (
      let y = Math.min(...pts.map((p) => p[1]));
      y < Math.max(...pts.map((p) => p[1]));
      y += step
    )
      for (
        let x = Math.min(...pts.map((p) => p[0]));
        x < Math.max(...pts.map((p) => p[0]));
        x += step
      ) {
        const p = { x: x + random() * step, y: y + random() * step };
        if (random() > 0.68 || !onLocalLand(r, p)) continue;
        const type = biome(r, p);
        if (type === "mountains") continue;
        const choice = random(),
          hill = type !== "forest" && choice < 0.12;
        const variant = hill
          ? type === "highlands"
            ? 1
            : 0
          : type === "forest"
            ? 2
            : type === "highlands"
              ? choice < 0.55
                ? 7
                : 3
              : choice < 0.4
                ? 3
                : choice < 0.65
                  ? 2
                  : choice < 0.84
                    ? 4
                    : 5;
        const width =
          (hill
            ? sizes.hill
            : variant === 2
              ? sizes.scrub
              : variant === 3
                ? sizes.grass
                : variant === 7
                  ? sizes.stones
                  : sizes.flowers) *
          (0.7 + random() * 0.6);
        if (!fits(r, p, width) || !outsideCity(p, width * 0.6)) continue;
        if (
          hill &&
          sprites.some(
            (s) =>
              s.variant < 2 &&
              Math.hypot(s.x - p.x, s.y - p.y) < (s.width + width) * 0.6,
          )
        )
          continue;
        sprites.push({
          ...p,
          width,
          variant,
          minZoom: hill ? 2.2 : 4,
          alpha: hill ? 0.55 : 0.8,
        });
        // Short, irregular field edges near rural settlements; never fence entire regions.
        if (
          !hill &&
          type === "plains" &&
          choice > 0.93 &&
          cities.some(
            (c) =>
              Math.hypot(c.x - p.x, c.y - p.y) < c.layout.radius + cell * 25,
          )
        ) {
          const angle = random() * Math.PI,
            length = cell * (3 + random() * 4),
            end = {
              x: p.x + Math.cos(angle) * length,
              y: p.y + Math.sin(angle) * length,
            };
          if (localSegment(r, p, end) && outsideCity(end, cell))
            lines.push({ points: [p, end], kind: "field", minZoom: 4 });
        }
      }
  }
  // Reeds follow river banks, not the middle of arbitrary plains.
  for (const river of w.geography?.rivers ?? [])
    for (let i = 1; i < river.length; i++) {
      const a = river[i - 1],
        b = river[i],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < cell || random() > 0.4) continue;
      const side = random() < 0.5 ? -1 : 1,
        p = {
          x: (a[0] + b[0]) / 2 - ((b[1] - a[1]) / length) * cell * 1.4 * side,
          y: (a[1] + b[1]) / 2 + ((b[0] - a[0]) / length) * cell * 1.4 * side,
        };
      const r = w.regions.find((r) => onLocalLand(r, p));
      if (r && fits(r, p, cell * 1.4) && outsideCity(p, cell))
        sprites.push({
          ...p,
          width: sizes.reeds,
          variant: 6,
          minZoom: 4,
          alpha: 0.8,
        });
    }
  const landBounds = w.regions.map((r) => {
    const points = (r.contours ?? [r.polygon]).flat();
    return {
      r,
      minX: Math.min(...points.map((p) => p[0])),
      maxX: Math.max(...points.map((p) => p[0])),
      minY: Math.min(...points.map((p) => p[1])),
      maxY: Math.max(...points.map((p) => p[1])),
    };
  });
  const clearsRoadNetwork = landscapeClearance([], roads, sizes.road);
  // Preserve every road bend and border gateway; never discard an individual span.
  for (const road of uniqueRoadSegments(roads).filter((r) => r.utilities)) {
    const roadHalf = sizes.road * (road.kind === "main" ? 1.6 : 1) * 1.05;
    // Include the projected pole height so even wires on the near side clear asphalt.
    const clearance = roadHalf + sizes.pole + cell * 0.25;
    const makeVerge = (side: number) =>
      road.points.map((p, i, points) => {
        const a = points[Math.max(0, i - 1)],
          b = points[Math.min(points.length - 1, i + 1)],
          length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        return {
          x: p.x - ((b.y - a.y) / length) * clearance * side,
          y: p.y + ((b.x - a.x) / length) * clearance * side,
        };
      });
    const fitsVerge = (p: CityPoint) =>
      clearsRoadNetwork(p, sizes.pole + cell * 0.1) &&
      landBounds.some(
        (b) =>
          p.x >= b.minX &&
          p.x <= b.maxX &&
          p.y >= b.minY &&
          p.y <= b.maxY &&
          onLocalLand(b.r, p),
      );
    const left = makeVerge(1),
      right = makeVerge(-1);
    // Choose one consistent side; omit blocked spans rather than moving onto the road.
    const route =
      right.filter(fitsVerge).length > left.filter(fitsVerge).length
        ? right
        : left;
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1],
        b = route[i];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (length === 0) continue;
      const count = Math.max(1, Math.ceil(length / (cell * 3.5)));
      let previous: CityPoint = { x: a.x, y: a.y };
      for (let j = 1; j <= count; j++) {
        const next =
          j === count
            ? { x: b.x, y: b.y }
            : {
                x: a.x + ((b.x - a.x) * j) / count,
                y: a.y + ((b.y - a.y) * j) / count,
              };
        const samples = Math.max(
          1,
          Math.ceil(
            Math.hypot(next.x - previous.x, next.y - previous.y) / (cell * 0.1),
          ),
        );
        let valid = true;
        for (let k = 0; k <= samples; k++) {
          const t = k / samples;
          if (
            !fitsVerge({
              x: previous.x + (next.x - previous.x) * t,
              y: previous.y + (next.y - previous.y) * t,
            })
          ) {
            valid = false;
            break;
          }
        }
        if (valid)
          lines.push({ points: [previous, next], kind: "utility", minZoom: 4 });
        previous = next;
      }
    }
  }
  const landscape = generateLandscape(w, cities, roads, biome);
  const clearsLandUse = landscapeClearance(landscape.fields, roads, sizes.road);
  const natural = sprites.filter((p) => clearsLandUse(p, p.width * 0.55));
  natural.push(...landscape.sprites);
  const themedRings=w.regions.filter(r=>r.terrainLayout).map(r=>(r.contours??[r.polygon]).map(ring=>ring.map(([x,y])=>({x,y}))));
  return {
    sprites: natural.filter(p=>!themedRings.some(rings=>rings.reduce((inside,ring)=>polygonContains(ring,p)?!inside:inside,false))).sort((a, b) => a.y - b.y),
    lines,
    fields: landscape.fields,
    farmLanes: landscape.lanes,
  };
}
