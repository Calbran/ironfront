export type FireProfile = "semi" | "burst" | "automatic" | "cannon";
const profiles = {
  semi: {
    cycle: 950,
    travel: 130,
    length: 2,
    width: 0.32,
    flash: 0.65,
  },
  burst: {
    cycle: 850,
    travel: 120,
    length: 2.3,
    width: 0.35,
    flash: 0.75,
  },
  automatic: {
    cycle: 1100,
    travel: 110,
    length: 2.5,
    width: 0.4,
    flash: 0.8,
  },
  cannon: {
    cycle: 2600,
    travel: 400,
    length: 4,
    width: 0.8,
    flash: 1.6,
  },
} as const;
const hash = (id: string) => {
  let value = [...id].reduce((h,c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
};
/** Cosmetic independent firing clocks. Only called for server-confirmed firing squads. */
export function gunfire(
  id: string,
  members: number,
  now: number,
  profile: FireProfile,
) {
  const spec = profiles[profile];
  const traces: {
    firedAt: number;
    member: number;
    progress: number;
    length: number;
    width: number;
    flash: number;
  }[] = [];
  for (let i = 0; i < members; i++) {
    const seed = hash(`${id}:${i}`);
    const cycle = spec.cycle * (0.9 + (seed % 201) / 1000);
    const offset = seed % 100003;
    const current = Math.floor((now + offset) / cycle);
    // Seed each firing sequence independently so pauses and bursts evolve,
    // without depending on render frequency or changing combat authority.
    for (let sequence = current - 1; sequence <= current; sequence++) {
      const random = (slot: number) =>
        hash(`${id}:${i}:${sequence}:${slot}`) / 4294967296;
      if (profile !== "cannon" && random(0) < 0.12) continue;
      const count =
        profile === "semi"
          ? random(1) < 0.24
            ? 2
            : 1
          : profile === "burst"
            ? 2 + Math.floor(random(1) * 3)
            : profile === "automatic"
              ? 5 + Math.floor(random(1) * 5)
              : 1;
      let firedAt = sequence * cycle - offset + random(2) * cycle * 0.25;
      for (let shot = 0; shot < count; shot++) {
        if (shot)
          firedAt +=
            profile === "semi"
              ? 150 + random(10 + shot) * 140
              : profile === "burst"
                ? 75 + random(10 + shot) * 75
                : 50 + random(10 + shot) * 45;
        const travel = spec.travel * (0.85 + random(30 + shot) * 0.3);
        const age = now - firedAt;
        if (age >= 0 && age < travel)
          traces.push({
            firedAt,
            member: i,
            progress: age / travel,
            length: spec.length,
            width: spec.width,
            flash: spec.flash * (0.8 + random(50 + shot) * 0.4),
          });
      }
    }
  }
  return traces;
}
