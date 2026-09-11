import { Container, Graphics, type FillPattern } from "pixi.js";
import type { World } from "../../../packages/game-core/src/index";
import { polygonContains } from "../../../packages/game-core/src/terrainLayout";
import { signedArea } from "../../../packages/game-core/src/geography";
import type { MapGeometry } from "./mapGeometry";

/** Region-wide ground treatment and feature art share the saved collision polygons. */
export function terrainLayoutGraphics(
  world: World,
  geometry: MapGeometry,
  patterns: Map<string, FillPattern>,
) {
  const layer = new Container(),
    cell = world.geography?.cellSize ?? 8;
  layer.eventMode = "none";
  for (const r of world.regions) {
    const layout = r.terrainLayout;
    if (!layout) continue;
    const region = new Container(),
      ground = new Graphics(),
      art = new Graphics(),
      mask = new Graphics();
    layer.addChild(region);
    region.addChild(ground, art, mask);
    const base =
      layout.theme === "scrapyard"
        ? "#796e59"
        : layout.theme === "mountain-pass"
          ? "#8c8977"
          : "#829079";
    for (const ring of geometry.rings[r.id]) {
      ground.poly(ring.flat());
      mask.poly(ring.flat());
      if (signedArea(ring) > 0) {
        ground.fill({ color: base, alpha: 0.83 });
        mask.fill(0xffffff);
      } else {
        ground.cut();
        mask.cut();
      }
    }
    region.mask = mask;
    // A shared low-contrast material gives the entire district one ground identity.
    const material = patterns.get(
      layout.theme === "lake" ? "plains" : "highlands",
    );
    if (material)
      for (const ring of geometry.rings[r.id]) {
        ground.poly(ring.flat());
        if (signedArea(ring) > 0) ground.fill({ fill: material, alpha: 0.23 });
        else ground.cut();
      }
    let seed = (r.id + 1) * 1274126177;
    const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (const obstacle of layout.obstacles) {
      const polygon = obstacle.polygon,
        flat = polygon.flatMap((p) => [p.x, p.y]);
      const xs = polygon.map((p) => p.x),
        ys = polygon.map((p) => p.y);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs),
        minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const cx = (minX + maxX) / 2,
        cy = (minY + maxY) / 2;
      if (obstacle.kind === "water") {
        art
          .poly(flat)
          .stroke({ color: "#b4ac86", width: cell * 0.6, join: "round" });
        art.poly(flat).fill("#365d66");
        const water = patterns.get("river");
        if (water) art.poly(flat).fill({ fill: water, alpha: 0.75 });
        art
          .poly(flat)
          .stroke({
            color: "#7faaa2",
            width: cell * 0.15,
            alpha: 0.8,
            join: "round",
          });
        for (let i = 0; i < 45; i++) {
          const x = minX + random() * (maxX - minX),
            y = minY + random() * (maxY - minY);
          if (
            !polygonContains(polygon, { x: x - cell * 0.3, y }) ||
            !polygonContains(polygon, { x: x + cell * 0.3, y })
          )
            continue;
          art
            .moveTo(x - cell * 0.3, y)
            .quadraticCurveTo(x, y - cell * 0.07, x + cell * 0.3, y)
            .stroke({ color: "#a4c1b9", alpha: 0.18, width: cell * 0.025 });
        }
      } else if (obstacle.kind === "ridge") {
        art
          .poly(polygon.flatMap((p) => [p.x + cell * 0.3, p.y + cell * 0.3]))
          .fill({ color: "#333d38", alpha: 0.32 });
        art
          .poly(flat)
          .fill("#777971")
          .stroke({ color: "#535e55", width: cell * 0.055 });
        const spine = [
          { x: cx - (maxX - minX) * 0.12, y: minY + (maxY - minY) * 0.1 },
          { x: cx + (maxX - minX) * 0.06, y: cy },
          { x: cx - (maxX - minX) * 0.03, y: maxY - (maxY - minY) * 0.12 },
        ];
        art
          .poly([
            polygon[0].x,
            polygon[0].y,
            polygon[1].x,
            polygon[1].y,
            spine[0].x,
            spine[0].y,
            spine[1].x,
            spine[1].y,
            spine[2].x,
            spine[2].y,
            polygon[Math.min(5, polygon.length - 1)].x,
            polygon[Math.min(5, polygon.length - 1)].y,
            polygon[6]?.x ?? polygon[0].x,
            polygon[6]?.y ?? polygon[0].y,
          ])
          .fill({ color: "#b3af9b", alpha: 0.4 });
        art
          .moveTo(spine[0].x, spine[0].y)
          .lineTo(spine[1].x, spine[1].y)
          .lineTo(spine[2].x, spine[2].y)
          .stroke({ color: "#d4cbb1", width: cell * 0.06, alpha: 0.7 });
        for (let i = 0; i < polygon.length; i++) {
          const p = polygon[i],
            mid = spine[Math.min(2, Math.floor((i * 3) / polygon.length))];
          art
            .moveTo(mid.x, mid.y)
            .lineTo(p.x * 0.7 + mid.x * 0.3, p.y * 0.7 + mid.y * 0.3)
            .stroke({ color: "#424e46", width: cell * 0.035, alpha: 0.28 });
        }
        for (let i = 0; i < 28; i++) {
          const x = minX + random() * (maxX - minX),
            y = minY + random() * (maxY - minY);
          if (polygonContains(polygon, { x, y }))
            art
              .moveTo(x, y)
              .lineTo(x + cell * 0.18, y - cell * 0.14)
              .stroke({ color: "#dad2b7", width: cell * 0.035, alpha: 0.35 });
        }
      } else {
        // Storage bays are coherent blocks with service verges, not isolated sprite stamps.
        art
          .poly(flat)
          .stroke({ color: "#9c8b6c", width: cell * 0.32, alpha: 0.7 });
        art
          .poly(polygon.flatMap((p) => [p.x + cell * 0.12, p.y + cell * 0.12]))
          .fill({ color: "#262e2a", alpha: 0.38 });
        art
          .poly(flat)
          .fill("#4c4f44")
          .stroke({ color: "#333d35", width: cell * 0.07 });
        for (
          let y = minY + cell * 0.23;
          y < maxY - cell * 0.3;
          y += cell * 0.56
        )
          for (
            let x = minX + cell * 0.18;
            x < maxX - cell * 0.45;
            x += cell * 0.7
          ) {
            const colors = [
              "#8e593d",
              "#a4754b",
              "#727d71",
              "#b1966e",
              "#596760",
            ];
            const w = cell * (0.4 + random() * 0.15),
              h = cell * (0.23 + random() * 0.14),
              dx = random() * cell * 0.1;
            art
              .rect(x + dx + cell * 0.06, y + cell * 0.06, w, h)
              .fill({ color: "#242d28", alpha: 0.7 });
            art
              .rect(x + dx, y, w, h)
              .fill(colors[Math.floor(random() * colors.length)]);
            art
              .moveTo(x + dx, y)
              .lineTo(x + dx + w, y)
              .stroke({ color: "#c2aa81", width: cell * 0.035, alpha: 0.65 });
            art
              .rect(x + dx + w * 0.35, y + h * 0.12, w * 0.24, h * 0.55)
              .fill({ color: "#3d504c", alpha: 0.7 });
          }
        if (random() < 0.14) {
          art
            .moveTo(cx, cy)
            .lineTo(cx + cell * 0.55, cy + cell * 0.4)
            .stroke({ color: "#202f2a", width: cell * 0.16, alpha: 0.45 });
          art
            .moveTo(cx, cy)
            .lineTo(cx, cy - cell * 0.7)
            .lineTo(cx + cell * 0.8, cy - cell * 0.9)
            .stroke({ color: "#ba974c", width: cell * 0.08 });
          art
            .moveTo(cx + cell * 0.8, cy - cell * 0.9)
            .lineTo(cx + cell * 0.8, cy - cell * 0.4)
            .stroke({ color: "#353f37", width: cell * 0.025 });
        }
      }
    }
    for (const route of layout.routes) {
      for (const [factor, color] of [
        [1.4, "#554f3f"],
        [1, "#b2a17d"],
      ] as const) {
        art.moveTo(route.points[0].x, route.points[0].y);
        for (const p of route.points.slice(1)) art.lineTo(p.x, p.y);
        art.stroke({
          color,
          width: route.width * factor,
          alpha: 0.9,
          cap: "round",
          join: "round",
        });
      }
    }
    for (const bridge of layout.crossings) {
      art
        .poly(
          bridge.polygon.flatMap((p) => [p.x + cell * 0.2, p.y + cell * 0.25]),
        )
        .fill({ color: "#173b40", alpha: 0.5 });
      art
        .poly(bridge.polygon.flatMap((p) => [p.x, p.y]))
        .fill("#a6a18c")
        .stroke({ color: "#484f49", width: cell * 0.06 });
      const a = bridge.points[0],
        b = bridge.points[1];
      for (let y = a.y; y < b.y; y += cell * 0.28)
        art
          .moveTo(a.x - bridge.width / 2, y)
          .lineTo(a.x + bridge.width / 2, y)
          .stroke({ color: "#676e62", width: cell * 0.035, alpha: 0.6 });
      for (const side of [-1, 1]) {
        art
          .moveTo(a.x + side * (bridge.width / 2 - cell * 0.12), a.y)
          .lineTo(b.x + side * (bridge.width / 2 - cell * 0.12), b.y)
          .stroke({ color: "#dad0af", width: cell * 0.08 });
      }
      art
        .moveTo(a.x, a.y)
        .lineTo(b.x, b.y)
        .stroke({ color: "#d1c5a0", width: cell * 0.035, alpha: 0.6 });
    }
  }
  return layer;
}
