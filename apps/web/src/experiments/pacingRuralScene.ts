import * as T from "three";
import type { generatePacingCountryside } from "../../../../packages/game-core/src/pacingCountryside";
import { generateCountryPOI } from "../../../../packages/game-core/src/countryPOI";
import { countryPOIAssets } from "./countryPOIAssets";
import type { MiniatureKit } from "./referenceAssets";
import type { PacingCorridor } from "../../../../packages/game-core/src/pacingCorridor";

export function createPacingRuralScene(
  scene: T.Scene,
  kit: MiniatureKit,
  data: ReturnType<typeof generatePacingCountryside>,
  point: (x: number, y: number, height?: number) => T.Vector3,
  corridor: PacingCorridor = null,
) {
  const fields = data.farms.flatMap((f) => f.fields),
    geometry = new T.BufferGeometry();
  // Mipmapped grain/rows give large parcels texture without per-crop geometry.
  const pixels = new Uint8Array(128 * 128 * 4);
  let noise = 732;
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      noise = (Math.imul(noise, 1664525) + 1013904223) >>> 0;
      const v = 185 + (noise % 45) + (x % 8 < 3 ? 25 : 0);
      pixels.set([v, v, v, 255], (y * 128 + x) * 4);
    }
  const texture = new T.DataTexture(pixels, 128, 128);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(28, 28);
  texture.generateMipmaps = true;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.needsUpdate = true;
  const material = new T.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    roughness: 1,
    vertexColors: true,
    side: T.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -3,
  });
  const pose = new T.Object3D(),
    colors = [0xa69d6b, 0x92936b, 0x728163, 0x8c9778, 0x8b8067, 0x84715b];
  const positions: number[] = [],
    uv: number[] = [],
    tints: number[] = [];
  for (const f of fields) {
    const center = point(f.x, f.y, 0.14),
      unit = point(f.x + 1, f.y, 0.14).sub(center),
      scale = Math.hypot(unit.x, unit.z) || 1;
    const polygon = f.polygon ?? [
      { x: -f.width / 2, z: -f.depth / 2 },
      { x: f.width / 2, z: -f.depth / 2 },
      { x: f.width / 2, z: f.depth / 2 },
      { x: -f.width / 2, z: f.depth / 2 },
    ];
    const tint = new T.Color(colors[f.crop] ?? colors[0]);
    for (let i = 0; i < polygon.length; i++)
      for (const v of [
        { x: 0, z: 0 },
        polygon[i],
        polygon[(i + 1) % polygon.length],
      ]) {
        const p = point(f.x + v.x / scale, f.y + v.z / scale, 0.14);
        positions.push(p.x, p.y, p.z);
        uv.push(v.x / Math.max(1, f.width), v.z / Math.max(1, f.depth));
        tints.push(tint.r, tint.g, tint.b);
      }
  }
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geometry.setAttribute("color", new T.Float32BufferAttribute(tints, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const mesh = new T.Mesh(geometry, material);
  scene.add(mesh);
  const roadGeometry = new T.BoxGeometry(1, 1, 1),
    roadMaterial = new T.MeshStandardMaterial({
      color: 0x85775a,
      roughness: 1,
    }),
    roads = new T.Group(),
    treeMatrices: T.Matrix4[] = [];
  scene.add(roads);
  const guideGeometry = new T.BufferGeometry().setFromPoints(
      corridor?.path.map((p) => point(p.x, p.y, 0.3)) ?? [],
    ),
    guideMaterial = new T.LineBasicMaterial({
      color: 0xf4d57d,
      depthTest: false,
      transparent: true,
      opacity: 0.8,
    }),
    guide = new T.Line(guideGeometry, guideMaterial);
  guide.renderOrder = 5;
  scene.add(guide);
  if (corridor) {
    const points = corridor.path.map((p) => point(p.x, p.y));
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        length = a.distanceTo(b);
      if (length < 0.001) continue;
      const road = new T.Mesh(roadGeometry, roadMaterial);
      road.position.copy(a).add(b).multiplyScalar(0.5);
      road.position.y = 0.105;
      road.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      road.scale.set(corridor.width, 0.05, length + corridor.width);
      roads.add(road);
      const normal = new T.Vector3(-(b.z - a.z), 0, b.x - a.x).normalize();
      for (
        let d = 100;
        d < length - 100 && treeMatrices.length < 600;
        d += 110
      ) {
        const p = a
          .clone()
          .lerp(b, d / length)
          .addScaledVector(normal, (treeMatrices.length % 2 ? 1 : -1) * 9);
        if (
          data.pois.some(
            (site) => point(site.x, site.y).distanceTo(p) < site.extent + 20,
          )
        )
          continue;
        pose.position.copy(p);
        pose.position.y = 0.12;
        pose.scale.setScalar(1);
        pose.rotation.set(0, 0, 0);
        pose.updateMatrix();
        treeMatrices.push(pose.matrix.clone());
      }
    }
  }
  for (const part of kit.variants.get("tree") ?? []) {
    if (part.snow || !treeMatrices.length) continue;
    const trees = new T.InstancedMesh(
      part.geometry,
      part.material,
      treeMatrices.length,
    );
    treeMatrices.forEach((m, i) => trees.setMatrixAt(i, m));
    roads.add(trees);
  }
  const resident = new Map<string, ReturnType<typeof countryPOIAssets>>();
  let last = -Infinity;
  return {
    update(camera: T.Camera, target: T.Vector3, time: number) {
      guide.visible = !!corridor && camera.position.distanceTo(target) > 1500;
      if (time - last < 250) return;
      last = time;
      const wanted =
        camera.position.distanceTo(target) < 1800
          ? data.pois
              .map((p) => ({ p, d: point(p.x, p.y).distanceTo(target) }))
              .filter((p) => p.d < 1800)
              .sort((a, b) => a.d - b.d)
              .slice(0, 6)
              .map((p) => p.p)
          : [];
      for (const [id, asset] of resident)
        if (!wanted.some((p) => p.id === id)) {
          asset.dispose();
          resident.delete(id);
        }
      for (const p of wanted)
        if (!resident.has(p.id)) {
          const asset = countryPOIAssets(
            generateCountryPOI(p.kind, p.seed),
            kit,
            false,
          );
          asset.group.position.copy(point(p.x, p.y, 0.12));
          scene.add(asset.group);
          resident.set(p.id, asset);
        }
    },
    dispose() {
      resident.forEach((p) => p.dispose());
      scene.remove(mesh, roads, guide);
      guideGeometry.dispose();
      guideMaterial.dispose();
      roads.traverse((o) => {
        if (o instanceof T.InstancedMesh) o.dispose();
      });
      roadGeometry.dispose();
      roadMaterial.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
