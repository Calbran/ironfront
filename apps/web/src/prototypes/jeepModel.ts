import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Same unscaled body dimensions as infantry-overlay.fragment.html: helmet top 1.925.
export const INFANTRY_HEIGHT = 1.925;
export const JEEP_PASSENGER_CAPACITY = 6;
export const JEEP_DIMENSIONS = { length: 5.9, width: 2.5, height: 2.35 };
const mat = (color: number, metalness = 0) =>
  new T.MeshStandardMaterial({ color, metalness, roughness: 0.68 });
const enamel = mat(0x354d43, 0.45),
  iron = mat(0x252d2e, 0.6),
  brass = mat(0xb08b4e, 0.7),
  copper = mat(0x9e5f39, 0.6),
  rubber = mat(0x202322),
  leather = mat(0x674b34),
  wood = mat(0x7f6745);
function mesh(
  parent: T.Object3D,
  geo: T.BufferGeometry,
  material: T.Material,
  x: number,
  y: number,
  z: number,
) {
  const m = new T.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (
  p: T.Object3D,
  m: T.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) => mesh(p, new T.BoxGeometry(w, h, d), m, x, y, z);
const cylinder = (
  p: T.Object3D,
  m: T.Material,
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  n = 12,
) => mesh(p, new T.CylinderGeometry(r, r, h, n), m, x, y, z);
function bar(
  p: T.Object3D,
  m: T.Material,
  a: number[],
  b: number[],
  r = 0.035,
) {
  const start = new T.Vector3(...a),
    end = new T.Vector3(...b),
    direction = end.clone().sub(start);
  const o = cylinder(p, m, r, direction.length(), 0, 0, 0, 8);
  o.position.copy(start.add(end).multiplyScalar(0.5));
  o.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    direction.normalize(),
  );
  return o;
}
/** Reference soldier: original infantry dimensions and palette, with a seated inspection pose. */
export function createScaleSoldier(seated = false) {
  const g = new T.Group(),
    coat = mat(0x46545d),
    cloth = mat(0x625f4e),
    skin = mat(0xc39770),
    boot = mat(0x342d25),
    webbing = mat(0xb39e73);
  const upper = new T.Group();
  upper.position.y = 1.04;
  g.add(upper);
  box(g, cloth, 0.43, 0.2, 0.29, 0, 0.91, 0);
  box(upper, coat, 0.48, 0.53, 0.32, 0, 0.23, 0);
  box(upper, coat, 0.5, 0.23, 0.3, 0, -0.12, 0);
  box(upper, wood, 0.37, 0.4, 0.2, 0, 0.27, -0.25);
  box(upper, webbing, 0.49, 0.14, 0.16, 0, 0.54, -0.25);
  box(upper, leather, 0.48, 0.07, 0.33, 0, 0, 0.01);
  for (const s of [-1, 1])
    box(upper, webbing, 0.055, 0.45, 0.02, s * 0.15, 0.23, 0.17);
  box(upper, skin, 0.22, 0.25, 0.2, 0, 0.605, 0.025);
  cylinder(upper, iron, 0.25, 0.025, 0, 0.737, 0, 6);
  mesh(upper, new T.CylinderGeometry(0.1, 0.22, 0.14, 6), iron, 0, 0.815, 0);
  for (const s of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(s * 0.135, 0.89, 0);
    g.add(leg);
    box(leg, cloth, 0.18, 0.32, 0.17, 0, -0.16, 0);
    const knee = new T.Group();
    knee.position.y = -0.32;
    leg.add(knee);
    box(knee, leather, 0.13, 0.33, 0.14, 0, -0.165, 0);
    box(knee, boot, 0.17, 0.13, 0.28, 0, -0.315, 0.05);
    if (seated) {
      leg.rotation.x = -Math.PI / 2;
      knee.rotation.x = Math.PI / 2;
    }
    bar(g, coat, [s * 0.3, 1.47, 0], [s * 0.32, 1.16, 0.08], 0.085);
    bar(g, coat, [s * 0.32, 1.16, 0.08], [s * 0.24, 1.02, 0.35], 0.065);
    box(g, skin, 0.14, 0.13, 0.14, s * 0.24, 1.02, 0.35);
  }
  return g;
}
/** +Z is the bonnet/front. Passenger sockets are six seats; driver is separate. */
export function createDetailedJeep() {
  const root = new T.Group();
  root.name = "Ironfront steam jeep";
  box(root, iron, 1.85, 0.22, 5.3, 0, 0.69, 0);
  for (const x of [-0.68, 0.68]) box(root, iron, 0.12, 0.18, 5.6, x, 0.53, 0);
  box(root, enamel, 1.94, 0.15, 3.3, 0, 0.92, -0.95);
  for (let z = -2.48; z < 0.55; z += 0.22)
    box(root, wood, 1.73, 0.045, 0.19, 0, 1.01, z);
  // Six inward-facing seats: three down each side, with an open center aisle.
  const seats: T.Group[] = [];
  for (const side of [-1, 1]) {
    box(root, enamel, 0.13, 0.53, 3.25, side * 0.94, 1.2, -0.95);
    box(root, brass, 0.15, 0.045, 3.26, side * 0.94, 1.48, -0.95);
    for (const z of [-1.97, -1.04, -0.11]) {
      box(root, leather, 0.49, 0.12, 0.69, side * 0.69, 1.21, z);
      box(root, leather, 0.095, 0.48, 0.69, side * 0.91, 1.47, z);
      const socket = new T.Group();
      socket.name = `passenger-${seats.length + 1}`;
      socket.position.set(side * 0.66, 0.38, z);
      socket.rotation.y = (-side * Math.PI) / 2;
      root.add(socket);
      seats.push(socket);
    }
    box(root, iron, 0.32, 0.12, 3.6, side * 1.02, 0.86, -0.6);
    for (let z = -2.42; z < 0.55; z += 0.3)
      cylinder(root, brass, 0.035, 0.025, side * 1.015, 1.32, z, 6).rotation.z =
        Math.PI / 2;
  }
  // Separate driver's station, not counted against six passenger places.
  box(root, leather, 0.6, 0.13, 0.62, -0.48, 1.2, 0.86);
  box(root, leather, 0.6, 0.55, 0.12, -0.48, 1.49, 0.55);
  box(root, enamel, 1.82, 0.7, 1.45, 0, 1.27, 1.94);
  box(root, brass, 1.88, 0.055, 1.47, 0, 1.65, 1.94);
  box(root, iron, 1.67, 0.61, 0.08, 0, 1.29, 2.71);
  for (let x = -0.7; x <= 0.71; x += 0.14)
    box(root, brass, 0.035, 0.5, 0.07, x, 1.29, 2.77);
  box(root, iron, 2.24, 0.14, 0.2, 0, 0.87, 2.92);
  for (const side of [-1, 1]) {
    for (const z of [-1.77, 1.87]) {
      bar(root, iron, [-1.1, 0.58, z], [1.1, 0.58, z], 0.11);
      const wheel = new T.Group();
      wheel.position.set(side * 1.08, 0.59, z);
      root.add(wheel);
      cylinder(wheel, rubber, 0.59, 0.34, 0, 0, 0, 16).rotation.z = Math.PI / 2;
      cylinder(wheel, brass, 0.34, 0.355, 0, 0, 0, 12).rotation.z = Math.PI / 2;
      cylinder(wheel, iron, 0.25, 0.37, 0, 0, 0, 12).rotation.z = Math.PI / 2;
      cylinder(wheel, brass, 0.1, 0.41, 0, 0, 0, 8).rotation.z = Math.PI / 2;
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8;
        const tread = box(
          wheel,
          iron,
          0.36,
          0.07,
          0.13,
          0,
          Math.cos(a) * 0.58,
          Math.sin(a) * 0.58,
        );
        tread.rotation.x = -a;
      }
      box(root, enamel, 0.49, 0.1, 1.39, side * 1.03, 1.25, z);
    }
    const lamp = cylinder(root, brass, 0.18, 0.23, side * 0.79, 1.65, 2.64);
    lamp.rotation.x = Math.PI / 2;
    const lens = cylinder(
      root,
      mat(0xf4dfab),
      0.135,
      0.025,
      side * 0.79,
      1.65,
      2.77,
    );
    lens.rotation.x = Math.PI / 2;
    bar(root, brass, [side * 0.9, 1.68, 1.23], [side * 0.9, 2.14, 1.13]);
  }
  bar(root, brass, [-0.9, 2.14, 1.13], [0.9, 2.14, 1.13]);
  bar(root, brass, [-0.9, 1.68, 1.23], [0.9, 1.68, 1.23]);
  const glass = mat(0x9aafac);
  glass.transparent = true;
  glass.opacity = 0.22;
  box(root, glass, 1.72, 0.4, 0.025, 0, 1.92, 1.18);
  bar(root, iron, [-0.48, 1.12, 1.17], [-0.48, 1.64, 1.4], 0.045);
  const steering = mesh(
    root,
    new T.TorusGeometry(0.22, 0.025, 6, 16),
    iron,
    -0.48,
    1.65,
    1.39,
  );
  steering.rotation.x = -0.55;
  // Exposed copper boiler and pressure plumbing on the passenger-side cowl.
  cylinder(root, copper, 0.25, 0.73, 0.54, 1.86, 1.63);
  for (const y of [1.55, 1.9, 2.18])
    cylinder(root, brass, 0.265, 0.045, 0.54, y, 1.63);
  cylinder(root, iron, 0.09, 0.78, 0.82, 1.95, 2.14);
  cylinder(root, brass, 0.14, 0.07, 0.82, 2.35, 2.14);
  bar(root, copper, [0.54, 2.18, 1.63], [0.54, 2.18, 2.15], 0.055);
  bar(root, copper, [0.54, 2.18, 2.15], [0.82, 2.18, 2.15], 0.055);
  const gauge = cylinder(root, brass, 0.12, 0.055, 0.54, 1.99, 1.36);
  gauge.rotation.x = Math.PI / 2;
  cylinder(root, mat(0xe6d8b7), 0.095, 0.06, 0.54, 1.99, 1.33).rotation.x =
    Math.PI / 2;
  bar(root, iron, [0.54, 1.99, 1.29], [0.58, 2.04, 1.29], 0.009);
  // Rear stays open: step, grab handles, and hinged tailgate are modeled separately.
  box(root, iron, 1.4, 0.1, 0.43, 0, 0.65, -2.85);
  const tailgate = new T.Group();
  tailgate.name = "tailgate";
  tailgate.position.set(0, 1, -2.59);
  root.add(tailgate);
  box(tailgate, enamel, 1.78, 0.43, 0.1, 0, 0.215, 0);
  box(tailgate, brass, 1.82, 0.04, 0.12, 0, 0.44, 0);
  for (const x of [-0.89, 0.89])
    bar(root, brass, [x, 1.28, -2.57], [x, 1.79, -2.57]);
  const driver = new T.Group();
  driver.name = "driver";
  driver.position.set(-0.48, 0.38, 0.86);
  root.add(driver);
  root.userData = {
    passengerCapacity: JEEP_PASSENGER_CAPACITY,
    infantryReferenceHeight: INFANTRY_HEIGHT,
  };
  return { root, seats, driver, tailgate };
}

// Shared vertex-colored geometry: one body submission and one articulated gate.
// No material groups: colors survive merging without adding draw calls.
const vehicleMaterial = new T.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
  metalness: 0.25,
});
let simplifiedParts:
  { body: T.BufferGeometry; gate: T.BufferGeometry } | undefined;
function mergeColored(parent: T.Group) {
  parent.updateMatrixWorld(true);
  const parts: T.BufferGeometry[] = [];
  parent.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    const source = object.geometry;
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    geometry.applyMatrix4(object.matrixWorld);
    geometry.deleteAttribute("uv");
    const color = (object.material as T.MeshStandardMaterial).color;
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3)
      colors.set([color.r, color.g, color.b], i);
    geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
    parts.push(geometry);
    source.dispose();
  });
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((part) => part.dispose());
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
function buildSimplifiedParts() {
  const body = new T.Group(),
    gate = new T.Group();
  box(body, iron, 1.85, 0.22, 5.3, 0, 0.69, 0);
  box(body, wood, 1.94, 0.15, 3.3, 0, 0.96, -0.95);
  for (const side of [-1, 1]) {
    box(body, enamel, 0.13, 0.53, 3.25, side * 0.94, 1.2, -0.95);
    box(body, brass, 0.15, 0.045, 3.26, side * 0.94, 1.48, -0.95);
    // Continuous benches replace six separately built cushions/backrests.
    box(body, leather, 0.49, 0.12, 2.65, side * 0.69, 1.21, -1.04);
    box(body, leather, 0.095, 0.48, 2.65, side * 0.91, 1.47, -1.04);
    for (const z of [-1.77, 1.87]) {
      cylinder(body, rubber, 0.59, 0.34, side * 1.08, 0.59, z, 8).rotation.z =
        Math.PI / 2;
      cylinder(body, brass, 0.24, 0.355, side * 1.08, 0.59, z, 6).rotation.z =
        Math.PI / 2;
      box(body, enamel, 0.49, 0.1, 1.39, side * 1.03, 1.25, z);
    }
    box(body, brass, 0.28, 0.28, 0.18, side * 0.79, 1.65, 2.66);
    box(body, brass, 0.055, 0.48, 0.055, side * 0.9, 1.91, 1.18);
  }
  box(body, leather, 0.6, 0.13, 0.62, -0.48, 1.2, 0.86);
  box(body, leather, 0.6, 0.55, 0.12, -0.48, 1.49, 0.55);
  box(body, enamel, 1.82, 0.7, 1.45, 0, 1.27, 1.94);
  box(body, brass, 1.88, 0.055, 1.47, 0, 1.65, 1.94);
  box(body, iron, 1.67, 0.61, 0.08, 0, 1.29, 2.71);
  for (const x of [-0.56, 0, 0.56])
    box(body, brass, 0.065, 0.5, 0.07, x, 1.29, 2.77);
  box(body, iron, 2.24, 0.14, 0.2, 0, 0.87, 2.92);
  box(body, brass, 1.85, 0.055, 0.055, 0, 2.14, 1.18);
  // Boiler and chimney are the distance-readable steampunk silhouette.
  cylinder(body, copper, 0.25, 0.73, 0.54, 1.86, 1.63, 6);
  cylinder(body, brass, 0.265, 0.045, 0.54, 2.18, 1.63, 6);
  cylinder(body, iron, 0.09, 0.78, 0.82, 1.95, 2.14, 6);
  cylinder(body, brass, 0.14, 0.07, 0.82, 2.35, 2.14, 6);
  box(body, iron, 1.4, 0.1, 0.43, 0, 0.65, -2.85);
  box(gate, enamel, 1.78, 0.43, 0.1, 0, 0.215, 0);
  box(gate, brass, 1.82, 0.04, 0.12, 0, 0.44, 0);
  return { body: mergeColored(body), gate: mergeColored(gate) };
}
/** Distance model. Shared immutable resources are owned by this module, not individual jeeps. */
export function createJeep() {
  simplifiedParts ??= buildSimplifiedParts();
  const root = new T.Group();
  root.name = "Ironfront steam jeep";
  mesh(root, simplifiedParts.body, vehicleMaterial, 0, 0, 0);
  const tailgate = new T.Group();
  tailgate.name = "tailgate";
  tailgate.position.set(0, 1, -2.59);
  root.add(tailgate);
  mesh(tailgate, simplifiedParts.gate, vehicleMaterial, 0, 0, 0);
  const seats: T.Group[] = [];
  for (const side of [-1, 1])
    for (const z of [-1.97, -1.04, -0.11]) {
      const socket = new T.Group();
      socket.name = `passenger-${seats.length + 1}`;
      socket.position.set(side * 0.66, 0.38, z);
      socket.rotation.y = (-side * Math.PI) / 2;
      root.add(socket);
      seats.push(socket);
    }
  const driver = new T.Group();
  driver.name = "driver";
  driver.position.set(-0.48, 0.38, 0.86);
  root.add(driver);
  root.userData = {
    passengerCapacity: JEEP_PASSENGER_CAPACITY,
    infantryReferenceHeight: INFANTRY_HEIGHT,
    detail: "distance",
  };
  return { root, seats, driver, tailgate };
}
