export type BattleSound =
  "rifle" | "cannon" | "impact" | "step" | "engine" | "tracks";
export const SOUND_LENGTH: Record<BattleSound, number> = {
  rifle: 0.95,
  cannon: 2.4,
  impact: 1.8,
  step: 0.32,
  engine: 2,
  tracks: 2,
};
/** Original procedural effects. Noise, transients and resonances are baked once, never per shot. */
export function synthesizeBattleSound(
  kind: BattleSound,
  variant = 0,
  rate = 24000,
): Float32Array {
  const result = new Float32Array(Math.round(SOUND_LENGTH[kind] * rate));
  let seed = (12345 + variant * 31337) >>> 0,
    low = 0,
    mid = 0;
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  for (let i = 0; i < result.length; i++) {
    const t = i / rate,
      n = noise();
    low += 0.035 * (n - low);
    mid += 0.28 * (n - mid);
    let v = 0;
    if (kind === "rifle") {
      // Brief broadband pressure crack, followed by a darker chest/body report.
      const crack = (mid - low) * Math.exp(-t * (185 + variant * 29)) * (1.6 + variant * .14);
      const body = low * (6.2 + variant * .35) * Math.exp(-t * (12 + variant * 1.7)) + mid * 0.38 * Math.exp(-t * 36);
      const thump =
        Math.sin(2 * Math.PI * (88 + variant * 4) * t) *
        Math.exp(-t * 23) *
        0.62;
      const action = t > 0.12 ? low * Math.exp(-(t - 0.12) * 60) * 0.7 : 0;
      v = crack + body + thump + action;
      for (const echo of [0.075, 0.17, 0.29])
        if (t > echo) v += low * Math.exp(-(t - echo) * 18) * 0.5 * (1 - echo);
    } else if (kind === "cannon") {
      v =
        mid * Math.exp(-t * 125) * 0.8 +
        mid * Math.exp(-t * 11) * 0.3 +
        low * 5 * Math.exp(-t * 2.8) +
        Math.sin(2 * Math.PI * (54 * t + 18 * (1 - Math.exp(-t * 8)))) *
          Math.exp(-t * 5) *
          0.6;
      if (t > 0.16) v += low * 1.7 * Math.exp(-(t - 0.16) * 3.5);
    } else if (kind === "impact") {
      v =
        mid * Math.exp(-t * 45) * 0.8 +
        low * 5 * Math.exp(-t * 4) +
        Math.sin(2 * Math.PI * 69 * t) * Math.exp(-t * 10) * 0.42;
      for (const delay of [0.06, 0.12, 0.21, 0.34, 0.48])
        if (t > delay)
          v +=
            (n - mid) *
            Math.exp(-(t - delay) * 95) *
            0.11 *
            Math.exp(-delay * 3);
    } else if (kind === "step") {
      // Padded heel/toe contact: low thud and soft friction, without a bright gravel click.
      const heel =
        Math.sin(2 * Math.PI * (62 + variant * 3) * t) *
        Math.exp(-t * 35) *
        0.62;
      const toe =
        t > 0.065
          ? Math.sin(2 * Math.PI * 76 * (t - 0.065)) *
            Math.exp(-(t - 0.065) * 48) *
            0.23
          : 0;
      v =
        heel +
        toe +
        low * 1.15 * Math.exp(-t * 20) +
        mid * 0.07 * Math.exp(-t * 28);
    } else if (kind === "engine") {
      const pulse = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 14 * t), 5);
      v =
        0.12 * Math.sin(2 * Math.PI * 42 * t) +
        0.08 * Math.sin(2 * Math.PI * 84 * t) +
        0.04 * Math.sin(2 * Math.PI * 126 * t) +
        low * 0.6 +
        pulse * mid * 0.28;
    } else {
      const phase = (t * 16) % 1;
      v =
        mid * Math.exp(-phase * 18) * 0.35 +
        low * 0.32 +
        Math.sin(2 * Math.PI * 224 * t) * Math.exp(-phase * 30) * 0.09;
    }
    const fade = Math.min(
      1,
      t * (kind === "step" ? 110 : kind === "rifle" ? 1600 : 200),
      (SOUND_LENGTH[kind] - t) * 60,
    );
    result[i] = Math.tanh(v * 1.7) * Math.max(0, fade) * 0.72;
  }
  return result;
}

/** Short, dark reflections for one shared city reverb bus. No per-unit reverbs. */
export function synthesizeCityImpulse(rate = 24000) {
  const result = new Float32Array(Math.round(rate * 0.72));
  let seed = 173,
    low = 0;
  for (let i = 0; i < result.length; i++) {
    const t = i / rate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    low += (1 - Math.exp(-2 * Math.PI * 480 / rate)) * (seed / 2147483648 - 1 - low);
    if (t > 0.025)
      result[i] =
        low * 0.025 * Math.exp(-(t - 0.025) * 9) * Math.min(1, (0.72 - t) * 40);
  }
  for (const [time, amplitude] of [
    [0.029, 0.32],
    [0.061, 0.23],
    [0.103, 0.15],
    [0.157, 0.08],
  ])
    result[Math.round(time * rate)] += amplitude;
  return result;
}
