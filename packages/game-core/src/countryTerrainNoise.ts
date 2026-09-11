/** Non-repeating seeded value noise for broad terrain forms and surface colors. */
export function countryTerrainNoise(x: number, z: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    sx = x - ix,
    sz = z - iz;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const hash = (a: number, b: number) => {
    let h = (Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ 19471) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return (((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1;
  };
  const tx = smooth(sx),
    tz = smooth(sz),
    a = hash(ix, iz) * (1 - tx) + hash(ix + 1, iz) * tx,
    b = hash(ix, iz + 1) * (1 - tx) + hash(ix + 1, iz + 1) * tx;
  return a * (1 - tz) + b * tz;
}
