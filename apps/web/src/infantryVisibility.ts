export interface Viewport {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
}
/** Screen-space padding covers formation spread and avoids popping at viewport edges. */
export function inInfantryViewport(
  p: { x: number; y: number },
  v: Viewport,
  padding = 96,
) {
  const x = p.x * v.scale + v.x,
    y = p.y * v.scale + v.y;
  return (
    x >= -padding &&
    y >= -padding &&
    x <= v.width + padding &&
    y <= v.height + padding
  );
}
export function infantryDetail(
  zoom: number,
  projectedHeight: number,
  strategy = false,
) {
  return !strategy && zoom >= 2.6 && projectedHeight >= 5;
}
