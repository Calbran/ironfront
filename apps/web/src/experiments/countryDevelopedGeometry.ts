import * as T from "three";
import type { CountryPOI } from "../../../../packages/game-core/src/countryPOI";
/** The same parcel surfaces serve streamed detail and the campaign's continuous urban footprint. */
export function countryDevelopedGeometry(
  sites: readonly { x: number; z: number; poi?: CountryPOI }[],
) {
  const positions: number[] = [],
    colors: number[] = [];
  for (const site of sites)
    for (const block of site.poi?.developed ?? []) {
      const color = new T.Color(
        block.kind === "urban"
          ? 0x87877e
          : block.kind === "yard"
            ? 0x817b6c
            : 0x969778,
      );
      for (let i = 1; i < block.polygon.length - 1; i++)
        for (const p of [
          block.polygon[0],
          block.polygon[i + 1],
          block.polygon[i],
        ]) {
          positions.push(site.x + p.x, 0.014, site.z + p.z);
          colors.push(color.r, color.g, color.b);
        }
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
