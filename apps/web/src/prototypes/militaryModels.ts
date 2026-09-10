import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { bakeInfantry } from "../infantryModel";

/** Model coordinates match the original infantry rig, with no metres conversion implied. */
export const SOLDIER_REFERENCE_HEIGHT = 1.925;
export const MILITARY_MODELS = [
  "tank",
  "airship",
  "artillery",
  "sandbags",
  "wire",
  "lmg",
  "landship",
  "guards",
  "gunship",
  "engineers",
] as const;
export type MilitaryModelKind = (typeof MILITARY_MODELS)[number];
export const MODEL_LABELS: Record<MilitaryModelKind, string> = {
  tank: "Steam tank",
  airship: "Patrol airship",
  artillery: "Artillery emplacement",
  sandbags: "Sandbag wall",
  wire: "Barbed-wire obstacle",
  lmg: "LMG gunner squad",
  landship: "Iron Directorate · Heavy landship",
  guards: "Crownward League · Armored Guards",
  gunship: "Aether Compact · Turbine gunship",
  engineers: "Combat engineers",
};
const palette = {
  enamel: 0x46584b,
  iron: 0x303637,
  brass: 0xaf9258,
  copper: 0x976546,
  cloth: 0xa89b77,
  wood: 0x746044,
  rubber: 0x272a28,
};
class Builder {
  parts: T.BufferGeometry[] = [];
  add(
    g: T.BufferGeometry,
    color: number,
    x = 0,
    y = 0,
    z = 0,
    rotation?: T.Euler,
  ) {
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    const matrix = new T.Matrix4().compose(
      new T.Vector3(x, y, z),
      new T.Quaternion().setFromEuler(rotation ?? new T.Euler()),
      new T.Vector3(1, 1, 1),
    );
    flat.applyMatrix4(matrix);
    const c = new T.Color(color),
      colors = new Float32Array(flat.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = c.r;
      colors[i + 1] = c.g;
      colors[i + 2] = c.b;
    }
    flat.setAttribute("color", new T.BufferAttribute(colors, 3));
    flat.deleteAttribute("uv");
    this.parts.push(flat);
  }
  box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color = palette.enamel,
    ry = 0,
  ) {
    this.add(new T.BoxGeometry(w, h, d), color, x, y, z, new T.Euler(0, ry, 0));
  }
  cyl(
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    color = palette.iron,
    n = 8,
    rotation = new T.Euler(),
  ) {
    this.add(new T.CylinderGeometry(r, r, h, n), color, x, y, z, rotation);
  }
  bar(a: number[], b: number[], r: number, color = palette.iron, n = 5) {
    const p = new T.Vector3(...a),
      q = new T.Vector3(...b),
      v = q.clone().sub(p);
    const g = new T.CylinderGeometry(r, r, v.length(), n);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        v.normalize(),
      ),
    );
    p.add(q).multiplyScalar(0.5);
    this.add(g, color, p.x, p.y, p.z);
  }
  finish(name: string, material: T.Material) {
    const geometry = mergeGeometries(this.parts, false)!;
    this.parts.forEach((g) => g.dispose());
    this.parts = [];
    const mesh = new T.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
function soldierGeometry(lmg = false, role?: "guard" | "engineer") {
  const rig = bakeInfantry(0),
    parts: T.BufferGeometry[] = [];
  for (let i = 0; i < rig.parts.length; i++) {
    if ((lmg || role === "engineer") && rig.parts[i].key === "rifle") continue;
    const key = rig.parts[i].key;
    if (role === "guard" && (key.startsWith("torso") || key === "head")) {
      const armor = new Builder();
      if (key === "head") {
        armor.box(0.08, 0.16, 0.25, 0, 0.36, 0, palette.brass);
      } else {
        armor.box(0.42, 0.38, 0.07, 0, 0.24, 0.19, 0xb7b8a3);
        armor.box(0.045, 0.4, 0.08, 0, 0.24, 0.23, palette.brass);
        armor.box(0.14, 0.1, 0.4, -0.28, 0.44, 0, palette.brass);
        armor.box(0.14, 0.1, 0.4, 0.28, 0.44, 0, palette.brass);
      }
      for (const piece of armor.parts) {
        piece.applyMatrix4(new T.Matrix4().fromArray(rig.aim[0][i]));
        parts.push(piece);
      }
    }
    if (role === "engineer" && key.startsWith("torso")) {
      const pack = new Builder();
      pack.box(0.48, 0.24, 0.22, 0, 0.48, -0.35, palette.wood);
      pack.bar([-0.21, -0.1, -0.4], [-0.21, 0.68, -0.4], 0.025, palette.iron);
      pack.box(0.23, 0.04, 0.13, -0.21, 0.66, -0.4, palette.iron);
      for (const piece of pack.parts) {
        piece.applyMatrix4(new T.Matrix4().fromArray(rig.aim[0][i]));
        parts.push(piece);
      }
    }
    const g = rig.parts[i].geometry.clone();
    if (role === "guard") {
      const original = new T.Color(0x46545d),
        blue = new T.Color(0x344f74),
        colors = g.attributes.color;
      for (let c = 0; c < colors.count; c++)
        if (
          Math.abs(colors.getX(c) - original.r) < 0.001 &&
          Math.abs(colors.getY(c) - original.g) < 0.001 &&
          Math.abs(colors.getZ(c) - original.b) < 0.001
        )
          colors.setXYZ(c, blue.r, blue.g, blue.b);
    }
    g.applyMatrix4(new T.Matrix4().fromArray(rig.aim[0][i]));
    g.deleteAttribute("uv");
    parts.push(g);
  }
  if (role === "engineer") {
    const tool = new Builder();
    tool.bar([-0.4, 0.015, 0], [0.72, 0.015, 0], 0.028, palette.wood);
    tool.box(0.28, 0.2, 0.06, 0.79, 0.015, 0, palette.iron);
    const index = rig.parts.findIndex((p) => p.key === "rifle");
    for (const piece of tool.parts) {
      piece.applyMatrix4(new T.Matrix4().fromArray(rig.aim[0][index]));
      parts.push(piece);
    }
  }
  if (lmg) {
    const b = new Builder();
    // Weapon-local X axis and grip locations match the existing rifle pose.
    b.box(0.64, 0.11, 0.11, -0.08, 0.015, 0, palette.wood);
    b.box(0.46, 0.13, 0.14, 0.23, 0.04, 0, palette.iron);
    b.bar([0.36, 0.065, 0], [0.99, 0.065, 0], 0.045, palette.iron, 8);
    b.cyl(0.13, 0.055, 0.18, 0.15, 0, palette.iron, 10);
    for (const side of [-1, 1])
      b.bar([0.8, 0.04, side * 0.04], [0.88, -0.32, side * 0.18], 0.02);
    const gun = mergeGeometries(b.parts, false)!;
    b.parts.forEach((g) => g.dispose());
    const index = rig.parts.findIndex((p) => p.key === "rifle");
    gun.applyMatrix4(new T.Matrix4().fromArray(rig.aim[0][index]));
    parts.push(gun);
  }
  const result = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  rig.parts.forEach((p) => p.geometry.dispose());
  result.computeBoundingBox();
  result.translate(0, -result.boundingBox!.min.y, 0);
  return result;
}
export function createInfantryReference() {
  const mesh = new T.Mesh(
    soldierGeometry(),
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
  );
  mesh.name = "Existing infantry — unchanged rig";
  mesh.castShadow = true;
  return mesh;
}
function sandbags(b: Builder, length = 4.4) {
  const count = Math.floor(length / 0.56);
  for (let row = 0; row < 4; row++)
    for (let i = 0; i < count - (row % 2); i++) {
      const x = (i - (count - 1 - (row % 2)) / 2) * 0.56;
      const g = new T.SphereGeometry(1, 6, 4);
      g.scale(0.3, 0.145, 0.235);
      b.add(g, row % 2 ? 0xa59773 : palette.cloth, x, 0.145 + row * 0.255, 0);
    }
}
export function createMilitaryModel(kind: MilitaryModelKind, movingTracks = false) {
  const root = new T.Group();
  root.name = MODEL_LABELS[kind];
  const material = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.78,
    metalness: 0.12,
  });
  const b = new Builder(),
    animated: T.Object3D[] = [];
  if (kind === "tank") {
    // 6.6 long / 3.1 wide hull. Turret and boiler remain below two standing soldiers.
    b.box(2.3, 0.8, 5.4, 0, 1.1, 0);
    b.box(2.15, 0.5, 3.3, 0, 1.72, -0.2);
    for (const side of [-1, 1]) {
      b.box(0.62, 1.05, 5.8, side * 1.28, 0.63, 0, palette.rubber);
      for (let z = -2.3; z <= 2.31; z += 0.92)
        b.cyl(
          0.4,
          0.68,
          side * 1.29,
          0.64,
          z,
          palette.iron,
          8,
          new T.Euler(0, 0, Math.PI / 2),
        );
      for (let z = -2.7; !movingTracks && z <= 2.71; z += 0.39) {
        b.box(0.67, 0.08, 0.15, side * 1.28, 1.19, z, palette.iron);
        b.box(0.67, 0.08, 0.15, side * 1.28, 0.07, z, palette.iron);
      }
      b.box(0.68, 0.12, 5.9, side * 1.27, 1.29, 0, palette.enamel);
      b.box(0.07, 0.22, 4.4, side * 1.19, 1.34, 0, palette.brass);
      b.cyl(0.13, 0.7, side * 0.9, 2.15, -2.05, palette.copper);
      b.box(0.24, 0.24, 0.1, side * 0.83, 1.2, 2.76, palette.brass);
    }
    b.cyl(
      0.49,
      1.1,
      0,
      1.75,
      -1.85,
      palette.copper,
      10,
      new T.Euler(Math.PI / 2, 0, 0),
    );
    const turret = new T.Group();
    turret.name = "turret_yaw";
    turret.position.set(0, 1.97, 0.5);
    root.add(turret);
    const t = new Builder();
    t.cyl(0.82, 0.62, 0, 0.28, 0, palette.enamel, 8);
    t.cyl(0.34, 0.14, 0, 0.66, -0.1, palette.iron);
    t.box(0.44, 0.32, 0.6, 0, 0.25, 0.72);
    const cannon = new Builder();
    cannon.bar([0, 0.29, 0.85], [0, 0.29, 2.65], 0.105, palette.iron, 10);
    cannon.cyl(
      0.15,
      0.28,
      0,
      0.29,
      2.58,
      palette.iron,
      8,
      new T.Euler(Math.PI / 2, 0, 0),
    );
    turret.add(t.finish("turret_and_cannon", material));
    turret.add(cannon.finish("barrel_recoil", material));
    animated.push(turret);
    root.userData.footprint = { width: 3.25, length: 5.95 };
  } else if (kind === "airship") {
    const g = new T.SphereGeometry(1, 16, 10);
    g.scale(2.25, 2.25, 8.5);
    b.add(g, palette.cloth, 0, 5.8, 0);
    // Envelope bands and fins read as large silhouettes, without tiny rivets.
    for (const z of [-5, -2.5, 0, 2.5, 5]) {
      const r = 2.26 * Math.sqrt(1 - (z * z) / (8.5 * 8.5));
      b.add(new T.TorusGeometry(r, 0.035, 3, 16), palette.wood, 0, 5.8, z);
    }
    b.box(0.12, 2, 2.6, 0, 7.2, -6.7, palette.enamel);
    b.box(3.6, 0.12, 2.7, 0, 5.8, -6.7, palette.enamel);
    b.box(1.1, 0.65, 3.7, 0, 2.48, 0.2, palette.enamel);
    b.box(0.85, 0.45, 1.2, 0, 2.99, 1.35, palette.wood);
    for (const side of [-1, 1]) {
      for (const z of [-1.2, 1.5])
        b.bar(
          [side * 0.5, 2.8, z],
          [side * 1.45, 4.22, z],
          0.045,
          palette.iron,
        );
      b.box(0.06, 0.25, 1.7, side * 0.57, 2.56, 0.6, palette.brass);
      b.bar([side * 0.5, 2.5, -0.7], [side * 1.6, 2.5, -0.7], 0.08);
      b.cyl(
        0.2,
        0.8,
        side * 1.6,
        2.5,
        -0.7,
        palette.copper,
        8,
        new T.Euler(Math.PI / 2, 0, 0),
      );
      const prop = new T.Group();
      prop.name = `propeller_${side}`;
      prop.position.set(side * 1.6, 2.5, -1.16);
      root.add(prop);
      const p = new Builder();
      p.box(0.13, 1.6, 0.07, 0, 0, 0, palette.wood);
      p.box(1.6, 0.13, 0.07, 0, 0, 0, palette.wood);
      prop.add(p.finish("propeller", material));
      animated.push(prop);
    }
    root.userData.footprint = { width: 4.5, length: 17 };
    root.userData.gondolaBase = 2.155;
  } else if (kind === "artillery") {
    b.cyl(1.2, 0.18, 0, 0.09, 0, palette.wood, 12);
    for (const side of [-1, 1]) {
      b.cyl(
        0.57,
        0.22,
        side * 0.86,
        0.63,
        -0.3,
        palette.iron,
        10,
        new T.Euler(0, 0, Math.PI / 2),
      );
      b.bar([side * 0.4, 0.65, 0], [side * 0.95, 0.12, -2.3], 0.1);
      b.box(0.45, 0.13, 0.4, side * 0.95, 0.12, -2.3, palette.iron);
    }
    b.box(1.85, 1.05, 0.13, 0, 1.18, 0.45, palette.enamel);
    b.box(0.55, 0.42, 0.7, 0, 1.15, 0, palette.iron);
    const barrel = new Builder();
    barrel.bar([0, 1.21, -0.2], [0, 1.83, 2.8], 0.15, palette.iron, 10);
    root.add(barrel.finish("barrel_recoil", material));
    b.bar([0.23, 1.05, 0.2], [0.23, 1.35, 1.6], 0.07, palette.brass);
    b.box(0.65, 0.42, 0.5, -1.8, 0.21, -0.5, palette.wood);
    // Low protective horseshoe; rear crew access stays open.
    for (let i = 0; i < 15; i++)
      for (let row = 0; row < 3; row++) {
        const angle = -Math.PI * 0.55 + ((i + row * 0.3) / 14) * Math.PI * 1.1;
        const g = new T.SphereGeometry(1, 6, 4);
        g.scale(0.3, 0.14, 0.22);
        b.add(
          g,
          palette.cloth,
          Math.sin(angle) * 2.7,
          0.14 + row * 0.26,
          Math.cos(angle) * 2.7 - 0.1,
          new T.Euler(0, angle, 0),
        );
      }
    root.userData.footprint = { width: 6.1, length: 5.6 };
  } else if (kind === "sandbags") {
    sandbags(b);
    root.userData.footprint = { width: 4.1, length: 0.5 };
    for (const x of [-1.98, 1.98]) {
      const socket = new T.Group();
      socket.name = x < 0 ? "join_left" : "join_right";
      socket.position.x = x;
      root.add(socket);
    }
  } else if (kind === "wire") {
    for (const x of [-2.5, 0, 2.5])
      b.bar([x, 0, 0], [x, 1.05, 0], 0.055, palette.wood);
    for (const y of [0.42, 0.83]) {
      b.bar([-2.5, y, 0], [2.5, y, 0], 0.018);
      for (let x = -2.25; x < 2.5; x += 0.45) {
        b.bar([x - 0.09, y - 0.09, -0.07], [x + 0.09, y + 0.09, 0.07], 0.013);
        b.bar([x - 0.09, y + 0.09, 0.07], [x + 0.09, y - 0.09, -0.07], 0.013);
      }
    }
    const turns = 11,
      count = turns * 10;
    for (let i = 0; i < count; i++) {
      const point = (t: number) => [
        -2.5 + 5 * t,
        0.42 + Math.cos(t * Math.PI * 2 * turns) * 0.32,
        Math.sin(t * Math.PI * 2 * turns) * 0.32,
      ];
      b.bar(point(i / count), point((i + 1) / count), 0.018, palette.iron, 4);
    }
    for (const x of [-2.5, 2.5]) {
      const socket = new T.Group();
      socket.name = x < 0 ? "join_left" : "join_right";
      socket.position.x = x;
      root.add(socket);
    }
    root.userData.footprint = { width: 5.12, length: 0.7 };
  } else if (kind === "landship") {
    const steel = 0x4d5050,
      red = 0x8e3931;
    b.box(3.1, 1.15, 7.7, 0, 1.4, 0, steel);
    b.box(2.5, 0.75, 4.5, 0, 2.27, -0.4, steel);
    for (const side of [-1, 1]) {
      b.box(0.8, 1.5, 8.4, side * 1.8, 0.82, 0, palette.rubber);
      for (let z = -3.4; z <= 3.41; z += 1.13)
        b.cyl(
          0.55,
          0.84,
          side * 1.8,
          0.82,
          z,
          palette.iron,
          8,
          new T.Euler(0, 0, Math.PI / 2),
        );
      for (let z = -3.9; !movingTracks && z <= 3.91; z += 0.5) {
        b.box(0.85, 0.09, 0.2, side * 1.8, 1.6, z, palette.iron);
        b.box(0.85, 0.08, 0.2, side * 1.8, 0.06, z, palette.iron);
      }
      b.box(0.85, 0.12, 8.5, side * 1.8, 1.72, 0, steel);
      b.box(0.1, 0.3, 6.8, side * 1.58, 1.9, 0, red);
      b.box(0.85, 0.85, 1.8, side * 1.65, 1.98, 0.9, steel);
      b.bar([side * 1.7, 2.05, 1.8], [side * 1.7, 2.05, 3.65], 0.12);
      b.cyl(0.18, 1.05, side * 0.95, 3, -2.85, palette.copper);
      b.box(0.28, 0.28, 0.12, side * 1.13, 1.25, 3.91, palette.brass);
    }
    const turret = new T.Group();
    turret.name = "turret_yaw";
    turret.position.set(0, 2.67, 0.45);
    root.add(turret);
    const t = new Builder();
    t.cyl(0.98, 0.65, 0, 0.3, 0, steel, 8);
    t.box(0.4, 0.4, 1, 0, 0.22, 0.85, steel);
    const cannon = new Builder();
    cannon.bar([0, 0.3, 0.9], [0, 0.3, 3.4], 0.17);
    t.cyl(0.36, 0.18, 0, 0.72, -0.1, palette.iron);
    t.box(0.08, 0.28, 0.6, 0.97, 0.3, 0, red);
    turret.add(t.finish("heavy_turret", material));
    turret.add(cannon.finish("barrel_recoil", material));
    animated.push(turret);
    b.cyl(
      0.65,
      1.5,
      0,
      2.43,
      -2.75,
      palette.copper,
      10,
      new T.Euler(Math.PI / 2, 0, 0),
    );
    root.userData.footprint = { width: 4.5, length: 8.6 };
    root.userData.faction = "Iron Directorate";
  } else if (kind === "gunship") {
    const teal = 0x397c7a;
    b.box(1.4, 0.7, 4.9, 0, 1.1, 0, teal);
    b.box(1.1, 0.7, 1.7, 0, 1.75, 1.2, palette.cloth);
    b.box(1.12, 0.4, 0.1, 0, 1.85, 2.09, 0x536b73);
    b.box(0.08, 0.4, 1.1, -0.56, 1.85, 1.2, 0x536b73);
    b.box(0.08, 0.4, 1.1, 0.56, 1.85, 1.2, 0x536b73);
    for (const side of [-1, 1]) {
      b.bar(
        [side * 0.6, 1.5, -0.4],
        [side * 2.05, 1.5, -0.4],
        0.12,
        palette.copper,
      );
      b.add(
        new T.TorusGeometry(1, 0.17, 5, 14),
        teal,
        side * 2.05,
        1.9,
        -0.4,
        new T.Euler(Math.PI / 2, 0, 0),
      );
      const rotor = new T.Group();
      rotor.name = `turbine_${side}`;
      rotor.position.set(side * 2.05, 1.9, -0.4);
      root.add(rotor);
      const p = new Builder();
      p.box(1.8, 0.055, 0.16, 0, 0, 0, palette.iron);
      p.box(0.16, 0.055, 1.8, 0, 0, 0, palette.iron);
      p.cyl(0.21, 0.2, 0, 0, 0, palette.brass);
      rotor.add(p.finish("turbine_rotor", material));
      animated.push(rotor);
      b.bar([side * 0.55, 0.8, 1.4], [side * 0.85, 0.16, 1.7], 0.055);
      b.bar([side * 0.55, 0.8, -1.5], [side * 0.85, 0.16, -1.7], 0.055);
      b.bar([side * 0.85, 0.16, -2.1], [side * 0.85, 0.16, 2.1], 0.07);
    }
    b.box(0.13, 1.5, 1.3, 0, 2.15, -2.1, teal);
    b.box(2.1, 0.1, 1, 0, 1.35, -2.15, teal);
    b.cyl(0.39, 0.4, 0, 0.56, 1.45, palette.iron);
    b.bar([0, 0.52, 1.6], [0, 0.52, 3], 0.055);
    b.cyl(
      0.28,
      1.2,
      0,
      1.65,
      -1.3,
      palette.copper,
      8,
      new T.Euler(Math.PI / 2, 0, 0),
    );
    root.userData.footprint = { width: 6.5, length: 6 };
    root.userData.faction = "Aether Compact";
  } else if (kind === "guards" || kind === "engineers") {
    const soldier = soldierGeometry(
      false,
      kind === "guards" ? "guard" : "engineer",
    );
    const slots = [
      [-0.7, 0.6],
      [0.7, 0.6],
      [-1.2, -0.85],
      [1.2, -0.85],
      [-0.8, -2.3],
      [0.8, -2.3],
    ];
    slots.forEach(([x, z], i) => {
      const g = soldier.clone();
      g.translate(x, 0, z);
      b.parts.push(g);
      const socket = new T.Group();
      socket.name = `${kind}_${i + 1}`;
      socket.position.set(x, 0, z);
      root.add(socket);
    });
    soldier.dispose();
    if (kind === "engineers") {
      b.box(0.65, 0.35, 0.4, -1.9, 0.175, 0.1, palette.wood);
      b.bar([-2.05, 0.18, 0.5], [-1.65, 0.18, 0.8], 0.025);
      b.bar([-1.7, 0.18, 0.5], [-2, 0.18, 0.8], 0.025);
    }
    root.userData.members = 6;
    root.userData.faction = kind === "guards" ? "Crownward League" : "Shared";
    root.userData.footprint = { width: 4.3, length: 4.8 };
  } else {
    const rifle = soldierGeometry(),
      gunner = soldierGeometry(true);
    const slots = [
      [-0.5, 0.5],
      [0.7, 0.25],
      [-1.8, -1.2],
      [1.8, -1.2],
      [-1, -2.65],
      [1, -2.65],
    ];
    slots.forEach(([x, z], i) => {
      const g = (i === 0 ? gunner : rifle).clone();
      g.translate(x, 0, z);
      b.parts.push(g);
      const socket = new T.Group();
      socket.name =
        i === 0
          ? "gunner"
          : i === 1
            ? "ammunition_assistant"
            : `rifleman_${i - 1}`;
      socket.position.set(x, 0, z);
      root.add(socket);
    });
    rifle.dispose();
    gunner.dispose();
    b.box(0.32, 0.28, 0.5, 0.86, 0.14, 0.7, palette.wood);
    root.userData.footprint = { width: 4.3, length: 5.1 };
    root.userData.members = 6;
  }
  root.add(b.finish("body", material));
  root.userData.modelKind = kind;
  root.userData.referenceHeight = SOLDIER_REFERENCE_HEIGHT;
  const bounds = new T.Box3().setFromObject(root),
    size = bounds.getSize(new T.Vector3());
  root.userData.dimensions = { width: size.x, height: size.y, length: size.z };
  let triangles = 0;
  root.traverse((o) => {
    if (o instanceof T.Mesh)
      triangles +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  return {
    root,
    triangles,
    animate: (time: number) => {
      animated.forEach((o) => {
        if (kind === "airship") o.rotation.z = time * 6;
        else if (kind === "gunship") o.rotation.y = time * 8;
        else o.rotation.y = Math.sin(time * 0.5) * 0.3;
      });
    },
    dispose: () => {
      root.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      material.dispose();
    },
  };
}
