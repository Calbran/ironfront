import atlas from "./data/earth-relief.json" with { type: "json" };

export function seededRandom(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(x: number, y: number, salt: number) {
  let v = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ salt;
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
}
export function noise(x: number, y: number, salt: number): number {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let tx = x - ix,
    ty = y - iy;
  tx = tx * tx * (3 - 2 * tx);
  ty = ty * ty * (3 - 2 * ty);
  return (
    (hash(ix, iy, salt) * (1 - tx) + hash(ix + 1, iy, salt) * tx) * (1 - ty) +
    (hash(ix, iy + 1, salt) * (1 - tx) + hash(ix + 1, iy + 1, salt) * tx) * ty
  );
}
function fbm(x: number, y: number, salt: number) {
  return (
    (noise(x, y, salt) - 0.5) * 0.65 +
    (noise(x * 2, y * 2, salt + 1) - 0.5) * 0.25 +
    (noise(x * 4, y * 4, salt + 2) - 0.5) * 0.1
  );
}
type Sample = (typeof atlas.samples)[number];
function sample(
  data: number[],
  source: Sample,
  u: number,
  v: number,
  outside: number,
) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return outside;
  const x = u * (source.width - 1),
    y = v * (source.height - 1);
  const ix = Math.floor(x),
    iy = Math.floor(y),
    tx = x - ix,
    ty = y - iy;
  const at = (a: number, b: number) =>
    data[
      Math.min(source.height - 1, b) * source.width +
        Math.min(source.width - 1, a)
    ];
  return (
    (at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) +
    (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty
  );
}

/** Earth-derived fields are transformed before territories exist. No runtime network access. */
export function generateRelief(
  seed: string,
  width: number,
  height: number,
  cellSize: number,
) {
  const rng = seededRandom(seed + ":relief-v2");
  const source = atlas.samples[Math.floor(rng() * atlas.samples.length)];
  const secondary =
    atlas.samples[
      (atlas.samples.indexOf(source) +
        1 +
        Math.floor(rng() * (atlas.samples.length - 1))) %
        atlas.samples.length
    ];
  const salt = Math.floor(rng() * 0x7fffffff);
  const angle = rng() * Math.PI * 2,
    flip = rng() < 0.5 ? -1 : 1;
  const zoom = 0.88 + rng() * 0.2,
    stretch = 0.85 + rng() * 0.3;
  const shiftX = (rng() - 0.5) * 0.07,
    shiftY = (rng() - 0.5) * 0.07;
  const sea = 0.6 + rng() * 1.5;
  const cols = width / cellSize,
    rows = height / cellSize;
  const land = new Int32Array(cols * rows).fill(-1);
  const heights = new Float32Array(land.length),
    wetness = new Float32Array(land.length);
  const positive = source.elevation.filter((v) => v > 0).sort((a, b) => a - b);
  const reliefScale = Math.max(
    150,
    positive[Math.floor(positive.length * 0.9)],
  );
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const px = (x + 0.5) / cols - 0.5,
        py = (y + 0.5) / rows - 0.5;
      // Independent low-frequency coordinate warps bend real capes, channels, and ranges together.
      const wx = px + fbm(px * 4 + 5, py * 4 + 5, salt) * 0.22;
      const wy = py + fbm(px * 4 + 9, py * 4 + 3, salt + 10) * 0.22;
      const u =
        0.5 +
        (wx * Math.cos(angle) - wy * Math.sin(angle)) * zoom * stretch * flip +
        shiftX;
      const v =
        0.5 +
        ((wx * Math.sin(angle) + wy * Math.cos(angle)) * zoom) / stretch +
        shiftY;
      const coast = sample(source.coast, source, u, v, -30);
      const inset = Math.max(Math.abs(px), Math.abs(py));
      const edge = Math.max(0, (inset - 0.41) / 0.08);
      // A second real coastal field modulates erosion without stamping disconnected land over it.
      const erosion = sample(secondary.coast, secondary, 1 - v, u, -8);
      const continental =
        coast -
        sea +
        Math.max(-2, Math.min(2, erosion * 0.15)) +
        fbm(u * 14, v * 14, salt + 20) * 5 -
        edge * edge * 35;
      const i = y * cols + x;
      if (continental > 0) land[i] = 1;
      const elevation = Math.max(0, sample(source.elevation, source, u, v, 0));
      const secondaryRelief = Math.max(
        0,
        sample(secondary.elevation, secondary, 1 - v, u, 0),
      );
      const ridge = 1 - Math.abs(fbm(u * 10, v * 10, salt + 40) * 2);
      heights[i] = Math.max(
        0.05,
        Math.min(
          1,
          0.1 +
            Math.pow(elevation / reliefScale, 0.72) * 0.75 +
            Math.min(0.12, secondaryRelief / 5000) * ridge +
            fbm(u * 25, v * 25, salt + 30) * 0.1,
        ),
      );
    }
  // Crownfall-style prevailing wind: sea replenishes humidity; uplift rains it out.
  const wind = Math.floor(rng() * 4);
  const horizontal = wind % 2 === 0,
    reverse = wind >= 2;
  const outer = horizontal ? rows : cols,
    inner = horizontal ? cols : rows;
  for (let line = 0; line < outer; line++) {
    let humidity = 0.85,
      previous = 0;
    for (let step = 0; step < inner; step++) {
      const at = reverse ? inner - 1 - step : step;
      const x = horizontal ? at : line,
        y = horizontal ? line : at,
        i = y * cols + x;
      if (land[i] < 0) humidity = 1;
      const rise = Math.max(0, heights[i] - previous);
      wetness[i] = Math.max(
        0.05,
        Math.min(
          1,
          humidity * 0.66 +
            rise * 1.8 +
            noise(x / 35, y / 35, salt + 50) * 0.24,
        ),
      );
      humidity = Math.max(0.12, humidity * 0.985 - rise * 0.65);
      previous = heights[i];
    }
  }
  return { land, heights, wetness, sources: [source.id, secondary.id], wind };
}
