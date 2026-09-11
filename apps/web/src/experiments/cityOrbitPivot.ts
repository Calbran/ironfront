import * as T from "three";

/** Pick only the currently rendered opaque surface, never hidden LODs or effect planes. */
export function pickCityOrbitPivot(raycaster: T.Raycaster, root: T.Object3D, camera: T.Camera, target: T.Vector3) {
  root.updateMatrixWorld(true);
  const surfaces: T.Object3D[] = [];
  root.traverseVisible(object => {
    if (!(object instanceof T.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some(m => m.visible && !m.transparent && m.depthWrite && m.opacity > .95)) surfaces.push(object);
  });
  for (const hit of raycaster.intersectObjects(surfaces, false)) {
    const mesh = hit.object as T.Mesh;
    const material = Array.isArray(mesh.material) ? mesh.material[hit.face?.materialIndex ?? 0] : mesh.material;
    if (material?.userData.cityCutawayPoint?.(hit.point)) continue;
    if (material?.visible && !material.transparent && material.depthWrite && material.opacity > .95) return hit.point.clone();
  }
  // Empty sky uses a plane through the current view target: no distant ground jump.
  return raycaster.ray.intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()), target), new T.Vector3()) ?? undefined;
}

export function rotateCityOrbit(camera: T.Camera, target: T.Vector3, anchor: T.Vector3, yaw: number, requestedPitch: number, minPolar: number, maxPolar: number) {
  const offset = camera.position.clone().sub(target);
  const polar = Math.acos(T.MathUtils.clamp(offset.y / offset.length(), -1, 1));
  const pitch = T.MathUtils.clamp(requestedPitch, minPolar - polar, maxPolar - polar);
  const yawQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw);
  const right = new T.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).applyQuaternion(yawQ).normalize();
  const q = new T.Quaternion().setFromAxisAngle(right, pitch).multiply(yawQ);
  camera.position.sub(anchor).applyQuaternion(q).add(anchor);
  target.sub(anchor).applyQuaternion(q).add(anchor);
}
