import * as T from "three";
import type { TacticalScreenUnit } from "./tacticalSelection";

export const TACTICAL_INFANTRY_HIT_RADIUS = 30;
export const TACTICAL_TANK_HIT_PADDING = 16;
export const TACTICAL_TANK_MIN_HIT_RADIUS = 38;

type Viewport = { left: number; top: number; width: number; height: number };

/** A padded screen-space target enclosing the complete rendered vehicle. */
export function projectedObjectHitTarget(
  id: number,
  object: T.Object3D,
  camera: T.Camera,
  viewport: Viewport,
  minimumRadius: number,
  padding: number,
): TacticalScreenUnit {
  object.updateWorldMatrix(true, true);
  camera.updateMatrixWorld();
  const bounds = new T.Box3().setFromObject(object),
    { min, max } = bounds,
    corners = [
      new T.Vector3(min.x, min.y, min.z),
      new T.Vector3(min.x, min.y, max.z),
      new T.Vector3(min.x, max.y, min.z),
      new T.Vector3(min.x, max.y, max.z),
      new T.Vector3(max.x, min.y, min.z),
      new T.Vector3(max.x, min.y, max.z),
      new T.Vector3(max.x, max.y, min.z),
      new T.Vector3(max.x, max.y, max.z),
    ].map((point) => point.project(camera)),
    xs = corners.map(
      (point) => viewport.left + ((point.x + 1) * viewport.width) / 2,
    ),
    ys = corners.map(
      (point) => viewport.top + ((1 - point.y) * viewport.height) / 2,
    ),
    left = Math.min(...xs),
    right = Math.max(...xs),
    top = Math.min(...ys),
    bottom = Math.max(...ys);
  return {
    id,
    x: (left + right) / 2,
    y: (top + bottom) / 2,
    radius: Math.max(
      minimumRadius,
      Math.hypot(right - left, bottom - top) / 2 + padding,
    ),
    visible: corners.some((point) => point.z >= -1 && point.z <= 1),
  };
}
