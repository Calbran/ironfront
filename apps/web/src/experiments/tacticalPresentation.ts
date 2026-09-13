import { tacticalTankKick } from "./tacticalTankAnimation";
import * as T from "three";
import type { bakeInfantry } from "../infantryModel";
import { createCityBattleAudio } from "../audio/cityBattleAudio";
import { createTacticalBattleEffects } from "./tacticalBattleEffects";
import {
  createTacticalInfantryAnimation,
  type TacticalUnitPose,
} from "./tacticalUnitAnimation";
import { createTankTracks } from "../prototypes/tankTracks";
import type { CityShot } from "../../../../packages/game-core/src/cityBattle";
import type { CitySoundCue } from "../../../../packages/game-core/src/cityHearing";

export type PresentedUnit = TacticalUnitPose & {
  x: number;
  z: number;
  friendly?: boolean;
  visible?: boolean;
  vehicleType?: string;
  turretAngle?: number;
  leftTrack?: number;
  rightTrack?: number;
};
/** All live tactical scenes provide poses and authorized events to this owner.
 * Models use a world-positioned wrapper with the scaled body as child zero.
 * Simulation, selection, camera controls and visibility authority stay in adapters.
 */
export function createTacticalPresentation(
  root: T.Object3D,
  getCamera: () => T.Camera,
  canvas: HTMLCanvasElement,
  rig: ReturnType<typeof bakeInfantry>,
  height: (p: { x: number; z: number }) => number,
  objects: Map<number, T.Group>,
  overlayRoot: HTMLElement,
) {
  const animation = createTacticalInfantryAnimation(rig);
  const effects = createTacticalBattleEffects(
    root,
    height,
    objects,
    rig.parts.findIndex((p) => p.key === "rifle"),
  );
  const audio = createCityBattleAudio(
    root,
    getCamera,
    canvas,
    overlayRoot,
    height,
  );
  const tanks = new Map<
    number,
    {
      tracks: ReturnType<typeof createTankTracks>;
      turret: T.Object3D;
      barrel: T.Object3D;
    }
  >();
  let previousTime: number | undefined;
  function reset() {
    animation.reset();
    effects.reset();
    audio.reset();
    previousTime = undefined;
  }
  return {
    reset,
    update(
      time: number,
      running: boolean,
      units: readonly PresentedUnit[],
      shots: readonly CityShot[],
      sounds: readonly CitySoundCue[] = [],
    ) {
      if (previousTime !== undefined && time < previousTime) reset();
      previousTime = time;
      audio.update(time, running, units, shots, sounds);
      effects.update(time, running, shots);
      // Idle breathing follows the visible frame clock, independent of paused combat.
      const cosmeticTime = performance.now() / 1000;
      for (const u of units) {
        const object = objects.get(u.id);
        if (!object || u.visible === false) continue;
        // Parent groups may have translated origins (country squads); poses are root-local.
        const p = new T.Vector3(u.x, height(u), u.z);
        root.localToWorld(p);
        object.parent?.worldToLocal(p);
        object.position.copy(p);
        object.rotation.y = u.angle;
        if (u.kind === "infantry")
          animation.update(
            object,
            u,
            time,
            effects.firedAt.get(u.id),
            cosmeticTime,
          );
        else if (u.kind === "vehicle" && u.vehicleType !== "jeep") {
          let tank = tanks.get(u.id);
          if (!tank) {
            const turret = object.getObjectByName("turret_yaw"),
              barrel = object.getObjectByName("barrel_recoil");
            if (!turret || !barrel) continue;
            tank = {
              turret,
              barrel,
              tracks: createTankTracks(object.children[0]),
            };
            tanks.set(u.id, tank);
          }
          tank.tracks.update(
            u.leftTrack ?? u.distance / 0.55 - u.angle * 1.3,
            u.rightTrack ?? u.distance / 0.55 + u.angle * 1.3,
          );
          tank.turret.rotation.y = (u.turretAngle ?? u.angle) - u.angle;
          const age = time - (effects.firedAt.get(u.id) ?? -100);
          const kick = tacticalTankKick(age);
          tank.barrel.position.z = kick.barrel;
          object.children[0].rotation.x = kick.hull;
        }
      }
    },
    dispose() {
      audio.dispose();
      effects.dispose();
      for (const t of tanks.values()) t.tracks.dispose();
      tanks.clear();
    },
  };
}
