import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  projectedObjectHitTarget,
  TACTICAL_INFANTRY_HIT_RADIUS,
  TACTICAL_TANK_HIT_PADDING,
  TACTICAL_TANK_MIN_HIT_RADIUS,
} from "../apps/web/src/experiments/tacticalSelectionBounds";

test("tank hit target encloses its projected model with additional padding", () => {
  const tank = new T.Mesh(new T.BoxGeometry(6, 3, 4)),
    camera = new T.PerspectiveCamera(50, 4 / 3, 0.1, 1000),
    viewport = { left: 20, top: 40, width: 800, height: 600 };
  camera.position.set(0, 7, 18);
  camera.lookAt(0, 0, 0);
  const target = projectedObjectHitTarget(
    4,
    tank,
    camera,
    viewport,
    TACTICAL_TANK_MIN_HIT_RADIUS,
    TACTICAL_TANK_HIT_PADDING,
  );
  assert.equal(target.id, 4);
  assert.equal(target.visible, true);
  assert.ok(target.radius! > TACTICAL_TANK_MIN_HIT_RADIUS);
  assert.equal(TACTICAL_INFANTRY_HIT_RADIUS, 30);
});
