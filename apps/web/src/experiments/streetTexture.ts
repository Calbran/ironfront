import * as T from "three";

/** Shared diorama carriageway grain; one repeat is two authored model units. */
export function createStreetTexture() {
  const pixels = new Uint8Array(128 * 128 * 4);
  for (let i = 0; i < 128 * 128; i++) {
    const grain = 72 + ((Math.imul(i + 17, 1103515245) >>> 16) % 19);
    pixels.set([grain, grain + 2, grain, 255], i * 4);
  }
  const texture = new T.DataTexture(pixels, 128, 128, T.RGBAFormat);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
