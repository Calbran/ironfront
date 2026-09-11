export type CitySoundCue = {
  id: number;
  kind: "rifle" | "cannon" | "impact";
  x: number;
  z: number;
  time: number;
};
/** Coarse, hearing-authorized events contain no unit IDs, targets, damage or exact hidden positions. */
export function createCityHearing() {
  const cues: CitySoundCue[] = [];
  return {
    emit(
      shot: {
        id: number;
        x: number;
        z: number;
        tx: number;
        tz: number;
        shell: boolean;
        impact: boolean;
      },
      time: number,
      units: readonly {
        friendly?: boolean;
        health: number;
        x: number;
        z: number;
      }[],
    ) {
      const x = shot.impact ? shot.tx : shot.x,
        z = shot.impact ? shot.tz : shot.z,
        kind = shot.impact ? "impact" : shot.shell ? "cannon" : "rifle",
        range = kind === "rifle" ? 1200 : 3200;
      const distance = Math.min(
        ...units
          .filter((u) => u.friendly && u.health > 0)
          .map((u) => Math.hypot(u.x - x, u.z - z)),
      );
      if (distance > range) return;
      const cell = distance > 640 ? 256 : distance > 160 ? 128 : 32;
      cues.push({
        id: shot.id,
        kind,
        x: Math.floor(x / cell) * cell + cell / 2,
        z: Math.floor(z / cell) * cell + cell / 2,
        time,
      });
      if (cues.length > 128) cues.shift();
    },
    snapshot(time: number) {
      while (cues.length && time - cues[0].time > 2) cues.shift();
      return cues.map((c) => ({ ...c }));
    },
  };
}
