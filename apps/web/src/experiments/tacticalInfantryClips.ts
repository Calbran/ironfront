import * as T from "three";
import type { bakeInfantry } from "../infantryModel";
import { runFlight } from "../prototypes/animationTimeline";
const cache = new WeakMap<ReturnType<typeof bakeInfantry>, Float32Array[][]>();
/** Foot-planted, distance-driven run poses shared by play and animation reviews. */
export function tacticalRunCycle(rig: ReturnType<typeof bakeInfantry>) {
  const previous = cache.get(rig);
  if (previous) return previous;
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
  cache.set(rig, run);
  return run;
}
export function tacticalRunSample(run: Float32Array[][], phase: number) {
  const f = (((phase % 1) + 1) % 1) * 64,
    i = Math.floor(f),
    t = f - i;
  return run[i].map((a, j) =>
    Float32Array.from(a, (v, k) => v + (run[i + 1][j][k] - v) * t),
  );
}
