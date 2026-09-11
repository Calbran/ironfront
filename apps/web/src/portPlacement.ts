import type { MapGeometry } from "./mapGeometry";
import type { CityLayout } from "../../../packages/game-core/src/cityLayout";
import { portOrientationFromAngle } from "../../../packages/game-core/src/portOrientation";

export const portArtFootprint = (radius: number) => Math.min(radius * 0.85, 180);

/** Attach the quay to the rendered coastline, never an internal region border. */
export function portPlacement(geometry: MapGeometry, region: number, layout: CityLayout) {
  const dock = layout.docks[Math.floor(layout.docks.length / 2)];
  if (!dock) return null;
  const midpoint = { x: (dock[0].x + dock[1].x) / 2, y: (dock[0].y + dock[1].y) / 2 };
  let best: { x: number; y: number; nx: number; ny: number; distance: number } | null = null;
  for (const edge of geometry.edges) {
    if (edge.regions.length !== 1 || edge.regions[0] !== region) continue;
    const dx = edge.b[0] - edge.a[0], dy = edge.b[1] - edge.a[1];
    const length = Math.hypot(dx, dy);
    if (!length) continue;
    const t = Math.max(0, Math.min(1, ((midpoint.x-edge.a[0])*dx+(midpoint.y-edge.a[1])*dy)/(length*length)));
    const x = edge.a[0]+t*dx, y = edge.a[1]+t*dy;
    const distance = Math.hypot(x-midpoint.x, y-midpoint.y);
    if (best && distance >= best.distance) continue;
    const sign = (-dy*(dock[1].x-dock[0].x)+dx*(dock[1].y-dock[0].y)) >= 0 ? 1 : -1;
    best = { x, y, nx: -dy/length*sign, ny: dx/length*sign, distance };
  }
  if (!best) return null;
  const inset = portArtFootprint(layout.radius) * 0.1;
  return { x: best.x-best.nx*inset, y: best.y-best.ny*inset,
    orientation: portOrientationFromAngle(Math.atan2(best.ny,best.nx)) };
}
