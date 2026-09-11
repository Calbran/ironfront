import * as T from "three";
import type { TerrainSurface } from "../../../../packages/game-core/src/connectedTerrain";
import { refinedGrain, refineSurface } from "./refinedSurface";

/** Shared lattice edges and normals keep independently culled tiles seamless. */
export function createConnectedTerrainScene(
  scene: T.Scene,
  surface: TerrainSurface,
  point: (x: number, y: number, h?: number) => T.Vector3,
) {
  const root = new T.Group();
  root.name = "connected-country-terrain";
  scene.add(root);
  const grain = refinedGrain(),
    material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  refineSurface(material, grain);
  const geometry: T.BufferGeometry[] = [],
    { cols, rows, step, scale, heights, land } = surface;
  const chunkSize = 64,
    spacing = step * scale;
  const grasses = [0x8c9566, 0x8c9566, 0x526e4b, 0x78845d, 0x78845d].map(
    (c) => new T.Color(c),
  );
  const rock = new T.Color(0x727a78),
    scree = new T.Color(0x989b8e),
    snow = new T.Color(0xd3d6cb);
  const normal = new T.Vector3(),
    color = new T.Color();
  for (let cy = 0; cy < rows - 1; cy += chunkSize)
    for (let cx = 0; cx < cols - 1; cx += chunkSize) {
      const nx = Math.min(chunkSize, cols - 1 - cx),
        ny = Math.min(chunkSize, rows - 1 - cy);
      const indices: number[] = [],
        positions: number[] = [],
        normals: number[] = [],
        colors: number[] = [];
      for (let y = 0; y <= ny; y++)
        for (let x = 0; x <= nx; x++) {
          const gx = cx + x,
            gy = cy + y,
            i = gy * cols + gx,
            h = heights[i];
          positions.push(x * spacing, h, y * spacing);
          const dx =
            (heights[gy * cols + Math.min(cols - 1, gx + 1)] -
              heights[gy * cols + Math.max(0, gx - 1)]) /
            (2 * spacing);
          const dz =
            (heights[Math.min(rows - 1, gy + 1) * cols + gx] -
              heights[Math.max(0, gy - 1) * cols + gx]) /
            (2 * spacing);
          normal.set(-dx, 1, -dz).normalize();
          normals.push(normal.x, normal.y, normal.z);
          const altitude = h / Math.max(1, surface.peak),
            steepness = 1 - normal.y;
          color.copy(grasses[surface.biomes[i]] ?? grasses[0]);
          color.lerp(
            rock,
            Math.min(1, Math.max(altitude * 1.4 - 0.2, steepness * 4)),
          );
          color.lerp(scree, Math.max(0, (altitude - 0.4) * 0.6));
          color.lerp(
            snow,
            Math.min(1, Math.max(0, (altitude - 0.73) / 0.22)) *
              Math.max(0, 1 - steepness * 2),
          );
          // Darken concave gullies subtly; landforms remain readable at country distance.
          const adjacent =
            (heights[gy * cols + Math.min(cols - 1, gx + 1)] +
              heights[gy * cols + Math.max(0, gx - 1)] +
              heights[Math.min(rows - 1, gy + 1) * cols + gx] +
              heights[Math.max(0, gy - 1) * cols + gx]) /
            4;
          color.multiplyScalar(
            1 - Math.min(0.16, Math.max(0, adjacent - h) / spacing),
          );
          colors.push(color.r, color.g, color.b);
        }
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
          const i = (cy + y) * cols + cx + x,
            a = y * (nx + 1) + x,
            b = a + 1,
            c = a + nx + 1,
            d = c + 1;
          if (
            !land[i] ||
            !land[i + 1] ||
            !land[i + cols] ||
            !land[i + cols + 1]
          )
            continue;
          if (
            heights[i] +
              heights[i + 1] +
              heights[i + cols] +
              heights[i + cols + 1] <
            0.001
          )
            continue;
          indices.push(a, c, b, b, c, d);
        }
      if (!indices.length) continue;
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
      g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
      g.setIndex(indices);
      g.computeBoundingSphere();
      geometry.push(g);
      const mesh = new T.Mesh(g, material);
      mesh.position.copy(point(cx * step, cy * step, 0.015));
      root.add(mesh);
    }
  return {
    chunks: geometry.length,
    dispose() {
      root.removeFromParent();
      geometry.forEach((g) => g.dispose());
      material.dispose();
      grain.dispose();
    },
  };
}
