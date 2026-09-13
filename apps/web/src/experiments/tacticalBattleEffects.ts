import * as T from "three";
import type { CityShot } from "../../../../packages/game-core/src/cityBattle";
import {
  CITY_CRATER_LIMIT,
  CITY_CRATER_SECONDS,
} from "../../../../packages/game-core/src/cityBallistics";
import {
  tacticalShotBatchDelays,
  tacticalShotDelay,
  tracerSegment,
} from "./battlePresentation";
export function createTacticalBattleEffects(
  root: T.Object3D,
  surfaceHeight: (p: { x: number; z: number }) => number,
  objects: Map<number, T.Group>,
  riflePartIndex: number,
  socketFor?: (id: number) => T.Object3D | undefined,
) {
  const layer = new T.Group();
  root.add(layer);
  const tracerGeometry = new T.BufferGeometry();
  const tracerPositions = new Float32Array(128 * 6);
  tracerGeometry.setAttribute(
    "position",
    new T.BufferAttribute(tracerPositions, 3),
  );
  const tracerMaterial = new T.LineBasicMaterial({ color: 0xffd48a });
  const tracers = new T.LineSegments(tracerGeometry, tracerMaterial);
  tracers.name = "tactical-tracers";
  tracers.frustumCulled = false;
  layer.add(tracers);
  const flashGeometry = new T.SphereGeometry(1, 6, 4),
    flashMaterial = new T.MeshBasicMaterial({ color: 0xffcb75 });
  const muzzlePoint = new T.Vector3();
  const flashes = new T.InstancedMesh(flashGeometry, flashMaterial, 128),
    flashPose = new T.Object3D();
  flashes.name = "tactical-muzzle-flashes";
  flashes.frustumCulled = false;
  layer.add(flashes);
  const dustGeometry = new T.SphereGeometry(1, 7, 4),
    dustMaterial = new T.MeshBasicMaterial({
      color: 0x9c8b70,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
  const dust = new T.InstancedMesh(dustGeometry, dustMaterial, 768);
  dust.frustumCulled = false;
  layer.add(dust);
  const shellGeometry = new T.SphereGeometry(1, 8, 5),
    shellMaterial = new T.MeshBasicMaterial({ color: 0xbfb49b });
  const shells = new T.InstancedMesh(shellGeometry, shellMaterial, 128);
  shells.frustumCulled = false;
  layer.add(shells);
  const craterGeometry = new T.CircleGeometry(1, 13).rotateX(-Math.PI / 2),
    rimGeometry = new T.RingGeometry(0.78, 1, 13).rotateX(-Math.PI / 2);
  const craterMaterial = new T.MeshBasicMaterial({
      color: 0x302b25,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    rimMaterial = new T.MeshBasicMaterial({
      color: 0x75644c,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
  const craters = new T.InstancedMesh(
      craterGeometry,
      craterMaterial,
      CITY_CRATER_LIMIT,
    ),
    rims = new T.InstancedMesh(rimGeometry, rimMaterial, CITY_CRATER_LIMIT);
  craters.name = "tactical-craters";
  craters.frustumCulled = false;
  rims.frustumCulled = false;
  layer.add(craters, rims);
  const scars: { x: number; z: number; born: number; size: number }[] = [];
  const firedAt = new Map<number, number>();
  let lastShot = 0;
  const effects: {
    shot: CityShot;
    start: number;
    until: number;
    fired: boolean;
  }[] = [];

  let primed = false,
    idleTime = 0;
  return {
    firedAt,
    reset() {
      primed = false;
      lastShot = 0;
      effects.length = 0;
      scars.length = 0;
      firedAt.clear();
    },
    update(time: number, running: boolean, shots: readonly CityShot[]) {
      idleTime = time;
      if (!primed) {
        lastShot = Math.max(0, ...shots.map((s) => s.id));
        primed = true;
      }
      if (!running || (typeof document !== "undefined" && document.hidden)) {
        lastShot = Math.max(lastShot, ...shots.map((s) => s.id));
        effects.length = 0;
      }
      const fresh = [...shots]
          .filter((shot) => shot.id > lastShot)
          .sort((a, b) => a.id - b.id),
        batchDelays = tacticalShotBatchDelays(fresh);
      fresh.forEach((shot, index) => {
        lastShot = Math.max(lastShot, shot.id);
        const start =
          idleTime +
          batchDelays[index] +
          (shot.impact ? 0 : tacticalShotDelay(shot.id, shot.from));
        const duration = shot.impact
          ? 1.1
          : shot.shell
            ? 0.7
            : Math.max(
                0.06,
                Math.hypot(shot.tx - shot.x, shot.tz - shot.z) / 120,
              );
        effects.push({ shot, start, until: start + duration, fired: false });
      });
      for (let i = effects.length - 1; i >= 0; i--)
        if (effects[i].until < idleTime) effects.splice(i, 1);
      if (effects.length > 128) effects.splice(0, effects.length - 128);
      let n = 0,
        flashCount = 0,
        dustCount = 0,
        shellCount = 0;
      for (const effect of effects) {
        const { shot, start } = effect,
          age = idleTime - start;
        if (age < 0) continue;
        if (!effect.fired) {
          effect.fired = true;
          if (!shot.impact) firedAt.set(shot.from, start);
          else {
            scars.push({
              x: shot.tx,
              z: shot.tz,
              born: start,
              size: 0.65 + (shot.id % 5) * 0.045,
            });
            if (scars.length > CITY_CRATER_LIMIT) scars.shift();
          }
        }
        const dx = shot.tx - shot.x,
          dz = shot.tz - shot.z,
          length = Math.hypot(dx, dz) || 1;
        const muzzleX = shot.x + (dx / length) * (shot.shell ? 1.65 : 0.48),
          muzzleZ = shot.z + (dz / length) * (shot.shell ? 1.65 : 0.48);
        if (!shot.impact) {
          muzzlePoint.set(
            muzzleX,
            surfaceHeight({ x: muzzleX, z: muzzleZ }) +
              (shot.shell ? 1.24 : 0.65),
            muzzleZ,
          );
          const socket =
            socketFor?.(shot.from) ??
            objects.get(shot.from)?.getObjectByName("tactical_muzzle");
          if (socket) {
            socket.getWorldPosition(muzzlePoint);
            root.worldToLocal(muzzlePoint);
          } else if (!shot.shell && riflePartIndex >= 0) {
            const gun = objects.get(shot.from)?.children[0]?.children[
              riflePartIndex
            ];
            if (gun) {
              gun.updateWorldMatrix(true, false);
              muzzlePoint.set(0.65, 0.07, 0);
              gun.localToWorld(muzzlePoint);
              root.worldToLocal(muzzlePoint);
            }
          }
        }
        if (!shot.impact && age < (shot.shell ? 0.09 : 0.085)) {
          flashPose.position.copy(muzzlePoint);
          const size = shot.impact
            ? 0.55
            : shot.shell
              ? 0.48 * (1 - age / 0.1)
              : 0.085 * (1 - age / 0.11);
          flashPose.scale.set(
            size,
            shot.shell ? size * 0.65 : size,
            shot.shell ? size * 1.7 : size * 2.4,
          );
          flashPose.rotation.y = Math.atan2(dx, dz);
          flashPose.updateMatrix();
          flashes.setMatrixAt(flashCount++, flashPose.matrix);
        }
        if ((shot.shell || shot.impact) && age < (shot.impact ? 1.1 : 0.65))
          for (let k = 0; k < (shot.impact ? 6 : 2); k++) {
            const x = shot.impact ? shot.tx : muzzleX,
              z = shot.impact ? shot.tz : muzzleZ,
              r = 0.2 + age * 2.8;
            flashPose.position.set(
              x +
                (shot.impact
                  ? Math.cos((k * Math.PI) / 3) * age * 1.8
                  : (((k ? 1 : -1) * dz) / length) * age * 1.7),
              surfaceHeight({ x, z }) + 0.12 + age * (shot.impact ? 0.7 : 0.2),
              z +
                (shot.impact
                  ? Math.sin((k * Math.PI) / 3) * age * 1.8
                  : ((-(k ? 1 : -1) * dx) / length) * age * 1.7),
            );
            flashPose.rotation.set(0, 0, 0);
            flashPose.scale.set(
              r * (shot.impact ? 0.55 : 1),
              0.1 + age * (shot.impact ? 0.65 : 0.3),
              r * (shot.impact ? 0.55 : 0.7),
            );
            flashPose.updateMatrix();
            dust.setMatrixAt(dustCount++, flashPose.matrix);
          }
        if (shot.impact) continue;
        const distance = Math.hypot(shot.tx - shot.x, shot.tz - shot.z),
          segment = tracerSegment(distance, age, shot.shell);
        if (!segment) continue;
        const ty = surfaceHeight({ x: shot.tx, z: shot.tz }) + 0.5;
        const at = (t: number) => [
          muzzlePoint.x + (shot.tx - muzzlePoint.x) * t,
          muzzlePoint.y + (ty - muzzlePoint.y) * t,
          muzzlePoint.z + (shot.tz - muzzlePoint.z) * t,
        ];
        tracerPositions.set(
          [...at(segment.tail), ...at(segment.head)],
          n++ * 6,
        );
        if (shot.shell) {
          const t = segment.head,
            position = at(t);
          flashPose.position.set(position[0], position[1], position[2]);
          flashPose.rotation.set(0, Math.atan2(dx, dz), 0);
          flashPose.scale.set(0.1, 0.1, 0.25);
          flashPose.updateMatrix();
          shells.setMatrixAt(shellCount++, flashPose.matrix);
        }
      }
      while (scars.length && idleTime - scars[0].born > CITY_CRATER_SECONDS)
        scars.shift();
      scars.forEach((scar, i) => {
        const remaining = CITY_CRATER_SECONDS - (idleTime - scar.born),
          fade = Math.min(1, remaining / 15);
        flashPose.position.set(scar.x, surfaceHeight(scar) + 0.018, scar.z);
        flashPose.rotation.set(0, i * 2.4, 0);
        flashPose.scale.set(scar.size * fade, 1, scar.size * 0.82 * fade);
        flashPose.updateMatrix();
        craters.setMatrixAt(i, flashPose.matrix);
        flashPose.position.y += 0.012;
        flashPose.scale.multiplyScalar(1.2);
        flashPose.updateMatrix();
        rims.setMatrixAt(i, flashPose.matrix);
      });
      craters.count = rims.count = scars.length;
      craters.instanceMatrix.needsUpdate = true;
      rims.instanceMatrix.needsUpdate = true;
      shells.count = shellCount;
      shells.instanceMatrix.needsUpdate = true;
      dust.count = dustCount;
      dust.instanceMatrix.needsUpdate = true;
      flashes.count = flashCount;
      flashes.instanceMatrix.needsUpdate = true;
      tracerGeometry.setDrawRange(0, n * 2);
      tracerGeometry.attributes.position.needsUpdate = true;
    },
    dispose() {
      root.remove(layer);
      shells.dispose();
      shellGeometry.dispose();
      shellMaterial.dispose();
      craters.dispose();
      rims.dispose();
      craterGeometry.dispose();
      rimGeometry.dispose();
      craterMaterial.dispose();
      rimMaterial.dispose();
      dust.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      flashes.dispose();
      flashGeometry.dispose();
      flashMaterial.dispose();
      tracerGeometry.dispose();
      tracerMaterial.dispose();
    },
  };
}
