import {
  advanceSlice,
  projectSliceRemainders,
  type SliceState,
  type SlicePlan,
} from "../../../../packages/game-core/src/countrySlice";
/** Presentation only: play the latest approved route, never invent or send a position. */
export function sampleSliceMotion(
  snapshot: SliceState,
  elapsedMs: number,
  plan?: SlicePlan,
) {
  const frame = structuredClone(snapshot);
  const encounter = snapshot.encounter;
  // A battle snapshot's timestamp includes time not yet consumed by its 250 ms
  // movement batch. Project that remainder too, or every poll rewinds playback.
  if (encounter?.stage === "victory" || encounter?.stage === "defeat")
    return frame;
  const pendingMs =
    snapshot.running && snapshot.pace > 0
      ? (Math.min(0.25, (snapshot.battlefield ?? encounter)?.remainder ?? 0) * 1000) / snapshot.pace
      : 0;
  advanceSlice(
    frame,
    snapshot.time + pendingMs + Math.max(0, Math.min(2000, elapsedMs)),
    plan,
  );
  // The server keeps deterministic 50 ms movement steps. Render the remaining
  // fraction on the disposable frame without breaking a shared movement pace.
  if (frame.running) projectSliceRemainders(frame, plan);
  return frame;
}
