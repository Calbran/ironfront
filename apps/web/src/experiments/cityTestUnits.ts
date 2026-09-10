import { createJeep } from "../prototypes/jeepModel";
import { CITY_TRIAL_SANDBAGS } from "../../../../packages/game-core/src/cityTactics";
import { createMilitaryModel } from "../prototypes/militaryModels";
import { createTankTracks } from "../prototypes/tankTracks";
import { runFlight } from "../prototypes/animationTimeline";
import * as T from "three";
import {
  createCityUnitTrial,
  CITY_RUN_STRIDE,
} from "../../../../packages/game-core/src/cityUnitTrial";
import type { createCityTactics } from "../../../../packages/game-core/src/cityTactics";
import type { bakeInfantry } from "../infantryModel";

export function createCityTestUnits(
  root: T.Group,
  camera: T.Camera,
  canvas: HTMLCanvasElement,
  rig: ReturnType<typeof bakeInfantry>,
  tactics: ReturnType<typeof createCityTactics>,
  focus: (p: { x: number; z: number }) => void,
) {
  const jeep = createJeep();
  const tank = createMilitaryModel("tank", true);
  const tracks = createTankTracks(tank.root);
  const point = new T.Vector3(),
    matrix = new T.Matrix4();
  const run = Array.from({ length: 65 }, (_, i) => {
    const phase = i / 64,
      pose = rig.pose("run", phase);
    let min = Infinity;
    rig.parts.forEach((part, j) => {
      if (part.key !== "boot") return;
      matrix.fromArray(pose[j]);
      const a = part.geometry.attributes.position;
      for (let n = 0; n < a.count; n++) {
        point.fromBufferAttribute(a, n).applyMatrix4(matrix);
        min = Math.min(min, point.y);
      }
    });
    const lift = runFlight(phase) - (Number.isFinite(min) ? min : 0);
    pose.forEach((p) => (p[13] += lift));
    return pose;
  });
  const aimed = rig.pose("aim", 0.9);
  const covered = {
    partial: rig.pose("aim", 0.9, 0, 0.7, 0),
    full: rig.pose("aim", 0.9, 0, 0.25, 0.35),
  };
  const trial = createCityUnitTrial(tactics),
    objects = new Map<number, T.Group>(),
    rings = new Map<number, T.Mesh>();
  const bodyMaterial = new T.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.9,
  });
  const ringGeometry = new T.RingGeometry(0.55, 0.68, 24).rotateX(-Math.PI / 2);
  const idleRing = new T.MeshBasicMaterial({
    color: 0x72ded3,
    depthTest: false,
    transparent: true,
    opacity: 0.8,
    side: T.DoubleSide,
  });
  const selectedRing = new T.MeshBasicMaterial({
    color: 0xffdc69,
    depthTest: false,
    side: T.DoubleSide,
  });
  const layer = new T.Group();
  root.add(layer);
  const bagGeometry = new T.BoxGeometry(0.34, 0.14, 0.16),
    bagMaterial = new T.MeshStandardMaterial({ color: 0x938469, roughness: 1 });
  const bags = new T.InstancedMesh(bagGeometry, bagMaterial, 192),
    bagPose = new T.Object3D();
  for (let i = 0; i < 192; i++) {
    const row = Math.floor(i / 48),
      col = i % 12,
      side = Math.floor((i % 48) / 12);
    bagPose.position.set(
      CITY_TRIAL_SANDBAGS.x - 1.84 + col * 0.33 + (row % 2) * 0.05,
      tactics.height(CITY_TRIAL_SANDBAGS) + 0.19 + row * 0.13,
      CITY_TRIAL_SANDBAGS.z + (side - 1.5) * 0.16,
    );
    bagPose.updateMatrix();
    bags.setMatrixAt(i, bagPose.matrix);
  }
  bags.castShadow = true;
  layer.add(bags);
  for (const unit of trial.units) {
    const obj = new T.Group(),
      soldier = new T.Group();
    soldier.scale.setScalar(0.55);
    obj.add(soldier);
    if (unit.kind === "vehicle")
      soldier.add(unit.vehicleType === "jeep" ? jeep.root : tank.root);
    else
      for (const part of rig.parts) {
        const mesh = new T.Mesh(part.geometry, bodyMaterial);
        mesh.matrixAutoUpdate = false;
        mesh.castShadow = true;
        soldier.add(mesh);
      }
    const ring = new T.Mesh(ringGeometry, idleRing);
    ring.position.y = 0.1;
    ring.renderOrder = 22;
    obj.add(ring);
    if (unit.kind === "vehicle") ring.scale.setScalar(1.65);
    rings.set(unit.id, ring);
    objects.set(unit.id, obj);
    layer.add(obj);
  }
  const ghosts = new Map<
    number,
    { root: T.Group; material: T.MeshBasicMaterial }
  >();
  let previewRequest:
    { p: { x: number; z: number }; facing?: number } | undefined;
  let orderPreview: ReturnType<typeof trial.previewOrder> = [];
  for (const unit of trial.units) {
    const ghost = new T.Group(),
      material = new T.MeshBasicMaterial({
        color: 0x9dcbd3,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        depthTest: false,
      });
    if (unit.kind === "vehicle") {
      const body = (unit.vehicleType === "jeep" ? jeep.root : tank.root).clone(
        true,
      );
      body.scale.setScalar(0.55);
      body.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.material = material;
          o.castShadow = false;
        }
      });
      ghost.add(body);
    } else {
      const body = new T.Group();
      body.scale.setScalar(0.55);
      for (const part of rig.parts) {
        const mesh = new T.Mesh(part.geometry, material);
        mesh.matrixAutoUpdate = false;
        body.add(mesh);
      }
      ghost.add(body);
    }
    const ring = new T.Mesh(ringGeometry, material);
    ring.position.y = 0.1;
    ring.renderOrder = 23;
    ghost.add(ring);
    ghost.visible = false;
    layer.add(ghost);
    ghosts.set(unit.id, { root: ghost, material });
  }
  function previewAt(p: { x: number; z: number }, facing?: number) {
    previewRequest = { p: { ...p }, facing };
    orderPreview = trial.previewOrder(p, facing);
    for (const g of ghosts.values()) g.root.visible = false;
    for (const proposed of orderPreview) {
      const g = ghosts.get(proposed.id)!;
      g.root.visible = true;
      g.root.position.set(
        proposed.x,
        tactics.surfaceHeight(proposed),
        proposed.z,
      );
      g.root.rotation.y = proposed.angle;
      g.material.color.set(
        proposed.valid
          ? proposed.cover === "full"
            ? 0x75e299
            : proposed.cover === "partial"
              ? 0xffd16c
              : 0xa4cddd
          : 0xff6655,
      );
      if (proposed.kind === "infantry") {
        const pose =
          proposed.cover === "none" ? aimed : covered[proposed.cover];
        g.root.children[0].children.forEach((o, i) =>
          o.matrix.fromArray(pose[i]),
        );
      }
    }
  }
  function clearPreview() {
    previewRequest = undefined;
    orderPreview = [];
    for (const g of ghosts.values()) g.root.visible = false;
  }
  let pathLine: T.Line | undefined;
  const clearPath = () => {
    if (pathLine) {
      layer.remove(pathLine);
      pathLine.geometry.dispose();
      (pathLine.material as T.Material).dispose();
      pathLine = undefined;
    }
  };
  function drawPath() {
    clearPath();
    const active = trial.units.filter(
      (u) => trial.selectedIds().includes(u.id) && u.path.length,
    );
    if (!active.length) return;
    const points = active.flatMap((u) =>
      [u, ...u.guide.slice(1)].flatMap((p, i, ps) => (i ? [ps[i - 1], p] : [])),
    );
    const g = new T.BufferGeometry().setFromPoints(
      points.map(
        (p) => new T.Vector3(p.x, tactics.surfaceHeight(p) + 0.1, p.z),
      ),
    );
    pathLine = new T.LineSegments(
      g,
      new T.LineBasicMaterial({ color: 0xffdc69, depthTest: false }),
    );
    pathLine.renderOrder = 21;
    layer.add(pathLine);
  }
  const raycaster = new T.Raycaster(),
    mouse = new T.Vector2();
  function screen(p: { x: number; z: number }, above = 0) {
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const v = root
        .localToWorld(new T.Vector3(p.x, tactics.height(p) + above, p.z))
        .project(camera),
      rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + ((v.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - v.y) / 2) * rect.height,
    };
  }
  function ground(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    mouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(mouse, camera);
    root.updateMatrixWorld(true);
    const ray = raycaster.ray
        .clone()
        .applyMatrix4(root.matrixWorld.clone().invert()),
      p = new T.Vector3();
    // Intersect the height field in local city coordinates (including world-river bearing).
    let y = 2;
    for (let i = 0; i < 8; i++) {
      if (!ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -y), p))
        return;
      y = tactics.surfaceHeight({ x: p.x, z: p.z });
    }
    return { x: p.x, z: p.z };
  }
  const marquee = document.createElement("div");
  Object.assign(marquee.style, {
    position: "fixed",
    pointerEvents: "none",
    border: "1px solid #ffdc69",
    background: "rgba(255,220,105,.12)",
    display: "none",
    zIndex: "1000",
  });
  document.body.append(marquee);
  let down:
    | { x: number; y: number; button: number; dragged: boolean; shift: boolean }
    | undefined;
  const onDown = (e: PointerEvent) => {
    down = {
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      dragged: false,
      shift: e.shiftKey,
    };
    if (e.button === 0) {
      e.stopImmediatePropagation();
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5)
      down.dragged = true;
    if (down.button !== 0) return;
    e.stopImmediatePropagation();
    if (down.dragged)
      Object.assign(marquee.style, {
        display: "block",
        left: `${Math.min(down.x, e.clientX)}px`,
        top: `${Math.min(down.y, e.clientY)}px`,
        width: `${Math.abs(e.clientX - down.x)}px`,
        height: `${Math.abs(e.clientY - down.y)}px`,
      });
  };
  const onUp = (e: PointerEvent) => {
    const start = down;
    down = undefined;
    marquee.style.display = "none";
    if (!start) return;
    if (start.button === 0) {
      e.stopImmediatePropagation();
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      if (start.dragged) {
        const ids = trial.units
          .filter((u) => {
            const p = screen(u, 0.5);
            return (
              p.x >= Math.min(start.x, e.clientX) &&
              p.x <= Math.max(start.x, e.clientX) &&
              p.y >= Math.min(start.y, e.clientY) &&
              p.y <= Math.max(start.y, e.clientY)
            );
          })
          .map((u) => u.id);
        trial.selectMany(ids, start.shift);
      } else {
        const hit = trial.units
          .map((u) => ({ u, p: screen(u, 0.5) }))
          .map(({ u, p }) => ({
            u,
            d: Math.hypot(p.x - e.clientX, p.y - e.clientY),
          }))
          .filter((v) => v.d < 18)
          .sort((a, b) => a.d - b.d)[0];
        trial.selectMany(hit ? [hit.u.id] : [], start.shift);
      }
      drawPath();
    } else if (start.button === 2 && !start.dragged) {
      const p = ground(e);
      if (p) {
        trial.order(p);
        drawPath();
      }
    }
  };
  const onCancel = () => {
    down = undefined;
    marquee.style.display = "none";
  };
  const onKey = (e: KeyboardEvent) => {
    if (
      e.key === "Escape" &&
      !(
        e.target instanceof HTMLElement &&
        e.target.closest("input,textarea,select")
      )
    ) {
      trial.select();
      clearPath();
    }
  };
  canvas.addEventListener("pointerdown", onDown, true);
  canvas.addEventListener("pointerup", onUp, true);
  canvas.addEventListener("pointermove", onMove, true);
  canvas.addEventListener("pointercancel", onCancel);
  window.addEventListener("keydown", onKey);
  window.addEventListener("blur", onCancel);
  function update(dt: number) {
    trial.tick(dt);
    if (previewRequest) previewAt(previewRequest.p, previewRequest.facing);
    const selected = trial.selectedIds();
    for (const u of trial.units) {
      const obj = objects.get(u.id)!;
      obj.position.set(u.x, tactics.surfaceHeight(u), u.z);
      obj.rotation.y = u.angle;
      if (u.kind === "vehicle") {
        if (u.vehicleType !== "jeep") tracks.update(u.leftTrack, u.rightTrack);
        rings.get(u.id)!.material = selected.includes(u.id)
          ? selectedRing
          : idleRing;
        continue;
      }
      const phase = (u.distance / CITY_RUN_STRIDE) * Math.PI * 2;
      const amount = Math.min(1, u.speed / 0.6);
      const body = obj.children[0];
      body.position.y = 0.035 * (1 - Math.cos(phase * 2)) * 0.5 * amount;
      body.rotation.z = 0.025 * Math.sin(phase) * amount;
      const frame = ((u.distance / CITY_RUN_STRIDE) % 1) * 64,
        first = Math.floor(frame),
        fraction = frame - first;
      const blend = u.moving ? 1 : Math.min(1, u.speed / 0.6);
      obj.children[0].children.forEach((part, i) => {
        const a = run[first][i],
          b = run[first + 1][i],
          idle =
            u.cover === "none"
              ? u.facing === undefined
                ? rig.walk[0][i]
                : aimed[i]
              : covered[u.cover][i];
        for (let j = 0; j < 16; j++)
          part.matrix.elements[j] =
            (a[j] + (b[j] - a[j]) * fraction) * blend + idle[j] * (1 - blend);
      });
      rings.get(u.id)!.material = selected.includes(u.id)
        ? selectedRing
        : idleRing;
    }
    if (
      pathLine &&
      !trial.units.some((u) => selected.includes(u.id) && u.moving)
    )
      clearPath();
  }
  update(0);
  return {
    update,
    previewAt,
    clearPreview,
    previewState: () => orderPreview.map((p) => ({ ...p })),
    orderAt(p: { x: number; z: number }, facing?: number) {
      trial.order(p, facing);
      drawPath();
    },
    orderScreen(e: PointerEvent) {
      const p = ground(e);
      if (p) {
        trial.order(p);
        drawPath();
      }
    },
    state: () => trial.state(),
    testFire: trial.testFire,
    resetHealth: trial.resetHealth,
    screen: (id: number) => {
      const u = trial.units.find((u) => u.id === id);
      return u ? screen(u, 0.5) : undefined;
    },
    project: screen,
    select: (id: number) => {
      trial.select(id);
      drawPath();
      const unit = trial.units.find((u) => u.id === id);
      if (unit) focus(unit);
    },
    stop: () => {
      trial.stop();
      clearPath();
    },
    dispose: () => {
      canvas.removeEventListener("pointerdown", onDown, true);
      canvas.removeEventListener("pointerup", onUp, true);
      canvas.removeEventListener("pointermove", onMove, true);
      marquee.remove();
      canvas.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onCancel);
      clearPath();
      root.remove(layer);
      ringGeometry.dispose();
      idleRing.dispose();
      selectedRing.dispose();
      bodyMaterial.dispose();
      tracks.dispose();
      for (const g of ghosts.values()) {
        g.root.traverse((o) => {
          if (o instanceof T.InstancedMesh) o.dispose();
        });
        g.material.dispose();
      }
      tank.dispose();
      jeep.root.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      bags.dispose();
      bagGeometry.dispose();
      bagMaterial.dispose();
    },
  };
}
