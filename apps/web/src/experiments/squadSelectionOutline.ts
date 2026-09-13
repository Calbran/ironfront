export type SquadOutlinePoint = { x: number; z: number };

/** Rounded convex envelope around every living member's padded footprint. */
export function squadSelectionOutline(
  members: readonly SquadOutlinePoint[],
  padding: number,
  samples = 40,
) {
  if (!members.length || samples < 3) return [];
  const outline: SquadOutlinePoint[] = [];
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2,
      nx = Math.cos(angle),
      nz = Math.sin(angle);
    let support = members[0],
      score = support.x * nx + support.z * nz;
    for (let j = 1; j < members.length; j++) {
      const candidate = members[j],
        candidateScore = candidate.x * nx + candidate.z * nz;
      if (candidateScore > score) {
        support = candidate;
        score = candidateScore;
      }
    }
    outline.push({ x: support.x + nx * padding, z: support.z + nz * padding });
  }
  return outline;
}
