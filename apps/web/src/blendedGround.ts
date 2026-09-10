import { Texture } from "pixi.js";
const caches = {
  1024: new WeakMap<Texture, Texture>(),
  2048: new WeakMap<Texture, Texture>(),
};
/** Bake an irregular periodic material once; no per-frame blending or mirrored kaleidoscope. */
export function blendedGround(
  source: Texture,
  size: 1024 | 2048 = 1024,
): Texture {
  const cache = caches[size];
  const old = cache.get(source);
  if (old) return old;
  const stampSize = size / 4,
    step = size / 8;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // An average-color base prevents transparent pinholes between feathered stamps.
  const average = document.createElement("canvas");
  average.width = average.height = 1;
  const ac = average.getContext("2d")!;
  ac.drawImage(source.source.resource as CanvasImageSource, 0, 0, 1, 1);
  const [r, g, b] = ac.getImageData(0, 0, 1, 1).data;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);
  const stamp = document.createElement("canvas");
  stamp.width = stamp.height = stampSize;
  const sc = stamp.getContext("2d")!;
  let seed = 918273;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Shuffled placement order avoids directional bands from alpha compositing rows.
  const cells = Array.from({ length: 64 }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (const i of cells) {
    sc.clearRect(0, 0, stampSize, stampSize);
    sc.save();
    sc.translate(stampSize / 2, stampSize / 2);
    sc.rotate((Math.floor(random() * 4) * Math.PI) / 2);
    const crop = source.width * (0.65 + random() * 0.35),
      sx = random() * (source.width - crop),
      sy = random() * (source.height - crop);
    sc.drawImage(
      source.source.resource as CanvasImageSource,
      sx,
      sy,
      crop,
      crop,
      -stampSize / 2,
      -stampSize / 2,
      stampSize,
      stampSize,
    );
    sc.restore();
    const feather = sc.createRadialGradient(
      stampSize / 2,
      stampSize / 2,
      stampSize * 0.176,
      stampSize / 2,
      stampSize / 2,
      stampSize / 2,
    );
    feather.addColorStop(0, "#fff");
    feather.addColorStop(1, "transparent");
    sc.globalCompositeOperation = "destination-in";
    sc.fillStyle = feather;
    sc.fillRect(0, 0, stampSize, stampSize);
    sc.globalCompositeOperation = "source-over";
    const x =
        (i % 8) * step + (random() - 0.5) * (size * 0.0390625) - stampSize / 2,
      y =
        Math.floor(i / 8) * step +
        (random() - 0.5) * (size * 0.0390625) -
        stampSize / 2;
    // Wrapped stamps make the material repeat without a seam. Only draw copies
    // that can touch the canvas; the old unconditional 3x3 loop sent eight
    // fully clipped 512px images through Canvas for most cells.
    const xs = [x],
      ys = [y];
    if (x < 0) xs.push(x + size);
    if (x + stampSize > size) xs.push(x - size);
    if (y < 0) ys.push(y + size);
    if (y + stampSize > size) ys.push(y - size);
    for (const px of xs) for (const py of ys) ctx.drawImage(stamp, px, py);
  }
  const texture = Texture.from(canvas);
  texture.source.style.addressMode = "repeat";
  cache.set(source, texture);
  return texture;
}
