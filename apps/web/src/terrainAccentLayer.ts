import { signedArea } from "../../../packages/game-core/src/geography";
import type { MapGeometry } from "./mapGeometry";
import { uniqueRoadSegments } from "../../../packages/game-core/src/roadNetwork";
import { visualScale } from "../../../packages/game-core/src/visualScale";
import type { CityRoad } from "../../../packages/game-core/src/cityRoads";
import {
  Container,
  Graphics,
  Sprite,
  Texture,
  FillPattern,
  Matrix,
  Rectangle,
} from "pixi.js";
import { sceneryFrames } from "./biomeSceneryLayer";
import type { generateTerrainAccents } from "../../../packages/game-core/src/terrainAccents";
export function terrainAccentLayer(
  layout: ReturnType<typeof generateTerrainAccents>,
  atlas: Texture,
  cell: number,
  roads: readonly CityRoad[] = [],
  treeAtlas?: Texture,
  farmlandAtlas?: Texture,
  geometry?: MapGeometry,
) {
  const sizes = visualScale({ geography: { cellSize: cell } });
  const layer = new Container();
  layer.eventMode = "none";
  layer.interactiveChildren = false;
  const farmland = new Graphics();
  layer.addChild(farmland);
  if (geometry) {
    const mask = new Graphics();
    const agriculturalRegions = new Set(
      layout.fields.map((field) => field.region),
    );
    for (const [region, rings] of geometry.rings.entries()) {
      if (!agriculturalRegions.has(region)) continue;
      for (const ring of rings) {
        mask.poly(ring.flat());
        if (signedArea(ring) > 0) mask.fill(0xffffff);
        else mask.cut();
      }
    }
    layer.addChild(mask);
    farmland.mask = mask;
  }
  const fieldTextures = farmlandAtlas
    ? Array.from(
        { length: 4 },
        (_, i) =>
          new Texture({
            source: farmlandAtlas.source,
            frame: new Rectangle(
              ((i % 2) * farmlandAtlas.width) / 2,
              (Math.floor(i / 2) * farmlandAtlas.height) / 2,
              farmlandAtlas.width / 2,
              farmlandAtlas.height / 2,
            ),
          }),
      )
    : [];
  for (const field of layout.fields) {
    const [a, b, c, d] = field.points;
    const variant =
      field.kind === "plowed"
        ? 2
        : field.kind === "pasture"
          ? 3
          : Math.abs(Math.round(a.x + a.y)) % 2;
    const texture = fieldTextures[variant];
    const pattern = texture
      ? new FillPattern({ texture, textureSpace: "global" })
      : undefined;
    if (pattern)
      pattern.setTransform(
        new Matrix()
          .scale((cell * 7) / texture.width, (cell * 7) / texture.height)
          .rotate(Math.atan2(b.y - a.y, b.x - a.x))
          .translate(a.x, a.y),
      );
    const fragments = geometry
      ? (field.displayFragments ?? field.fragments ?? [field.points])
      : (field.fragments ?? [field.points]);
    for (const fragment of fragments)
      farmland.poly(fragment.flatMap((p) => [p.x, p.y])).fill(
        pattern
          ? { fill: pattern, alpha: 0.78 }
          : {
              color:
                field.kind === "plowed"
                  ? "#867358"
                  : field.kind === "crop"
                    ? "#b3a56d"
                    : "#788a55",
              alpha: 0.42,
            },
      );
    if (!field.fragments)
      farmland
        .poly(field.points.flatMap((p) => [p.x, p.y]))
        .stroke({ color: "#485c36", width: cell * 0.12, alpha: 0.8 });
    if (!field.fragments && !pattern && field.kind !== "pasture") {
      const count = Math.ceil(Math.hypot(d.x - a.x, d.y - a.y) / (cell * 0.26));
      for (let i = 1; i < count; i++) {
        const t = i / count;
        farmland
          .moveTo(a.x + (d.x - a.x) * t, a.y + (d.y - a.y) * t)
          .lineTo(b.x + (c.x - b.x) * t, b.y + (c.y - b.y) * t)
          .stroke({
            color: field.kind === "plowed" ? "#5d5140" : "#757a48",
            width: cell * 0.035,
            alpha: 0.48,
          });
      }
    }
  }
  for (const lane of layout.farmLanes) {
    farmland
      .moveTo(lane[0].x, lane[0].y)
      .lineTo(lane[1].x, lane[1].y)
      .stroke({ color: "#596544", width: cell * 0.32, alpha: 0.7 });
    farmland
      .moveTo(lane[0].x, lane[0].y)
      .lineTo(lane[1].x, lane[1].y)
      .stroke({ color: "#aa9b77", width: cell * 0.13, alpha: 0.85 });
  }
  const roadInk = new Graphics(),
    mainRoadInk = new Graphics();
  layer.addChild(roadInk, mainRoadInk);
  const physicalRoads = uniqueRoadSegments(roads);
  // Draw every shoulder before the road surfaces so junctions have no dark seams.
  for (const [width, color, alpha] of [
    [2.1, "#514d3e", 0.48],
    [1, "#b5a58a", 0.85],
  ] as const) {
    for (const kind of ["local", "main"] as const) {
      const ink = kind === "main" ? mainRoadInk : roadInk,
        scale = kind === "main" ? 1.6 : 1;
      for (const road of physicalRoads.filter((r) => r.kind === kind)) {
        ink.moveTo(road.points[0].x, road.points[0].y);
        for (const p of road.points.slice(1)) ink.lineTo(p.x, p.y);
      }
      ink.stroke({
        width: sizes.road * width * scale,
        color,
        alpha,
        cap: "round",
        join: "round",
      });
    }
  }
  const junctions = new Map<
    string,
    { x: number; y: number; degree: number; main: boolean }
  >();
  for (const road of physicalRoads)
    for (const p of road.points) {
      const key = `${p.x.toFixed(5)},${p.y.toFixed(5)}`,
        node = junctions.get(key) ?? { x: p.x, y: p.y, degree: 0, main: false };
      node.degree++;
      node.main ||= road.kind === "main";
      junctions.set(key, node);
    }
  for (const node of junctions.values())
    if (node.degree >= 3) {
      const ink = node.main ? mainRoadInk : roadInk;
      ink
        .circle(node.x, node.y, sizes.road * (node.main ? 1.6 : 1) * 0.58)
        .fill({ color: "#b5a58a", alpha: 1 });
    }
  const seenBridges = new Set<string>();
  for (const road of roads) {
    const ink = road.kind === "main" ? mainRoadInk : roadInk;
    const scale = road.kind === "main" ? 1.6 : 1;
    for (const bridge of road.bridges) {
      const id = `${Math.round(bridge.x)},${Math.round(bridge.y)}`;
      if (seenBridges.has(id)) continue;
      seenBridges.add(id);
      const dx = Math.cos(bridge.angle),
        dy = Math.sin(bridge.angle);
      const half = cell * 0.8,
        side = sizes.road * scale;
      ink
        .moveTo(bridge.x - dx * half, bridge.y - dy * half)
        .lineTo(bridge.x + dx * half, bridge.y + dy * half)
        .stroke({ color: "#bdb5a1", width: side * 2.2 });
      for (const sign of [-1, 1])
        ink
          .moveTo(
            bridge.x - dx * half - dy * side * sign,
            bridge.y - dy * half + dx * side * sign,
          )
          .lineTo(
            bridge.x + dx * half - dy * side * sign,
            bridge.y + dy * half + dx * side * sign,
          )
          .stroke({ color: "#534f43", width: sizes.road * 0.28 });
    }
  }
  const treeTextures = treeAtlas ? sceneryFrames(treeAtlas) : undefined;
  const textures = sceneryFrames(atlas),
    chunkSize = cell * 32;
  const chunks = new Map<
    string,
    { container: Container; x: number; y: number; zoom: number }
  >();
  function chunk(x: number, y: number, zoom: number) {
    const cx = Math.floor(x / chunkSize) * chunkSize,
      cy = Math.floor(y / chunkSize) * chunkSize,
      key = `${cx}:${cy}:${zoom}`;
    let c = chunks.get(key);
    if (!c) {
      c = { container: new Container(), x: cx, y: cy, zoom };
      chunks.set(key, c);
      layer.addChild(c.container);
    }
    return c.container;
  }
  for (const p of layout.sprites) {
    const sprite = new Sprite(
      (p.atlas === "trees" && treeTextures ? treeTextures : textures)[
        p.variant
      ],
    );
    sprite.anchor.set(0.5);
    sprite.position.set(p.x, p.y);
    sprite.scale.set(
      p.width / Math.max(sprite.texture.width, sprite.texture.height),
    );
    sprite.alpha = p.alpha;
    chunk(p.x, p.y, p.minZoom).addChild(sprite);
  }
  for (const line of layout.lines) {
    const g = new Graphics(),
      points = line.points;
    if (line.kind === "field") {
      const a = points[0],
        b = points[1],
        len = Math.hypot(b.x - a.x, b.y - a.y),
        count = Math.ceil(len / (cell * 0.6));
      g.moveTo(a.x, a.y)
        .lineTo(b.x, b.y)
        .stroke({ color: "#615c41", width: cell * 0.025, alpha: 0.7 });
      for (let i = 0; i <= count; i++) {
        const t = i / count,
          x = a.x + (b.x - a.x) * t,
          y = a.y + (b.y - a.y) * t;
        g.moveTo(x, y)
          .lineTo(x, y - cell * 0.23)
          .stroke({ color: "#7f7252", width: cell * 0.085, alpha: 0.8 });
      }
    } else {
      const poleHeight = sizes.pole,
        utilityCell = cell * 0.8;
      // Dusty verge beneath the line gives poles a visible connection to the road.
      g.moveTo(points[0].x, points[0].y);
      for (const p of points.slice(1)) g.lineTo(p.x, p.y);
      g.stroke({ color: "#b6a283", width: utilityCell * 0.2, alpha: 0.35 });
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i];
        for (const offset of [-utilityCell * 0.07, utilityCell * 0.07])
          g.moveTo(a.x + offset, a.y - poleHeight)
            .quadraticCurveTo(
              (a.x + b.x) / 2 + offset,
              (a.y + b.y) / 2 - poleHeight * 0.45,
              b.x + offset,
              b.y - poleHeight,
            )
            .stroke({
              color: "#343d37",
              width: utilityCell * 0.04,
              alpha: 0.8,
            });
      }
      for (const p of points) {
        g.moveTo(p.x, p.y)
          .lineTo(p.x + utilityCell * 0.5, p.y + utilityCell * 0.25)
          .stroke({ color: "#26342b", width: utilityCell * 0.12, alpha: 0.15 });
        g.moveTo(p.x, p.y)
          .lineTo(p.x, p.y - poleHeight)
          .stroke({ color: "#67513a", width: utilityCell * 0.055 });
        g.moveTo(p.x - utilityCell * 0.12, p.y - poleHeight)
          .lineTo(p.x + utilityCell * 0.12, p.y - poleHeight)
          .stroke({ color: "#7f6e4d", width: utilityCell * 0.045 });
        for (const side of [-1, 1])
          g.circle(
            p.x + side * utilityCell * 0.07,
            p.y - poleHeight - utilityCell * 0.04,
            utilityCell * 0.025,
          ).fill("#b5bdac");
      }
    }
    chunk(points[0].x, points[0].y, line.minZoom).addChild(g);
  }
  return {
    layer,
    count: layout.sprites.length,
    lineCount: layout.lines.length,
    update(
      left: number,
      top: number,
      right: number,
      bottom: number,
      zoom: number,
    ) {
      roadInk.visible = zoom >= 1.8;
      mainRoadInk.visible = zoom >= 0.8;
      farmland.visible = zoom >= 0.8;
      for (const c of chunks.values())
        c.container.visible =
          zoom >= c.zoom &&
          c.x + chunkSize * 2 > left &&
          c.x - chunkSize < right &&
          c.y + chunkSize * 2 > top &&
          c.y - chunkSize < bottom;
    },
    destroy() {
      layer.destroy({ children: true });
      for (const t of textures) t.destroy(false);
      for (const t of treeTextures ?? []) t.destroy(false);
    },
  };
}
