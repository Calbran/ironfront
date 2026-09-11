import {
  advanceSlice,
  type SliceState,
} from "../../../../packages/game-core/src/countrySlice";
/** Presentation only: play the latest approved route, never invent or send a position. */
export function sampleSliceMotion(snapshot: SliceState, elapsedMs: number) {
  const frame = structuredClone(snapshot);
  advanceSlice(frame, snapshot.time + Math.max(0, Math.min(2000, elapsedMs)));
  return frame;
}
