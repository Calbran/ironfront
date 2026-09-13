import * as T from "three";
import type { CityBuildKind } from "../../../../packages/game-core/src/cityBuildPlacement";
export function createEmplacementModel(kind: CityBuildKind) {
  const group = new T.Group();
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
  ) => {
    const mesh = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshStandardMaterial({ color, roughness: 1 }),
    );
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const instances = (positions: number[][], size: number[], color: number) => {
    const mesh = new T.InstancedMesh(
        new T.BoxGeometry(...(size as [number, number, number])),
        new T.MeshStandardMaterial({ color }),
        positions.length,
      ),
      o = new T.Object3D();
    positions.forEach(([x, y, z], i) => {
      o.position.set(x, y, z);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    group.add(mesh);
  };
  if (kind === "sandbags")
    instances(
      Array.from({ length: 16 }, (_, i) => [
        -1.75 + (i % 8) * 0.5,
        (Math.floor(i / 8) + 0.5) * 0.3,
        Math.floor(i / 8) * 0.12,
      ]),
      [0.48, 0.3, 0.72],
      0x9b9170,
    );
  if (kind === "warehouse") {
    box(0, 1.25, 0, 7, 2.5, 5, 0x727966);
    box(0, 2.6, 0, 7.3, 0.25, 5.3, 0x414c49);
    box(0, 1, 2.51, 2.1, 2, 0.08, 0x393e38);
  }
  if (kind === "trenches") {
    box(0, 0.035, 0, 6, 0.07, 2.5, 0x332e23);
    box(0, 0.3, -1.05, 6, 0.6, 0.4, 0x77694c);
    box(0, 0.3, 1.05, 6, 0.6, 0.4, 0x77694c);
    instances(
      Array.from({ length: 10 }, (_, i) => [-2.7 + i * 0.6, 0.09, 0]),
      [0.35, 0.1, 1.5],
      0x706451,
    );
  }
  if (kind === "artillery") {
    box(0, 0.6, 0, 1.4, 0.45, 1.8, 0x59644a);
    box(0, 1.1, -1, 0.25, 0.25, 2.7, 0x3d493d);
    box(0, 0.9, -0.2, 2, 0.95, 0.18, 0x697354);
    for (const x of [-1, 1]) {
      const wheel = new T.Mesh(
        new T.CylinderGeometry(0.5, 0.5, 0.25, 12),
        new T.MeshStandardMaterial({ color: 0x303631 }),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.5, 0.3);
      group.add(wheel);
    }
    box(-0.6, 0.15, 1.3, 0.16, 0.2, 1.5, 0x4f5947);
    box(0.6, 0.15, 1.3, 0.16, 0.2, 1.5, 0x4f5947);
  }
  if (kind === "wire") {
    instances(
      [-2, -0.67, 0.67, 2].map((x) => [x, 0.5, 0]),
      [0.1, 1, 0.1],
      0x5e5948,
    );
    const points: T.Vector3[] = [];
    for (let i = 0; i < 160; i++) {
      const x = -2.5 + (i / 159) * 5,
        a = (i / 159) * Math.PI * 24;
      points.push(
        new T.Vector3(x, 0.45 + Math.sin(a) * 0.4, Math.cos(a) * 0.55),
      );
    }
    group.add(
      new T.Line(
        new T.BufferGeometry().setFromPoints(points),
        new T.LineBasicMaterial({ color: 0x8b9088 }),
      ),
    );
  }
  return group;
}
export function disposeEmplacementModel(group: T.Group) {
  group.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Line) {
      o.geometry.dispose();
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      materials.forEach((m) => m.dispose());
    }
    if (o instanceof T.InstancedMesh) o.dispose();
  });
  group.removeFromParent();
}
