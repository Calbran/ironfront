/** Camera-relative political overview threshold, shared by all map layers. */
export const STRATEGY_ZOOM = 0.85;
export const DETAIL_ZOOM = 2.3;
export const POLITICAL_OVERLAY_END_ZOOM = 4;

/** Ownership reads as a wash at overview scale, then yields fully to terrain detail. */
export function politicalOverlayAlpha(zoom: number): number {
  if (zoom < STRATEGY_ZOOM) return 1;
  if (zoom >= POLITICAL_OVERLAY_END_ZOOM) return 0;
  return (
    0.24 *
    (1 - (zoom - STRATEGY_ZOOM) / (POLITICAL_OVERLAY_END_ZOOM - STRATEGY_ZOOM))
  );
}

/** Blend national hues toward warm stone for a restrained political palette. */
export function politicalColor(hex: string): number {
  const value = parseInt(hex.replace("#", ""), 16);
  const stone = [155, 153, 140];
  return [16, 8, 0].reduce(
    (color, shift, index) =>
      color |
      (Math.round(((value >> shift) & 255) * 0.65 + stone[index] * 0.35) <<
        shift),
    0,
  );
}
