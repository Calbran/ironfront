import { createTacticalPresentation } from "./tacticalPresentation";
import {
  tacticalPreviewColor,
  tacticalPreviewPose,
} from "./tacticalPreviewStyle";
import { cityBuildTools } from "./cityBuildTools";
import { cityAwarenessOverlay } from "./cityAwarenessOverlay";
import {
  CITY_CRATER_LIMIT,
  CITY_CRATER_SECONDS,
} from "../../../../packages/game-core/src/cityBallistics";
import { tracerSegment } from "./battlePresentation";
import { remoteCityBattle } from "./remoteCityBattle";
import type { TerrainProfile } from "../../../../packages/game-core/src/combinedDistrict";
import { createJeep } from "../prototypes/jeepModel";
import { cityUnitMarkers } from "./cityUnitMarkers";
import { cityIdleMotion } from "./cityIdleMotion";
import { tacticalSelection } from "./tacticalSelection";
import {
  projectedObjectHitTarget,
  TACTICAL_INFANTRY_HIT_RADIUS,
  TACTICAL_TANK_HIT_PADDING,
  TACTICAL_TANK_MIN_HIT_RADIUS,
} from "./tacticalSelectionBounds";
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
  getCamera: () => T.Camera,
  canvas: HTMLCanvasElement,
  rig: ReturnType<typeof bakeInfantry>,
  tactics: ReturnType<typeof createCityTactics>,
  config: { seed: number; profile: TerrainProfile },
  overlayRoot: HTMLElement,
  focus: (p: { x: number; z: number }) => void,
) {
  const jeep = createJeep();
  const tank = createMilitaryModel("tank", true);
  const aimed = tacticalPreviewPose(rig, "none"),
    covered = {
      partial: tacticalPreviewPose(rig, "partial"),
      full: tacticalPreviewPose(rig, "full"),
    };
  const trial = remoteCityBattle(tactics, {
      ...config,
      multipleBattles:
        new URLSearchParams(location.search).get("battles") === "multiple",
    }),
    objects = new Map<number, T.Group>(),
    rings = new Map<number, T.Mesh>();
  const battleSites = document.createElement("div");
  battleSites.style.cssText =
    "position:absolute;bottom:78px;left:16px;display:flex;gap:6px;z-index:20";
  const multiple =
    new URLSearchParams(location.search).get("battles") === "multiple";
  const switchBattle = document.createElement("button");
  switchBattle.textContent = multiple
    ? "Restage firefights"
    : "Stage multiple firefights";
  switchBattle.onclick = () => {
    const url = new URL(location.href);
    url.searchParams.set("battles", "multiple");
    location.assign(url.href);
  };
  battleSites.append(switchBattle);
  if (multiple)
    for (const [label, id] of [
      ["Main squad", 1],
      ["West firefight", 210],
      ["East firefight", 220],
    ] as const) {
      const unit = trial.units.find((u) => u.id === id);
      if (!unit) continue;
      const button = document.createElement("button");
      button.textContent = label;
      button.onclick = () => focus(unit);
      battleSites.append(button);
    }
  overlayRoot.append(battleSites);
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
  const enemyRing = new T.MeshBasicMaterial({
    color: 0xf16b59,
    depthTest: false,
    side: T.DoubleSide,
  });
  const enemyBody = bodyMaterial.clone();
  enemyBody.color.set(0xda9588);
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
        const mesh = new T.Mesh(
          part.geometry,
          unit.friendly ? bodyMaterial : enemyBody,
        );
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
  let lastPreviewSolve = -Infinity;
  function previewAt(p: { x: number; z: number }, facing?: number) {
    previewRequest = { p: { ...p }, facing };
    const now = performance.now();
    if (now - lastPreviewSolve < 80) return;
    lastPreviewSolve = now;
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
        tacticalPreviewColor(proposed.valid, proposed.cover),
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
    lastPreviewSolve = -Infinity;
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
    const camera = getCamera();
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
    const camera = getCamera();
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
  const buildTools = cityBuildTools(
    canvas,
    layer,
    tactics,
    ground,
    trial.units,
    trial,
    overlayRoot,
  );
  const selectionControls = tacticalSelection(canvas, {
    units: () => {
      const viewport = canvas.getBoundingClientRect(),
        camera = getCamera();
      return trial.units.map((unit) => {
        const object = objects.get(unit.id)!;
        if (unit.kind === "vehicle" && object.visible)
          return projectedObjectHitTarget(
            unit.id,
            object,
            camera,
            viewport,
            unit.vehicleType === "tank" ? TACTICAL_TANK_MIN_HIT_RADIUS : 32,
            unit.vehicleType === "tank" ? TACTICAL_TANK_HIT_PADDING : 12,
          );
        return {
          id: unit.id,
          ...screen(unit, 0.5),
          radius: TACTICAL_INFANTRY_HIT_RADIUS,
          visible: unit.visible !== false,
        };
      });
    },
    box(ids, add) {
      trial.selectMany(ids, add);
      drawPath();
    },
    click(id, add) {
      const unit = trial.units.find((candidate) => candidate.id === id);
      if (unit?.friendly === false) trial.attack(unit.id);
      else trial.selectMany(unit ? [unit.id] : [], add);
      drawPath();
    },
    clear() {
      trial.select();
      clearPath();
    },
  });
  const awareness = cityAwarenessOverlay(canvas, layer, tactics, overlayRoot);
  const markers = cityUnitMarkers(
    canvas,
    trial.units,
    (id, add) => {
      if (trial.units.find((u) => u.id === id)?.friendly === false)
        trial.attack(id);
      else trial.selectMany([id], add);
      drawPath();
    },
    focus,
    overlayRoot,
  );
  const presentation = createTacticalPresentation(
    root,
    getCamera,
    canvas,
    rig,
    (p) => tactics.surfaceHeight(p),
    objects,
    overlayRoot,
  );
  let guideSignature = "";
  let idleTime = 0;
  function update(dt: number) {
    idleTime += dt;
    trial.tick(dt);
    const audioState = trial.state();
    presentation.update(
      idleTime,
      audioState.running,
      trial.units,
      audioState.shots,
      audioState.sounds,
    );
    if (previewRequest) previewAt(previewRequest.p, previewRequest.facing);
    const selected = trial.selectedIds();
    buildTools.sync(trial.state().sandbags, trial.state().message);
    const guides = JSON.stringify(
      trial.units.filter((u) => selected.includes(u.id)).map((u) => u.guide),
    );
    if (guides !== guideSignature) {
      guideSignature = guides;
      drawPath();
    }
    awareness.update(
      idleTime,
      trial.units,
      selected,
      trial.state().contacts,
      screen,
      getCamera(),
      root,
    );
    const iconIds = markers.update(
      getCamera(),
      root,
      (u) => tactics.surfaceHeight(u),
      selected,
    );
    for (const u of trial.units) {
      const obj = objects.get(u.id)!;
      obj.visible =
        !iconIds.has(u.id) &&
        u.visible !== false &&
        (u.health > 0 || u.kind === "infantry");
      rings.get(u.id)!.visible =
        !iconIds.has(u.id) && u.visible !== false && u.health > 0;
      if (u.visible === false) continue;
      rings.get(u.id)!.material = selected.includes(u.id)
        ? selectedRing
        : u.friendly
          ? idleRing
          : enemyRing;
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
    toggleBattle: trial.toggle,
    selectSquad() {
      trial.selectMany(
        trial.units
          .filter((u) => u.friendly && u.health > 0 && u.kind === "infantry")
          .map((u) => u.id),
      );
      drawPath();
    },
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
      battleSites.remove();
      presentation.dispose();
      trial.dispose();
      buildTools.dispose();
      enemyRing.dispose();
      enemyBody.dispose();
      markers.dispose();
      awareness.dispose();
      selectionControls.dispose();
      clearPath();
      root.remove(layer);
      ringGeometry.dispose();
      idleRing.dispose();
      selectedRing.dispose();
      bodyMaterial.dispose();
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
