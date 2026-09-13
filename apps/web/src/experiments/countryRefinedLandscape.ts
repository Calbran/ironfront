import * as T from "three";
import { countryTerrainNoise } from "../../../../packages/game-core/src/countryTerrainNoise";
import type { SlicePlan } from "../../../../packages/game-core/src/countrySlice";
import { terrainHeight } from "../../../../packages/game-core/src/connectedTerrain";
import type { MiniatureKit } from "./referenceAssets";

type P = { x: number; z: number };
import {
  countryLandscapeSamples,
  type LandscapePlan,
} from "../../../../packages/game-core/src/countryLandscape";
export {
  countryLandscapeSamples,
  countryMeadowNoise,
} from "../../../../packages/game-core/src/countryLandscape";

export function countryRefinedLandscape(
  scene: T.Scene,
  plan: LandscapePlan,
  kit: MiniatureKit,
  supplied?: ReturnType<typeof countryLandscapeSamples>,
) {
  const samples = supplied ?? countryLandscapeSamples(plan),
    root = new T.Group();
  scene.add(root);
  const pose = new T.Object3D(),
    ownedGeometry: T.BufferGeometry[] = [],
    ownedMaterial: T.Material[] = [],
    meshes: T.InstancedMesh[] = [];
  const groups: {
    group: T.Group;
    center: T.Vector3;
    tier: "fine" | "tree" | "far";
  }[] = [];
  const rock = new T.IcosahedronGeometry(1, 0),
    shrub = new T.IcosahedronGeometry(1, 1),
    grass = new T.BufferGeometry();
  // Five short angled blades form one miniature tuft, instead of a lone cone.
  const blades: number[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.399,
      x = Math.cos(angle) * 0.16,
      z = Math.sin(angle) * 0.16;
    const dx = Math.cos(angle) * 0.055,
      dz = Math.sin(angle) * 0.055;
    blades.push(
      x - dx,
      0,
      z - dz,
      x + dx,
      0,
      z + dz,
      x + 0.07 * Math.sin(angle),
      0.24 + (i % 3) * 0.07,
      z + 0.05,
    );
  }
  grass.setAttribute("position", new T.Float32BufferAttribute(blades, 3));
  grass.computeVertexNormals();
  ownedGeometry.push(rock, shrub, grass);
  const mat = (color: number) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 1 });
    ownedMaterial.push(m);
    return m;
  };
  const rockMat = mat(0x929383),
    shrubMat = mat(0x78884a),
    grassMat = mat(0x81905b);
  grassMat.side = T.DoubleSide;
  function batch(
    points: P[],
    geometry: T.BufferGeometry,
    material: T.Material,
    scale: number,
    lift: number,
    fine: boolean,
    far = false,
  ) {
    const tiles = new Map<string, P[]>();
    for (const p of points) {
      const key = `${Math.floor(p.x / 160)}:${Math.floor(p.z / 160)}`,
        list = tiles.get(key) ?? [];
      list.push(p);
      tiles.set(key, list);
    }
    for (const [key, ps] of tiles) {
      const [x, z] = key.split(":").map(Number),
        group = new T.Group(),
        mesh = new T.InstancedMesh(geometry, material, ps.length);
      ps.forEach((p, i) => {
        const variation = 0.85 + ((i * 17) % 11) * 0.03,
          size = scale * variation;
        pose.position.set(
          p.x,
          terrainHeight(plan.surface, p.x, p.z) + lift * size,
          p.z,
        );
        pose.rotation.set(0, i * 2.399, 0);
        pose.scale.setScalar(size);
        pose.updateMatrix();
        mesh.setMatrixAt(i, pose.matrix);
        mesh.setColorAt(i, new T.Color().setScalar(0.86 + (i % 7) * 0.025));
      });
      mesh.computeBoundingSphere();
      mesh.castShadow = !fine;
      mesh.receiveShadow = true;
      mesh.userData.shared = true;
      group.add(mesh);
      root.add(group);
      meshes.push(mesh);
      groups.push({
        group,
        center: new T.Vector3(x * 160 + 80, 0, z * 160 + 80),
        tier: far ? "far" : fine ? "fine" : "tree",
      });
    }
  }
  for (const [variant, points] of [
    ["tree", samples.trees.filter((_, i) => i % 3 !== 0)],
    ["pine", samples.trees.filter((_, i) => i % 3 === 0)],
  ] as const)
    for (const part of kit.distantVariants.get(variant) ?? [])
      if (!part.snow) {
        batch(points, part.geometry, part.material, 0.49, 0, false);
      }
  // One canopy per occupied patch replaces individual trees at overview distance.
  const canopyCells = new Map<
    string,
    { x: number; z: number; count: number }
  >();
  for (const p of samples.trees) {
    const key = `${Math.floor(p.x / 12)}:${Math.floor(p.z / 12)}`,
      cell = canopyCells.get(key) ?? { x: 0, z: 0, count: 0 };
    cell.x += p.x;
    cell.z += p.z;
    cell.count++;
    canopyCells.set(key, cell);
  }
  const canopies = [...canopyCells.values()].map((c) => ({
    x: c.x / c.count,
    z: c.z / c.count,
  }));
  const canopyGeometry = new T.IcosahedronGeometry(1, 0)
    .scale(6.5, 1.25, 6.5)
    .translate(0, 2.5, 0);
  ownedGeometry.push(canopyGeometry);
  batch(canopies, canopyGeometry, mat(0x53683c), 1, 0, false, true);
  batch(samples.shrubs, shrub, shrubMat, 0.55, 0.35, true);
  batch(samples.rocks, rock, rockMat, 0.45, 0.32, true);
  batch(samples.grass, grass, grassMat, 1, 0, true);
  const bankRocks: P[] = [],
    reeds: P[] = [],
    pads: P[] = [];
  for (const river of plan.rivers)
    for (let i = 1; i < river.length; i++) {
      const a = river[i - 1],
        b = river[i],
        length = Math.hypot(b.x - a.x, b.z - a.z),
        nx = -(b.z - a.z) / length,
        nz = (b.x - a.x) / length;
      for (let d = 4; d < length; d += 9) {
        const x = a.x + ((b.x - a.x) * d) / length,
          z = a.z + ((b.z - a.z) * d) / length;
        if (
          x < 12 ||
          z < 12 ||
          x > plan.width - 12 ||
          z > plan.depth - 12 ||
          plan.roads.bridges.some(
            (b) => Math.hypot(x - b.x, z - b.y) < b.length / 2 + 15,
          )
        )
          continue;
        const side = Math.sin(d * 7 + i) > 0 ? 1 : -1;
        bankRocks.push({ x: x + nx * side * 9, z: z + nz * side * 9 });
        for (let j = 0; j < 4; j++)
          reeds.push({
            x: x + nx * side * (7 + j * 0.35),
            z: z + nz * side * (7 + j * 0.35) + j * 0.25,
          });
        if (Math.sin(x * 0.3 + z * 0.4) > 0.25)
          pads.push({ x: x + nx * side * 4, z: z + nz * side * 4 });
      }
    }
  batch(bankRocks, rock, rockMat, 0.24, 0.3, true);
  batch(reeds, grass, grassMat, 1.6, 0, true);
  const lilyGeometry = new T.CircleGeometry(0.22, 7).rotateX(-Math.PI / 2),
    lilyMaterial = mat(0x597951);
  ownedGeometry.push(lilyGeometry);
  const lilies = new T.InstancedMesh(lilyGeometry, lilyMaterial, pads.length);
  pads.forEach((p, i) => {
    pose.position.set(p.x, 0.06, p.z);
    pose.rotation.set(0, i * 2.399, 0);
    pose.scale.setScalar(1);
    pose.updateMatrix();
    lilies.setMatrixAt(i, pose.matrix);
  });
  lilies.computeBoundingSphere();
  root.add(lilies);
  meshes.push(lilies);
  return {
    counts: Object.fromEntries(
      Object.entries(samples).map(([k, v]) => [k, v.length]),
    ),
    update(camera: T.Camera, target: T.Vector3) {
      const distance = camera.position.distanceTo(target);
      lilies.visible = distance < 450;
      for (const entry of groups) {
        const tileDistance = Math.hypot(
          entry.center.x - target.x,
          entry.center.z - target.z,
        );
        const detailed =
          distance < 650 && tileDistance < Math.max(220, distance * 0.8 + 100);
        entry.group.visible =
          entry.tier === "far"
            ? !detailed
            : entry.tier === "tree"
              ? detailed
              : distance < 450 && tileDistance < 380;
      }
    },
    dispose() {
      root.removeFromParent();
      meshes.forEach((m) => m.dispose());
      ownedGeometry.forEach((g) => g.dispose());
      ownedMaterial.forEach((m) => m.dispose());
    },
  };
}
