import type { CityLayout } from "./cityLayout.ts";
import type { Region } from "./index.ts";
import { onLocalLand } from "./localMovement.ts";

const compassStep = Math.PI / 4;

/** ImageGen authored the requested sequence with its vertical axis reversed. */
export const PORT_FRAME_BY_DIRECTION = [4, 7, 2, 3, 0, 1, 6, 5] as const;

export function portOrientationFromAngle(normal: number) {
  const index =
    ((Math.round((normal + Math.PI / 2) / compassStep) % 8) + 8) % 8;
  const angle = -Math.PI / 2 + index * compassStep;
  let correction = normal - angle;
  while (correction > Math.PI) correction -= Math.PI * 2;
  while (correction < -Math.PI) correction += Math.PI * 2;
  return {
    index,
    frame: PORT_FRAME_BY_DIRECTION[index],
    angle,
    correction: Math.max(
      -compassStep / 2,
      Math.min(compassStep / 2, correction),
    ),
  };
}

/** Choose a direction from a validated dock when no visual coast is available. */
export function portOrientation(layout: Pick<CityLayout, "docks">) {
  const dock = layout.docks[Math.floor(layout.docks.length / 2)];
  if (!dock) return portOrientationFromAngle(-Math.PI / 2);
  return portOrientationFromAngle(
    Math.atan2(dock[1].y - dock[0].y, dock[1].x - dock[0].x),
  );
}

/** Find the open-water side visible around a port, including narrow bays and capes. */
export function portOrientationFromLand(
  regions: readonly Region[],
  center: { x: number; y: number },
  radius: number,
  fallback: Pick<CityLayout, "docks">,
) {
  let waterX = 0,
    waterY = 0,
    total = 0;
  for (let sample = 0; sample < 64; sample++) {
    const angle = -Math.PI + (sample * Math.PI * 2) / 64;
    let score = 0;
    for (const spread of [-0.12, 0, 0.12])
      for (const [distance, weight] of [
        [radius * 0.32, 4],
        [radius * 0.5, 3],
        [radius * 0.72, 2],
        [radius, 1],
      ] as const) {
        const point = {
          x: center.x + Math.cos(angle + spread) * distance,
          y: center.y + Math.sin(angle + spread) * distance,
        };
        if (!regions.some((region) => onLocalLand(region, point)))
          score += weight;
      }
    const weight = score * score;
    waterX += Math.cos(angle) * weight;
    waterY += Math.sin(angle) * weight;
    total += weight;
  }
  return total === 0 || Math.hypot(waterX, waterY) < total * 0.02
    ? portOrientation(fallback)
    : portOrientationFromAngle(Math.atan2(waterY, waterX));
}
