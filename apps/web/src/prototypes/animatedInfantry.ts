import * as T from "three";
import { bakeInfantry } from "../infantryModel";
import type { soldierReview } from "./animationTimeline";
import { runFlight } from "./animationTimeline";
export type InfantryRole = "rifle" | "guard" | "lmg" | "engineer" | "antitank";
/** A small review cast shares original articulated geometry; attachments follow actual joints. */
export function createReviewInfantryKit() {
  const rig = bakeInfantry(0),
    owned: T.BufferGeometry[] = [],
    materials: T.Material[] = [];
  const material = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
  });
  materials.push(material);
  function plain(color: number) {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.8 });
    materials.push(m);
    return m;
  }
  const iron = plain(0x303637),
    brass = plain(0xaf9258),
    wood = plain(0x746044),
    plate = plain(0xb7b8a3);
  function box(
    parent: T.Object3D,
    mat: T.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) {
    const g = new T.BoxGeometry(w, h, d);
    owned.push(g);
    const mesh = new T.Mesh(g, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function actor(role: InfantryRole) {
    const root = new T.Group(),
      joints = rig.parts.map((p) => {
        const mesh = new T.Mesh(p.geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.name = p.key;
        mesh.castShadow = true;
        root.add(mesh);
        return mesh;
      });
    const weapon = joints[rig.parts.findIndex((p) => p.key === "rifle")];
    let magazine: T.Mesh | undefined;
    if (role === "lmg" || role === "engineer" || role === "antitank") {
      const empty = new T.BufferGeometry();
      owned.push(empty);
      weapon.geometry = empty;
      box(weapon, wood, 0.66, 0.08, 0.08, -0.1, 0.015, 0);
      if (role === "antitank") {
        const tube = new T.CylinderGeometry(0.115, 0.115, 1.32, 10);
        tube.rotateZ(Math.PI / 2);
        owned.push(tube);
        const launcher = new T.Mesh(tube, iron);
        launcher.name = "rocket_launcher";
        launcher.position.set(0.12, 0.14, 0);
        weapon.add(launcher);
        for (const x of [-0.48, -0.3, 0.48, 0.7])
          box(weapon, brass, 0.06, 0.26, 0.26, x, 0.14, 0);
        box(weapon, wood, 0.25, 0.12, 0.17, -0.17, 0.015, 0);
        box(weapon, iron, 0.14, 0.12, 0.035, 0.05, 0.3, 0.07);
        const nose = new T.ConeGeometry(0.16, 0.33, 8);
        nose.rotateZ(-Math.PI / 2);
        owned.push(nose);
        const round = new T.Mesh(nose, brass);
        round.name = "reload_rocket";
        round.position.set(0.86, 0.14, 0);
        weapon.add(round);
        magazine = round;
        const torso = joints.find((j) => j.name.startsWith("torso"))!;
        for (const x of [-0.18, 0.18])
          box(torso, wood, 0.16, 0.64, 0.18, x, 0.35, -0.43);
      } else if (role === "lmg") {
        box(weapon, iron, 0.6, 0.18, 0.19, 0.25, 0.04, 0);
        box(weapon, iron, 0.72, 0.115, 0.115, 0.73, 0.06, 0);
        // Cooling bands and folded bipod give the gun a heavier silhouette.
        for (const x of [0.48, 0.61, 0.74, 0.87])
          box(weapon, brass, 0.035, 0.14, 0.14, x, 0.06, 0);
        for (const side of [-1, 1])
          box(weapon, iron, 0.46, 0.035, 0.035, 0.73, -0.035, side * 0.09);
        const g = new T.CylinderGeometry(0.17, 0.17, 0.085, 10);
        owned.push(g);
        const drum = new T.Mesh(g, iron);
        drum.name = "reload_drum";
        drum.position.set(0.17, 0.14, 0);
        weapon.add(drum);
        magazine = drum;
      } else {
        box(weapon, wood, 0.6, 0.045, 0.045, 0.42, 0.015, 0);
        box(weapon, iron, 0.25, 0.2, 0.05, 0.83, 0.015, 0);
      }
    }
    if (role === "guard") {
      const torso = joints.find((j) => j.name.startsWith("torso"))!,
        head = joints.find((j) => j.name === "head")!;
      box(torso, plate, 0.42, 0.38, 0.065, 0, 0.24, 0.19);
      box(torso, brass, 0.045, 0.4, 0.07, 0, 0.24, 0.23);
      box(head, brass, 0.08, 0.16, 0.25, 0, 0.36, 0);
      const color = new T.Color(0x46545d),
        blue = new T.Color(0x344f74);
      joints.forEach((j) => {
        if (
          !j.name.startsWith("torso") &&
          !j.name.startsWith("sleeve") &&
          !j.name.startsWith("forearm")
        )
          return;
        const g = j.geometry.clone();
        owned.push(g);
        const a = g.attributes.color;
        for (let i = 0; i < a.count; i++)
          if (
            Math.abs(a.getX(i) - color.r) < 0.001 &&
            Math.abs(a.getY(i) - color.g) < 0.001 &&
            Math.abs(a.getZ(i) - color.b) < 0.001
          )
            a.setXYZ(i, blue.r, blue.g, blue.b);
        j.geometry = g;
      });
    }
    if (role === "engineer") {
      const torso = joints.find((j) => j.name.startsWith("torso"))!;
      box(torso, wood, 0.47, 0.24, 0.2, 0, 0.48, -0.35);
      box(torso, iron, 0.045, 0.65, 0.05, -0.21, 0.25, -0.42);
      box(torso, iron, 0.25, 0.045, 0.1, -0.21, 0.55, -0.42);
    }
    const muzzle = new T.Object3D();
    muzzle.position.set(
      role === "antitank" ? 1.04 : role === "lmg" ? 1.1 : 0.65,
      role === "antitank" ? 0.14 : 0.07,
      0,
    );
    muzzle.rotation.y = Math.PI / 2;
    weapon.add(muzzle);
    const point = new T.Vector3();
    return {
      root,
      muzzle,
      update(p: ReturnType<typeof soldierReview>) {
        const reloadLift =
          (role === "lmg" || role === "antitank") && p.reload >= 0
            ? (role === "antitank" ? .5 : .24) * Math.sin(Math.PI * p.reload) ** 2
            : 0;
        const pose = rig.pose(
          p.mode,
          p.phase,
          p.recoil,
          Math.max(0, p.crouch - reloadLift),
          p.lean,
          role === "engineer" ? -1 : p.reload,
        );
        if (magazine) {
          const lift = p.reload >= 0 ? Math.sin(Math.PI * p.reload) ** 2 : 0;
          magazine.position.set(0.17, 0.14 + lift * 0.2, -lift * 0.24);
          magazine.visible = !(p.reload > 0.3 && p.reload < 0.58);
          if (role === "antitank") {
            magazine.position.set(0.86 + lift * 0.35, 0.14, 0);
            magazine.visible = p.reload < 0 || p.reload > 0.55;
          }
        }
        let min = Infinity;
        joints.forEach((j, i) => {
          j.matrix.fromArray(pose[i]);
          if (j.name !== "boot") return;
          const a = j.geometry.attributes.position;
          for (let n = 0; n < a.count; n++) {
            point.fromBufferAttribute(a, n).applyMatrix4(j.matrix);
            min = Math.min(min, point.y);
          }
        });
        joints.forEach((j) => {
          j.matrix.elements[13] +=
            (p.mode === "run" ? runFlight(p.phase) : 0) - min;
          j.matrixWorldNeedsUpdate = true;
        });
      },
    };
  }
  return {
    actor,
    dispose() {
      rig.parts.forEach((p) => p.geometry.dispose());
      owned.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
