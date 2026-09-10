/** Shared physical artwork sizes in world units. Labels and cartographic city/unit markers remain UI. */
export function visualScale(world: { geography?: { cellSize: number } }) {
  const factor = (world.geography?.cellSize ?? 8) / 24;
  return {
    factor,
    tree: 22 * factor,
    treeSpacing: 20 * factor,
    mountain: 360 * factor,
    hill: 200 * factor,
    scrub: 16 * factor,
    grass: 12 * factor,
    flowers: 10 * factor,
    reeds: 12 * factor,
    stones: 14 * factor,
    pole: 8 * factor,
    road: 4.8 * factor,
    unitGlyphScale: 0.25 / factor,
  };
}
