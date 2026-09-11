import { cityBuildingFootprint } from "../../../../packages/game-core/src/cityBuildingKit";
import { createStreetTexture } from "./streetTexture";
import { countryFieldGeometry } from "./countryFieldGeometry";
import * as T from "three";
import type { MiniatureKit } from "./referenceAssets";
import type { CountryPOI } from "../../../../packages/game-core/src/countryPOI";
/** One authoritative footprint plan drives both art and the exported cover obstacles. */
export function countryPOIAssets(
  plan: CountryPOI,
  kit: MiniatureKit,
  ground = true,
) {
  const group = new T.Group(),
    ownedGeometry = new Set<T.BufferGeometry>(),
    ownedMaterial = new Set<T.Material>();
  const boxGeometry = new T.BoxGeometry(1, 1, 1);
  ownedGeometry.add(boxGeometry);
  const pixels = new Uint8Array(64 * 64 * 4);
  let noise = plan.seed >>> 0;
  for (let i = 0; i < 64 * 64; i++) {
    noise = (Math.imul(noise, 1664525) + 1013904223) >>> 0;
    const value = 210 + (noise % 46);
    pixels.set([value, value, value, 255], i * 4);
  }
  const grain = new T.DataTexture(pixels, 64, 64, T.RGBAFormat);
  grain.wrapS = grain.wrapT = T.RepeatWrapping;
  grain.repeat.set(32, 32);
  grain.needsUpdate = true;
  const mat = (color: number) => {
    const m = new T.MeshStandardMaterial({
      color,
      roughness: 0.95,
      map: grain,
    });
    ownedMaterial.add(m);
    return m;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material,
    angle = 0,
  ) => {
    const mesh = new T.Mesh(boxGeometry, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.rotation.y = angle;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  if (ground)
    box(0, -0.13, 0, plan.extent * 2, 0.2, plan.extent * 2, mat(0x777956));
  const streetTexture = createStreetTexture();
  const developed = mat(0x979180);
  for (const building of plan.buildings) {
    const bounds = cityBuildingFootprint(building.variant);
    box(
      building.x,
      0.035,
      building.z,
      bounds.width + 1.6,
      0.05,
      bounds.depth + 2.2,
      developed,
      building.angle,
    );
  }
  const roadLayer = (
    roads: NonNullable<CountryPOI["paths"]>,
    color: number,
    y: number,
  ) => {
    if (!roads.length) return;
    const material = mat(color),
      mesh = new T.InstancedMesh(boxGeometry, material, roads.length),
      o = new T.Object3D();
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    material.polygonOffsetUnits = -4;
    if (roads === plan.roads) {
      material.map = streetTexture;
      material.color.set(0xc4c6bd);
    }
    roads.forEach((r, i) => {
      o.position.set(r.x, y, r.z);
      o.rotation.y = r.angle ?? 0;
      o.scale.set(r.width, 0.035, r.depth);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.receiveShadow = true;
    group.add(mesh);
    const circle = new T.CylinderGeometry(1, 1, 0.035, 8);
    ownedGeometry.add(circle);
    const joints = new T.InstancedMesh(circle, material, roads.length * 2);
    roads.forEach((r, i) => {
      const angle = r.angle ?? 0;
      for (let end = 0; end < 2; end++) {
        const side = end ? 1 : -1;
        o.position.set(
          r.x + ((Math.cos(angle) * r.width) / 2) * side,
          y,
          r.z - ((Math.sin(angle) * r.width) / 2) * side,
        );
        o.rotation.y = 0;
        o.scale.set(r.depth / 2, 1, r.depth / 2);
        o.updateMatrix();
        joints.setMatrixAt(i * 2 + end, o.matrix);
      }
    });
    joints.receiveShadow = true;
    group.add(joints);
  };
  roadLayer(plan.waterways ?? [], 0x3c6868, -0.005);
  roadLayer(plan.roads, 0x726b57, 0.035);
  roadLayer(plan.paths ?? [], 0x999078, 0.055);
  for (const variant of new Set([
    ...plan.buildings.map((b) => b.variant),
    ...plan.trees.map((t) => t.variant),
  ])) {
    const placements = [
      ...plan.buildings,
      ...plan.trees.map((t) => ({ ...t, angle: 0 })),
    ].filter((b) => b.variant === variant);
    for (const part of kit.variants.get(variant) ?? kit.variants.get("home")!) {
      if (part.snow) continue;
      const mesh = new T.InstancedMesh(
          part.geometry,
          part.material,
          placements.length,
        ),
        o = new T.Object3D();
      placements.forEach((p, i) => {
        o.position.set(p.x, 0, p.z);
        o.rotation.y = p.angle;
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.shared = true;
      group.add(mesh);
    }
  }
  for (const origin of plan.details ?? [{ x: 0, z: 0 }]) {
    if (plan.kind === "fuel-station") {
      const iron = mat(0x52665d),
        brass = mat(0xb39257);
      box(origin.x - 17, 3.2, origin.z - 6, 17, 0.22, 4, iron);
      box(origin.x - 17, 3.06, origin.z - 4.1, 17, 0.18, 0.2, brass);
    }
    if (plan.kind === "abandoned-warehouse" || plan.kind === "ruined-manor") {
      const foundation = mat(0x686257);
      for (const x of [-20, 0, 20])
        box(origin.x + x, 0.018, origin.z - 18, 10, 0.03, 12, foundation);
    }
  }
  const colors = {
    hedge: 0x475b2e,
    wall: 0x8f846b,
    crate: 0x775737,
    boiler: 0x64746b,
    pump: 0x916e3f,
    pole: 0x514537,
    grave: 0x8b8b78,
    log: 0x665039,
    barricade: 0x94866b,
  };
  for (const kind of Object.keys(colors) as (keyof typeof colors)[]) {
    const props = plan.props.filter((p) => p.kind === kind);
    if (!props.length) continue;
    const geometry =
      kind === "boiler" || kind === "pump"
        ? new T.CylinderGeometry(0.5, 0.5, 1, 10)
        : boxGeometry;
    if (geometry !== boxGeometry) ownedGeometry.add(geometry);
    const material = mat(colors[kind]),
      mesh = new T.InstancedMesh(geometry, material, props.length),
      o = new T.Object3D();
    props.forEach((p, i) => {
      o.position.set(p.x, p.height / 2, p.z);
      o.rotation.y = p.angle;
      o.scale.set(p.width, p.height, p.depth);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (kind === "pump" || kind === "boiler") {
      const brass = mat(0xb19153);
      for (const p of props) {
        box(
          p.x,
          p.height * 0.7,
          p.z,
          p.width * 1.08,
          0.12,
          p.depth * 1.08,
          brass,
        );
        if (kind === "pump")
          box(p.x, p.height + 0.2, p.z, 0.6, 0.4, 0.3, brass);
      }
    }
  }
  const fieldGeometry = countryFieldGeometry(plan.fields);
  ownedGeometry.add(fieldGeometry);
  const fieldMaterial = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    map: grain,
  });
  ownedMaterial.add(fieldMaterial);
  const fields = new T.Mesh(fieldGeometry, fieldMaterial);
  fields.receiveShadow = true;
  group.add(fields);
  return {
    group,
    dispose() {
      group.removeFromParent();
      group.traverse((o) => {
        if (o instanceof T.InstancedMesh) o.dispose();
      });
      ownedGeometry.forEach((g) => g.dispose());
      ownedMaterial.forEach((m) => m.dispose());
      grain.dispose();
      streetTexture.dispose();
    },
  };
}
