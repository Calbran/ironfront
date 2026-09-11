import { Container, Rectangle, Sprite, Texture } from "pixi.js";
import type { ScenerySprite } from "../../../packages/game-core/src/biomeScenery";

/** Trim each sprite, allowing small atlas cell misalignment without cutting branches. */
export function atlasFrames(
  atlas: Texture,
  columns: number,
  rows: number,
): Texture[] {
  const canvas = document.createElement("canvas");
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(atlas.source.resource as CanvasImageSource, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const out: Texture[] = [];
  for (let row = 0; row < rows; row++) {
    const top = Math.round((row * canvas.height) / rows),
      bottom = Math.round(((row + 1) * canvas.height) / rows);
    const counts = Array.from({ length: canvas.width }, (_, x) => {
      let n = 0;
      for (let y = top; y < bottom; y++)
        if (pixels[(y * canvas.width + x) * 4 + 3] > 24) n++;
      return n;
    });
    const cuts = [0];
    for (let col = 1; col < columns; col++) {
      const ideal = (canvas.width * col) / columns;
      let cut = Math.round(ideal),
        score = Infinity;
      for (
        let x = Math.floor(ideal - canvas.width * 0.045);
        x <= ideal + canvas.width * 0.045;
        x++
      ) {
        const candidate = counts[x] * canvas.width + Math.abs(x - ideal);
        if (candidate < score) {
          score = candidate;
          cut = x;
        }
      }
      cuts.push(cut);
    }
    cuts.push(canvas.width);
    for (let col = 0; col < columns; col++) {
      let left = cuts[col + 1],
        right = cuts[col],
        low = bottom,
        high = top;
      for (let y = top; y < bottom; y++)
        for (let x = cuts[col]; x < cuts[col + 1]; x++)
          if (pixels[(y * canvas.width + x) * 4 + 3] > 24) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            low = Math.min(low, y);
            high = Math.max(high, y);
          }
      out.push(
        new Texture({
          source: atlas.source,
          frame: new Rectangle(left, low, right - left + 1, high - low + 1),
        }),
      );
    }
  }
  return out;
}
export const sceneryFrames = (atlas: Texture) => atlasFrames(atlas, 4, 2);
export function biomeSceneryLayer(
  points: readonly ScenerySprite[],
  atlas: Texture,
  chunkSize: number,
) {
  const layer = new Container();
  layer.eventMode = "none";
  layer.interactiveChildren = false;
  const textures = sceneryFrames(atlas),
    chunks = new Map<string, { container: Container; x: number; y: number }>();
  for (const p of points) {
    const cx = Math.floor(p.x / chunkSize) * chunkSize,
      cy = Math.floor(p.y / chunkSize) * chunkSize,
      key = `${cx}:${cy}`;
    let chunk = chunks.get(key);
    if (!chunk) {
      chunk = { container: new Container(), x: cx, y: cy };
      chunks.set(key, chunk);
      layer.addChild(chunk.container);
    }
    const sprite = new Sprite(textures[p.variant]);
    sprite.anchor.set(0.5);
    sprite.position.set(p.x, p.y);
    sprite.scale.set(
      p.width / Math.max(sprite.texture.width, sprite.texture.height),
    );
    chunk.container.addChild(sprite);
  }
  return {
    layer,
    count: points.length,
    update(left: number, top: number, right: number, bottom: number) {
      for (const c of chunks.values())
        c.container.visible =
          c.x + chunkSize * 1.3 > left &&
          c.y + chunkSize * 1.3 > top &&
          c.x - chunkSize * 0.3 < right &&
          c.y - chunkSize * 0.3 < bottom;
    },
    destroy() {
      layer.destroy({ children: true });
      for (const texture of textures) texture.destroy(false);
    },
  };
}
