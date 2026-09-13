/** City tank recoil envelope; shared by live scenes and the animation authoring view. */
export function tacticalTankKick(age: number) {
  return {
    barrel: age >= 0 && age < 0.4 ? -0.36 * Math.sin((age / 0.4) * Math.PI) : 0,
    hull:
      age >= 0 && age < 0.45 ? -0.045 * Math.sin((age / 0.45) * Math.PI) : 0,
  };
}
