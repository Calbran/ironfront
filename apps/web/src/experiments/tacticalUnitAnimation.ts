import { tacticalRunCycle } from "./tacticalInfantryClips";
import * as T from "three";
import type { bakeInfantry } from "../infantryModel";
import { runFlight } from "../prototypes/animationTimeline";
import { CITY_RUN_STRIDE } from "../../../../packages/game-core/src/cityInfantryMotion";
import { cityIdleMotion } from "./cityIdleMotion";
import { tacticalPreviewPose } from "./tacticalPreviewStyle";
export type TacticalUnitPose = {
  id: number;
  kind: string;
  health: number;
  distance: number;
  speed: number;
  moving: boolean;
  angle: number;
  aimAngle?: number;
  facing?: number;
  firing?: boolean;
  reload?: number;
  cover: "none" | "partial" | "full";
};
/** Canonical locomotion, aimed torso, idle motion, recoil and three death variants. */
export function createTacticalInfantryAnimation(
  rig: ReturnType<typeof bakeInfantry>,
) {
  const corpseTimes = new Map<number, number>();
  const aimTwist = new T.Matrix4();
  const run = tacticalRunCycle(rig);
  const aimed = tacticalPreviewPose(rig, "none");
  const covered = {
    partial: tacticalPreviewPose(rig, "partial"),
    full: tacticalPreviewPose(rig, "full"),
  };

  const reloadClips = new Map<string, Float32Array[][]>();
  return {
    reset() {
      corpseTimes.clear();
    },
    update(
      obj: T.Group,
      u: TacticalUnitPose,
      idleTime: number,
      lastFire = -100,
      cosmeticTime = idleTime,
    ) {
      const firedAt = { get: (_id: number) => lastFire };
      if (u.health <= 0 && u.kind === "infantry") {
        if (!corpseTimes.has(u.id)) corpseTimes.set(u.id, idleTime);
        const age = idleTime - corpseTimes.get(u.id)!,
          variant = u.id % 3,
          t = Math.min(1, age / (0.9 + variant * 0.22)),
          fall = t * t * (3 - 2 * t);
        const body = obj.children[0];
        body.scale.setScalar(0.55);
        body.position.set(
          variant === 1 ? fall * 0.18 : 0,
          0.16 * fall,
          variant === 0 ? -0.12 * fall : 0.08 * fall,
        );
        body.rotation.set(
          variant === 1 ? 0 : (((variant === 0 ? -1 : 1) * Math.PI) / 2) * fall,
          0,
          variant === 1 ? (Math.PI / 2) * fall : Math.sin(t * Math.PI) * 0.14,
        );
        body.children.forEach((part, i) =>
          part.matrix.fromArray(
            (variant === 2 ? covered.full : covered.partial)[i],
          ),
        );
        body.children.forEach((p) => (p.matrixWorldNeedsUpdate = true));
        return;
      }

      corpseTimes.delete(u.id);
      const bodyReset = obj.children[0];
      bodyReset.position.set(0, 0, 0);
      bodyReset.rotation.set(0, 0, 0);
      bodyReset.scale.setScalar(0.55);
      const phase = (u.distance / CITY_RUN_STRIDE) * Math.PI * 2;
      const amount = Math.min(1, u.speed / 0.6);
      const body = obj.children[0];
      const idleMotion = cityIdleMotion(
        cosmeticTime,
        u.id,
        u.speed,
        u.moving,
        u.facing !== undefined,
        u.cover,
      );
      body.position.y = 0.035 * (1 - Math.cos(phase * 2)) * 0.5 * amount;
      body.rotation.z = 0.025 * Math.sin(phase) * amount;
      // Stretch from the planted feet rather than translating the whole soldier.
      body.scale.y = 0.55 * (1 + idleMotion.breath);
      body.rotation.z += idleMotion.sway;
      body.position.z =
        -Math.max(0, 0.1 - (idleTime - (firedAt.get(u.id) ?? -10))) * 0.3;
      const frame = ((((u.distance / CITY_RUN_STRIDE) % 1) + 1) % 1) * 64,
        first = Math.floor(frame),
        fraction = frame - first;
      const blend = u.moving ? 1 : Math.min(1, u.speed / 0.6);
      let reloadPose: Float32Array[] | undefined;
      if (u.reload !== undefined && u.reload >= 0) {
        let frames = reloadClips.get(u.cover);
        if (!frames) {
          frames = Array.from({ length: 17 }, (_, i) =>
            rig.pose(
              "aim",
              0.9,
              0,
              u.cover === "none" ? 0 : u.cover === "full" ? 0.25 : 0.7,
              u.cover === "full" ? 0.35 : 0,
              i / 16,
            ),
          );
          reloadClips.set(u.cover, frames);
        }
        const f = Math.min(16, Math.max(0, u.reload * 16)),
          lo = Math.floor(f),
          hi = Math.min(16, lo + 1);
        reloadPose = frames[lo].map((a, i) =>
          Float32Array.from(
            a,
            (v, j) => v + (frames![hi][i][j] - v) * (f - lo),
          ),
        );
      }
      const rocket = body.getObjectByName("reload_rocket");
      if (rocket) {
        const progress = u.reload ?? -1,
          lift = progress >= 0 ? Math.sin(Math.PI * progress) ** 2 : 0;
        rocket.position.set(0.86 + lift * 0.35, 0.14, 0);
        rocket.visible = progress < 0 || progress > 0.55;
      }
      obj.children[0].children.forEach((part, i) => {
        const a = run[first][i],
          b = run[first + 1][i],
          idle =
            u.cover === "none"
              ? u.facing === undefined
                ? rig.walk[0][i]
                : aimed[i]
              : covered[u.cover][i];
        const upper = !["hips", "thigh", "shin", "boot"].includes(
          rig.parts[i].key,
        );
        const movingFire = u.moving && u.firing && upper && !reloadPose;
        for (let j = 0; j < 16; j++)
          part.matrix.elements[j] =
            reloadPose && upper
              ? reloadPose[i][j]
              : movingFire
                ? aimed[i][j]
                : (a[j] + (b[j] - a[j]) * fraction) * blend +
                  idle[j] * (1 - blend);
        if (movingFire && u.aimAngle !== undefined) {
          aimTwist.makeRotationY(
            Math.atan2(
              Math.sin(u.aimAngle - u.angle),
              Math.cos(u.aimAngle - u.angle),
            ),
          );
          part.matrix.premultiply(aimTwist);
        }
      });

      obj.children[0].children.forEach(
        (p) => (p.matrixWorldNeedsUpdate = true),
      );
    },
  };
}
