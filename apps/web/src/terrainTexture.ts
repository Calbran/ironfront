import { terrainLayoutGraphics } from "./terrainLayoutGraphics";
import { blendedGround } from "./blendedGround";
import { FillPattern, Graphics, Matrix, type Texture } from "pixi.js";
import type { World } from "../../../packages/game-core/src/index";
import { signedArea } from "../../../packages/game-core/src/geography";
import type { MapGeometry } from "./mapGeometry";

/** Vector terrain shares the exact mesh used for borders and interaction. */
export type BiomeTextures = Partial<
  Record<World["regions"][number]["terrain"] | "river", Texture>
>;

/** Bake one large material per animation frame so initial texture preparation
 * never monopolizes the browser main thread in one multi-second task. */
export async function prepareTerrainTextures(textures: BiomeTextures) {
  const durations: Record<string, number> = {},
    baked: Texture[] = [];
  for (const [name, source] of Object.entries(textures)) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const started = performance.now();
    baked.push(blendedGround(source, name === "river" ? 1024 : 2048));
    durations[name] = performance.now() - started;
  }
  return { baked, durations };
}

export function terrainGraphics(
  world: World,
  geometry: MapGeometry,
  textures: BiomeTextures = {},
) {
  const terrain = new Graphics();
  const colors = {
    plains: "#c1c293",
    forest: "#718966",
    highlands: "#bcb8a6",
    mountains: "#88877e",
  };
  const patterns = new Map<string, FillPattern>();
  const finePatterns = new Map<string, FillPattern>();
  for (const [name, source] of Object.entries(textures)) {
    const texture = blendedGround(source, name === "river" ? 1024 : 2048);
    const pattern = new FillPattern({ texture, textureSpace: "global" });
    pattern.setTransform(
      new Matrix().scale(
        (name === "river" ? 192 : (world.geography?.cellSize ?? 8) * 96) /
          texture.width,
        (name === "river" ? 192 : (world.geography?.cellSize ?? 8) * 96) /
          texture.height,
      ),
    );
    patterns.set(name, pattern);
    if (name !== "river") {
      const fine = new FillPattern({ texture, textureSpace: "global" });
      const period = (world.geography?.cellSize ?? 8) * 16;
      fine.setTransform(
        new Matrix().scale(period / texture.width, period / texture.height),
      );
      finePatterns.set(name, fine);
    }
  }
  // Reuse identical geometry for both frequencies so coasts and biome edges agree.
  function groundLayer(patterns: Map<string, FillPattern>) {
    const terrain = new Graphics();
    const fill = (name: keyof typeof colors) =>
      patterns.has(name)
        ? { fill: patterns.get(name)! }
        : { color: colors[name] };
    for (const region of world.regions) {
      for (const ring of geometry.rings[region.id]) {
        terrain.poly(ring.flat());
        if (signedArea(ring) > 0) terrain.fill(fill(region.terrain));
        else terrain.cut();
      }
    }
    // Clip biome paint to the same smoothed land mesh as selection and borders.
    const biomes = new Graphics(),
      mask = new Graphics();
    for (const rings of geometry.rings)
      for (const ring of rings) {
        mask.poly(ring.flat());
        if (signedArea(ring) > 0) mask.fill(0xffffff);
        else mask.cut();
      }
    for (const patch of world.geography?.terrainPatches ?? [])
      for (const ring of patch.contours) {
        if (ring.length < 3) continue;
        const last = ring[ring.length - 1];
        biomes.moveTo((last[0] + ring[0][0]) / 2, (last[1] + ring[0][1]) / 2);
        for (let i = 0; i < ring.length; i++) {
          const p = ring[i],
            next = ring[(i + 1) % ring.length];
          biomes.quadraticCurveTo(
            p[0],
            p[1],
            (p[0] + next[0]) / 2,
            (p[1] + next[1]) / 2,
          );
        }
        biomes.closePath();
        if (signedArea(ring) > 0) biomes.fill(fill(patch.terrain));
        else biomes.cut();
      }
    terrain.addChild(biomes, mask);
    biomes.mask = mask;
    return terrain;
  }
  // Draw the coastal shelf behind land: terrain fills cover the inland half.
  // Join shared mesh edges into paths so translucent strokes have no segment seams.
  const coastalEdges = geometry.edges.filter(
    (edge) => edge.regions.length === 1,
  );
  const vertexKey = (p: number[]) => p.map((n) => n.toFixed(4)).join(",");
  const links = new Map<string, number[]>();
  coastalEdges.forEach((edge, index) => {
    for (const p of [edge.a, edge.b]) {
      const key = vertexKey(p);
      const neighbors = links.get(key) ?? [];
      neighbors.push(index);
      links.set(key, neighbors);
    }
  });
  const visited = new Set<number>();
  const coasts: number[][][] = [];
  coastalEdges.forEach((edge, index) => {
    if (visited.has(index)) return;
    const path = [edge.a, edge.b];
    visited.add(index);
    let current = edge.b;
    while (true) {
      const next = links
        .get(vertexKey(current))
        ?.find((id) => !visited.has(id));
      if (next === undefined) break;
      visited.add(next);
      const segment = coastalEdges[next];
      current =
        vertexKey(segment.a) === vertexKey(current) ? segment.b : segment.a;
      path.push(current);
    }
    coasts.push(path);
  });
  for (const ring of world.geography?.islands ?? [])
    if (ring.length) coasts.push([...ring, ring[0]]);
  const traceCoasts = (target: Graphics) => {
    for (const path of coasts) {
      target.moveTo(path[0][0], path[0][1]);
      for (const p of path.slice(1)) target.lineTo(p[0], p[1]);
      if (vertexKey(path[0]) === vertexKey(path.at(-1)!)) target.closePath();
    }
  };
  // Small overlapping steps soften the shelf into the existing ocean texture.
  for (let step = 12; step >= 1; step--) {
    traceCoasts(terrain);
    terrain.stroke({
      width: 12 + step * 4,
      color: "#589b98",
      alpha: 0.025 + (12 - step) * 0.003,
      cap: "round",
      join: "round",
    });
  }
  traceCoasts(terrain);
  terrain.stroke({ width: 10, color: "#b4ae87", alpha: 0.85, join: "round" });
  traceCoasts(terrain);
  terrain.stroke({ width: 5, color: "#d0c49a", join: "round" });
  for (const ring of world.geography?.islands ?? [])
    terrain.poly(ring.flat()).fill("#bcc5a5");
  terrain.addChild(groundLayer(patterns));
  const fineGround = groundLayer(finePatterns);
  terrain.addChild(fineGround);
  const setDetailZoom = (zoom: number) => {
    const t = Math.max(0, Math.min(1, (zoom - 3) / 5));
    fineGround.alpha = finePatterns.size ? 0.55 * t * t * (3 - 2 * t) : 0;
    fineGround.visible = fineGround.alpha > 0;
  };
  setDetailZoom(1);
  const details = new Graphics();
  terrain.addChild(details);
  for (const river of world.geography?.rivers ?? []) {
    if (river.length < 2) continue;
    for (const [width, color] of [
      [12, "#354f4f"],
      [9, "#90b7b5"],
      [6.5, "#477e89"],
    ] as const) {
      details.moveTo(...river[0]);
      for (let i = 1; i < river.length - 1; i++) {
        const p = river[i],
          n = river[i + 1];
        details.quadraticCurveTo(
          p[0],
          p[1],
          (p[0] + n[0]) / 2,
          (p[1] + n[1]) / 2,
        );
      }
      details.lineTo(...river.at(-1)!).stroke({
        width,
        ...(width === 6.5 && patterns.has("river")
          ? { fill: patterns.get("river")! }
          : { color }),
        alpha: width === 12 ? 0.55 : 1,
        cap: "round",
        join: "round",
      });
    }
  }
  traceCoasts(details);
  details.stroke({ color: "#d0c49a", width: 2, alpha: 0.8, join: "round" });
  terrain.addChild(terrainLayoutGraphics(world, geometry, patterns));
  return Object.assign(terrain, { setDetailZoom });
}
