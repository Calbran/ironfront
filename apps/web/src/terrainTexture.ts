import { Delaunay } from "d3-delaunay";
import type { World } from "../../../packages/game-core/src/index";
import {
  smooth,
  signedArea,
  type Point,
} from "../../../packages/game-core/src/geography";
export function coastPath(ctx: CanvasRenderingContext2D, rings: number[][][]) {
  ctx.beginPath();
  for (const ring of rings) {
    if (!ring.length) continue;
    ctx.moveTo(ring[0][0], ring[0][1]);
    for (const p of ring.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
  }
}
export function terrainTexture(w: World): HTMLCanvasElement {
  const width = w.geography?.width ?? 1000,
    height = w.geography?.height ?? 690;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const coasts = w.geography?.coastlines ?? w.regions.map((r) => r.polygon),
    islands = w.geography?.islands ?? [];
  // Submerged coastal shelves establish water depth before the land silhouette.
  for (const [line, alpha] of [
    [44, 0.045],
    [24, 0.06],
    [10, 0.09],
  ] as const) {
    coastPath(ctx, [...coasts, ...islands]);
    ctx.strokeStyle = `rgba(174,202,186,${alpha})`;
    ctx.lineWidth = line;
    ctx.stroke();
  }
  ctx.save();
  coastPath(ctx, [...coasts, ...islands]);
  ctx.clip("evenodd");
  const step = 3,
    cw = Math.ceil(width / step),
    ch = Math.ceil(height / step),
    field = new Float32Array(cw * ch),
    moist = new Float32Array(cw * ch);
  const d = Delaunay.from(w.regions.map((r) => [r.x, r.y])),
    neighbor = w.regions.map((_, i) => [i, ...d.neighbors(i)]);
  let hint = 0;
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const px = x * step,
        py = y * step;
      hint = d.find(px, py, hint);
      let e = 0,
        m = 0,
        weight = 0;
      for (const id of neighbor[hint]) {
        const r = w.regions[id],
          dx = px - r.x,
          dy = py - r.y,
          v = 1 / Math.pow(dx * dx + dy * dy + 450, 1.6);
        weight += v;
        e += (r.elevation ?? (r.terrain === "highlands" ? 0.7 : 0.25)) * v;
        m += (r.moisture ?? (r.terrain === "forest" ? 0.7 : 0.4)) * v;
      }
      field[y * cw + x] =
        e / weight +
        (Math.sin(px * 0.075 + Math.sin(py * 0.041) * 3) +
          Math.sin(py * 0.095 + px * 0.042)) *
          0.012;
      moist[y * cw + x] = m / weight;
    }
  const raster = document.createElement("canvas");
  raster.width = cw;
  raster.height = ch;
  const rctx = raster.getContext("2d")!,
    pixels = rctx.createImageData(cw, ch);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x,
        e = field[i],
        m = moist[i];
      let color = [177, 178, 145];
      if (m > 0.43) {
        const f = Math.min(1, (m - 0.43) * 4);
        color = color.map((c, j) => c * (1 - f) + [99, 128, 103][j] * f);
      }
      if (e > 0.5) {
        const f = Math.min(1, (e - 0.5) * 2.5);
        color = color.map((c, j) => c * (1 - f) + [141, 147, 137][j] * f);
      }
      if (e > 0.79) {
        const f = Math.min(1, (e - 0.79) * 5);
        color = color.map((c, j) => c * (1 - f) + [219, 221, 205][j] * f);
      }
      const dx =
          field[y * cw + Math.max(0, x - 1)] -
          field[y * cw + Math.min(cw - 1, x + 1)],
        dy =
          field[Math.max(0, y - 1) * cw + x] -
          field[Math.min(ch - 1, y + 1) * cw + x];
      const shade = Math.max(-35, Math.min(30, dx * 550 + dy * 380));
      const grain = ((Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1) * 3;
      for (let j = 0; j < 3; j++)
        pixels.data[i * 4 + j] = color[j] + shade + grain;
      pixels.data[i * 4 + 3] = 255;
    }
  rctx.putImageData(pixels, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(raster, 0, 0, width, height);
  // Fine forest canopy clusters, grounded in the broad moisture field.
  ctx.fillStyle = "rgba(33,69,48,.14)";
  for (let y = 3; y < ch; y += 2)
    for (let x = 3; x < cw; x += 2) {
      const i = y * cw + x;
      if (moist[i] > 0.54 && field[i] < 0.66) {
        const n = Math.abs(Math.sin(x * 12.98 + y * 78.2));
        if (n > 0.45) {
          ctx.beginPath();
          ctx.ellipse(
            x * step + n * 3,
            y * step,
            1.4 + n,
            1.7 + n,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }
  // Rivers are connected source-to-shore paths; their width is geographic, not a region decoration.
  for (const river of w.geography?.rivers ?? []) {
    if (river.length < 2) continue;
    for (const [width, color] of [
      [4, "#7f9b98"],
      [1.7, "#bdd3c4"],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(river[0][0], river[0][1]);
      for (let i = 1; i < river.length - 1; i++) {
        const p = river[i],
          n = river[i + 1];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + n[0]) / 2, (p[1] + n[1]) / 2);
      }
      ctx.lineTo(...river.at(-1)!);
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }
  ctx.restore();
  coastPath(ctx, [...coasts, ...islands]);
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = "#c2c7a7";
  ctx.stroke();
  return canvas;
}
export function territoryRings(r: World["regions"][number]): Point[][] {
  return r.contours
    ? r.contours.map((ring) => smooth(ring, 1))
    : [r.polygon as Point[]];
}
export function boundaryEdges(w: World) {
  const edges = new Map<string, { a: Point; b: Point; regions: number[] }>();
  for (const r of w.regions)
    for (const ring of r.contours ?? [r.polygon as Point[]])
      for (let j = 0; j < ring.length; j++) {
        const a = ring[j],
          b = ring[(j + 1) % ring.length];
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const steps = r.contours ? Math.max(1, Math.round(length / 8)) : 1;
        for (let k = 0; k < steps; k++) {
          const p: Point = [
              a[0] + ((b[0] - a[0]) * k) / steps,
              a[1] + ((b[1] - a[1]) * k) / steps,
            ],
            q: Point = [
              a[0] + ((b[0] - a[0]) * (k + 1)) / steps,
              a[1] + ((b[1] - a[1]) * (k + 1)) / steps,
            ];
          const ps = p.map((n) => n.toFixed(2)).join(","),
            qs = q.map((n) => n.toFixed(2)).join(","),
            key = ps < qs ? ps + "|" + qs : qs + "|" + ps;
          const e = edges.get(key);
          if (e) e.regions.push(r.id);
          else edges.set(key, { a: p, b: q, regions: [r.id] });
        }
      }
  if (!w.geography) return [...edges.values()];
  // Smooth each shared boundary once so both territories use the same line.
  // Endpoints stay fixed at coast/junction intersections.
  const groups = new Map<string, { a: Point; b: Point; regions: number[] }[]>();
  for (const edge of edges.values()) {
    const key = edge.regions
      .slice()
      .sort((a, b) => a - b)
      .join(":");
    const group = groups.get(key) ?? [];
    group.push(edge);
    groups.set(key, group);
  }
  const result: { a: Point; b: Point; regions: number[] }[] = [];
  for (const group of groups.values()) {
    const links = new Map<string, number[]>();
    const key = (p: Point) => p.join(",");
    group.forEach((e, i) => {
      for (const p of [e.a, e.b]) {
        const list = links.get(key(p)) ?? [];
        list.push(i);
        links.set(key(p), list);
      }
    });
    const used = new Set<number>();
    const starts = group
      .map((_, i) => i)
      .sort(
        (a, b) =>
          Number(
            links.get(key(group[b].a))!.length === 1 ||
              links.get(key(group[b].b))!.length === 1,
          ) -
          Number(
            links.get(key(group[a].a))!.length === 1 ||
              links.get(key(group[a].b))!.length === 1,
          ),
      );
    for (const first of starts) {
      if (used.has(first)) continue;
      const e = group[first];
      let at = links.get(key(e.b))!.length === 1 ? e.b : e.a;
      const chain: Point[] = [at];
      let next: number | undefined = first;
      while (next !== undefined) {
        used.add(next);
        const edge = group[next];
        at = key(edge.a) === key(at) ? edge.b : edge.a;
        chain.push(at);
        next = links.get(key(at))?.find((i) => !used.has(i));
      }
      const curve = chain.map((p, i): Point =>
        i === 0 || i === chain.length - 1
          ? p
          : [
              (chain[i - 1][0] + p[0] * 2 + chain[i + 1][0]) / 4,
              (chain[i - 1][1] + p[1] * 2 + chain[i + 1][1]) / 4,
            ],
      );
      for (let i = 1; i < curve.length; i++)
        result.push({ a: curve[i - 1], b: curve[i], regions: e.regions });
    }
  }
  return result;
}
