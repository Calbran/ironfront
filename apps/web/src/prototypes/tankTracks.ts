import * as T from "three";

/** Signed belt travel in original model coordinates; left/right can counter-rotate. */
export function createTankTracks(parent: T.Object3D, large = false) {
  const geometry = new T.BoxGeometry(
    large ? 0.85 : 0.67,
    0.085,
    large ? 0.29 : 0.23,
  );
  const material = new T.MeshStandardMaterial({
    color: 0x343c3c,
    roughness: 0.9,
  });
  const mesh = new T.InstancedMesh(geometry, material, large ? 96 : 72);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  parent.add(mesh);
  const dummy = new T.Object3D(),
    half = large ? 3.45 : 2.38,
    r = large ? 0.76 : 0.57,
    cy = large ? 0.82 : 0.63,
    count = large ? 48 : 36,
    spread = large ? 1.8 : 1.28,
    length = 4 * half + 2 * Math.PI * r;
  function update(left: number, right: number) {
    for (let side = 0; side < 2; side++)
      for (let i = 0; i < count; i++) {
        const travel = side === 0 ? left : right;
        const s =
          ((((i / count) * length + travel) % length) + length) % length;
        let y: number, z: number, angle: number;
        if (s < 2 * half) {
          z = -half + s;
          y = cy + r;
          angle = 0;
        } else if (s < 2 * half + Math.PI * r) {
          const a = (s - 2 * half) / r;
          z = half + r * Math.sin(a);
          y = cy + r * Math.cos(a);
          angle = a;
        } else if (s < 4 * half + Math.PI * r) {
          z = half - (s - 2 * half - Math.PI * r);
          y = cy - r;
          angle = Math.PI;
        } else {
          const a = (s - 4 * half - Math.PI * r) / r;
          z = -half - r * Math.sin(a);
          y = cy - r * Math.cos(a);
          angle = Math.PI + a;
        }
        dummy.position.set(side === 0 ? -spread : spread, y, z);
        dummy.rotation.set(angle, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(side * count + i, dummy.matrix);
      }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0, 0);
  return {
    update,
    dispose() {
      parent.remove(mesh);
      mesh.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
