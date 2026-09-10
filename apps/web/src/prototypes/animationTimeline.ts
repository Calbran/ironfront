export const REVIEW_DURATION = 24;
export const RUN_CYCLE_SECONDS = 0.8;
export const RUN_SPEED = 2.6;
export function runFlight(phase: number) {
  const half = ((phase % 0.5) + 0.5) % 0.5;
  return half > 0.4 ? 0.09 * Math.sin((Math.PI * (half - 0.4)) / 0.1) : 0;
}
export type SoldierClip =
  | "sequence"
  | "walk"
  | "run"
  | "aim"
  | "fire"
  | "reload"
  | "crouch"
  | "over"
  | "around"
  | "lean";
export function coverClip(
  clip: SoldierClip,
  cover: "low" | "tall" | "none",
): SoldierClip {
  if (cover === "low" && (clip === "around" || clip === "lean")) return "over";
  if (cover === "tall" && (clip === "over" || clip === "sequence"))
    return "lean";
  return clip;
}
export const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
export function recoilAt(time: number, interval = 0.7) {
  const age = ((time % interval) + interval) % interval;
  return age < 0.2 ? Math.sin((Math.PI * age) / 0.2) : 0;
}
/** Visual LMG tuning: eight rounds at 600 rpm, then a short burst pause. */
export function lmgFire(time: number, enabled: boolean) {
  const cycle = ((time % 1) + 1) % 1;
  const firing = enabled && cycle < 0.8;
  const age = ((time % 0.1) + 0.1) % 0.1;
  return {
    firing,
    age,
    recoil: firing && age < 0.075 ? Math.sin((Math.PI * age) / 0.075) : 0,
  };
}
/** Authored pose/translation keys. Absolute time keeps paused scrubbing reproducible. */
export function soldierReview(time: number, clip: SoldierClip = "sequence") {
  const t = ((time % REVIEW_DURATION) + REVIEW_DURATION) % REVIEW_DURATION;
  const pose = {
    mode: "aim" as "walk" | "run" | "aim",
    phase: 0.05,
    crouch: 0,
    lean: 0,
    reload: -1,
    x: 0,
    z: -1.2,
    yaw: 0,
    firing: false,
    recoil: 0,
    state: "Ready",
  };
  const walk = (run = false) => {
    pose.mode = run ? "run" : "walk";
    pose.phase = (time / (run ? RUN_CYCLE_SECONDS : 0.9)) % 1;
  };
  if (clip === "walk" || clip === "run") {
    walk(clip === "run");
    pose.z =
      (clip === "run" ? -12 : -7) +
      (time % 4) * (clip === "run" ? RUN_SPEED : 0.72);
    pose.state = clip === "run" ? "Run" : "Walk";
  } else if (clip === "reload") {
    pose.phase = 0.85;
    pose.reload = (t % 3) / 3;
    pose.state = "Reload / ready";
  } else if (clip === "aim" || clip === "fire") {
    pose.phase = smooth((t % 4) / 0.8) * 0.85;
    pose.firing = clip === "fire" && t % 4 > 1;
    pose.state = clip === "fire" ? "Aim / fire" : "Raise / aim";
  } else if (clip === "crouch") {
    pose.crouch = 0.86 * smooth((t % 4) / 0.7);
    pose.phase = 0.85;
    pose.state = "Crouch";
  } else if (clip !== "sequence") {
    const u = t % 6,
      exposure = smooth((u - 1) / 1) * (1 - smooth((u - 4) / 1));
    pose.phase = 0.85;
    pose.firing = u > 2.1 && u < 3.9;
    if (clip === "over") {
      pose.crouch = 0.86 * (1 - exposure);
      pose.state = "Rise / fire / duck";
    }
    if (clip === "around") {
      pose.x = 2.65 * exposure;
      pose.crouch = 0.86 * (1 - exposure);
      if ((u > 1 && u < 2) || (u > 4 && u < 5)) {
        walk();
        pose.yaw = u < 2 ? Math.PI / 2 : -Math.PI / 2;
      }
      pose.state = "Step out / fire / return";
    }
    if (clip === "lean") {
      const step = smooth(u / 0.8) * (1 - smooth((u - 5) / 1));
      pose.x = 2.05 * step;
      pose.lean = exposure;
      pose.crouch = 0.86 - 0.61 * step;
      if (u < 0.8 || u > 5) {
        walk();
        pose.yaw = u < 0.8 ? Math.PI / 2 : -Math.PI / 2;
      }
      pose.state = "Brace / lean out / return";
    }
    if (clip === "over" && u >= 4) {
      pose.reload = (u - 4) / 2;
      pose.state = "Duck / reload";
    }
  } else if (t < 4) {
    walk();
    pose.z = -4.08 + t * 0.72;
    pose.state = "Walk to cover";
  } else if (t < 6) {
    pose.crouch = 0.86 * smooth((t - 4) / 0.6);
    pose.state = "Crouch behind cover";
  } else if (t < 10) {
    const e = smooth((t - 6) / 0.7) * (1 - smooth((t - 9) / 0.7));
    pose.crouch = 0.86 * (1 - e);
    pose.phase = 0.85;
    pose.firing = t > 7 && t < 8.8;
    pose.state = "Rise / fire / duck";
    if (t >= 8.8) {
      pose.reload = (t - 8.8) / 1.2;
      pose.state = "Duck / reload";
    }
  } else if (t < 16) {
    return soldierReview(t - 10, "over");
  } else if (t < 22) {
    return soldierReview(t - 16, "over");
  } else {
    walk(true);
    pose.z = -1.2 - (t - 22) * RUN_SPEED;
    pose.crouch = 0.86 * (1 - smooth((t - 22) / 0.35));
    pose.yaw = Math.PI;
    pose.state = "Run back";
  }
  pose.recoil = pose.firing ? recoilAt(time) : 0;
  return pose;
}
export function tankReview(time: number) {
  const t = ((time % 12) + 12) % 12;
  const shot = [4, 5.4, 6.8].filter((at) => at <= t).at(-1);
  const shotAge = shot === undefined ? Infinity : t - shot;
  const recoil =
    smooth(shotAge / 0.045) * (1 - smooth((shotAge - 0.045) / 0.5));
  const kick = smooth(shotAge / 0.07) * (1 - smooth((shotAge - 0.07) / 0.4));
  const travel =
    t < 3 ? t * 0.65 : t < 8 ? 1.95 : t < 11 ? 1.95 - (t - 8) * 0.65 : 0;
  return {
    travel,
    turret: 0.45 * smooth((t - 3) / 1) - 0.45 * smooth((t - 7) / 1),
    recoil,
    kick,
    shotAge,
    flash: shotAge < 0.12 ? Math.sin((Math.PI * shotAge) / 0.12) : 0,
    firing: t > 4 && t < 7,
    state:
      t < 3
        ? "Advance"
        : t < 4
          ? "Traverse"
          : t < 7
            ? "Fire / recoil"
            : t < 8
              ? "Recover"
              : t < 11
                ? "Reverse"
                : "Halt",
  };
}
