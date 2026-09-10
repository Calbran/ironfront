import { Texture } from "pixi.js";

/** One unique world-sized water surface, never a periodically repeated tile. */
export function oceanSurface(source: Texture, seedText: string): Texture {
  const size = 4096,
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#18363e";
  ctx.fillRect(0, 0, size, size);
  let seed = 2166136261;
  for (const c of seedText) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const stamp = document.createElement("canvas");
  stamp.width = stamp.height = 512;
  const sc = stamp.getContext("2d")!;
  for (let i = 0; i < 520; i++) {
    sc.clearRect(0, 0, 512, 512);
    const crop = source.width * (0.22 + random() * 0.38),
      sx = random() * (source.width - crop),
      sy = random() * (source.height - crop);
    sc.drawImage(
      source.source.resource as CanvasImageSource,
      sx,
      sy,
      crop,
      crop,
      0,
      0,
      512,
      512,
    );
    const fade = sc.createRadialGradient(256, 256, 40, 256, 256, 256);
    fade.addColorStop(0, "#fff");
    fade.addColorStop(1, "transparent");
    sc.globalCompositeOperation = "destination-in";
    sc.fillStyle = fade;
    sc.fillRect(0, 0, 512, 512);
    sc.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.translate(random() * size, random() * size);
    // Nearby directions and unequal scales avoid the old quarter-turn pinwheel shapes.
    ctx.rotate((random() - 0.5) * 0.7);
    ctx.globalAlpha = 0.12 + random() * 0.16;
    const width = 300 + random() * 500,
      height = width * (0.7 + random() * 0.5);
    ctx.drawImage(stamp, -width / 2, -height / 2, width, height);
    ctx.restore();
  }
  // The unbounded map background matches the outer fade, without wrapping the image.
  for (const [x0, y0, x1, y1] of [
    [0, 0, 260, 0],
    [size, 0, size - 260, 0],
    [0, 0, 0, 260],
    [0, size, 0, size - 260],
  ]) {
    const fade = ctx.createLinearGradient(x0, y0, x1, y1);
    fade.addColorStop(0, "#18363e");
    fade.addColorStop(1, "#18363e00");
    ctx.fillStyle = fade;
    if (x0 !== x1) ctx.fillRect(Math.min(x0, x1), 0, 260, size);
    else ctx.fillRect(0, Math.min(y0, y1), size, 260);
  }
  const texture = Texture.from(canvas);
  texture.source.style.addressMode = "clamp-to-edge";
  return texture;
}
