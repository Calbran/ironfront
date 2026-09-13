/** Deterministic, planted-foot idle motion; supported stances retain breathing. */
export function cityIdleMotion(
  time: number,
  id: number,
  speed: number,
  moving: boolean,
  aiming: boolean,
  cover: string,
) {
  const weight = moving ? 0 : Math.max(0, 1 - speed / 0.1);
  const supported = aiming || cover !== "none";
  const phase = time * (1.45 + (id % 3) * 0.08) + id * 2.399;
  return {
    breath: Math.sin(phase) * 0.006 * weight * (supported ? 0.55 : 1),
    sway: supported ? 0 : Math.sin(time * 0.55 + id * 1.7) * 0.009 * weight,
  };
}
