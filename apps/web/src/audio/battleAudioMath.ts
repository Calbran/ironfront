import type { BattleSound } from "./battleSoundSynthesis";
export type AudioPoint = { x: number; y: number; z: number };
export type CameraEars = AudioPoint & { rightX: number; rightZ: number };
export const AUDIO_VOICE_LIMIT = 32;
/** Independent hashed variations avoid a repeating modulo sequence across volleys. */
export function battleShotVariation(id: number, kind: BattleSound) {
  const random = (salt: number) => {
    let n = Math.imul((id | 0) ^ salt, 0x45d9f3b);
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  return { variant: Math.floor(random(17) * 4),
    rate: kind === "rifle" ? 1.06 + random(79) * .18 : .96 + (Math.abs(id * 37) % 9) / 100,
    strength: kind === "rifle" ? .88 + random(157) * .24 : 1 };
}
export function spatialBattleMix(
  source: AudioPoint,
  ears: CameraEars,
  kind: BattleSound,
) {
  const dx = source.x - ears.x,
    dy = source.y - ears.y,
    dz = source.z - ears.z,
    // Elevated commanders hear rifles from a stand-off perspective, even at close zoom.
    distance = kind === "rifle" ? Math.hypot(dx, dy, dz, 65) : Math.hypot(dx, dy, dz),
    horizontal = Math.hypot(dx, dz);
  const range =
    kind === "step"
      ? 42
      : kind === "engine" || kind === "tracks"
        ? 150
        : kind === "rifle"
          ? 2800
          : 5600;
  const gain =
    distance >= range
      ? 0
      : Math.pow(
          1 +
            distance /
              (kind === "step"
                ? 5
                : kind === "engine" || kind === "tracks"
                  ? 12
                  : 24),
          kind === "rifle" || kind === "cannon" || kind === "impact"
            ? -1.05
            : -1.35,
        ) * Math.min(1, (range - distance) / (range * 0.2));
  const pan = Math.max(
    -0.95,
    Math.min(
      0.95,
      (dx * ears.rightX + dz * ears.rightZ) / Math.max(12, horizontal),
    ),
  );
  return {
    distance,
    gain,
    pan,
    // Rifle cracks lose upper frequencies rapidly; cannon and other sources retain their mix.
    cutoff: kind === "rifle"
      ? Math.max(140, 6000 / (1 + Math.pow(distance / 32, 1.5)))
      : Math.max(220, (kind === "step" ? 1600 : 8500) / (1 + distance / 35)),
    delay: Math.min(2.5, distance / 343),
  };
}
/** Bound replay bookkeeping independently of event rate. Initial snapshots never replay old combat. */
export function createAudioEventCursor() {
  let last: number | undefined;
  return {
    take<T extends { id: number }>(events: readonly T[]) {
      const sorted = [...events].sort((a, b) => a.id - b.id),
        max = sorted.at(-1)?.id;
      if (last === undefined) {
        last = max ?? 0;
        return [] as T[];
      }
      const fresh = sorted.filter((e) => e.id > last!);
      if (max !== undefined) last = Math.max(last, max);
      return fresh.slice(-64);
    },
    reset() {
      last = undefined;
    },
  };
}
