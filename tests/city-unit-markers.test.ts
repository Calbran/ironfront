import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  AIRSHIP_MARKER_START_PIXELS,
  AIRSHIP_MODEL_CULL_PIXELS,
  GROUND_UNIT_MODEL_CULL_PIXELS,
  markerProjection,
  markerPosition,
} from "../apps/web/src/experiments/cityUnitMarkers";

test("markers fade with orthographic zoom and perspective distance, not pitch", () => {
  const ortho = new T.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
  ortho.position.set(0, 100, 0);
  ortho.up.set(0, 0, -1);
  ortho.lookAt(0, 0, 0);
  ortho.updateMatrixWorld();
  assert.equal(markerProjection(new T.Vector3(), ortho, 800, 600).opacity, 1);
  ortho.zoom = 10;
  ortho.updateProjectionMatrix();
  assert.equal(markerProjection(new T.Vector3(), ortho, 800, 600).opacity, 0);
  const camera = new T.PerspectiveCamera(50, 4 / 3, 0.1, 1000);
  camera.position.z = 100;
  camera.updateMatrixWorld();
  assert.equal(markerProjection(new T.Vector3(), camera, 800, 600).opacity, 0);
  camera.position.z = 10;
  camera.updateMatrixWorld();
  assert.equal(markerProjection(new T.Vector3(), camera, 800, 600).opacity, 0);
  assert.equal(
    markerProjection(new T.Vector3(0, 0, 20), camera, 800, 600).visible,
    false,
  );
  assert.equal(
    markerProjection(new T.Vector3(500, 0, 0), camera, 800, 600).visible,
    false,
  );
});
test("airship badges arrive at tactical zoom while their models retain tenfold reach", () => {
  const camera = new T.PerspectiveCamera(50, 4 / 3, 0.1, 10000);
  const at = (distance: number, kind = "infantry") => {
    camera.position.z = distance;
    camera.updateMatrixWorld();
    return markerProjection(new T.Vector3(), camera, 800, 600, kind);
  };
  const transition = at(150);
  assert.ok(transition.opacity > 0 && transition.opacity < 1);
  assert.equal(transition.hideModel, false);
  assert.equal(at(300).opacity, 1);
  assert.equal(at(300).hideModel, false);
  assert.equal(at(500).hideModel, false);
  assert.equal(at(600).hideModel, true);
  assert.ok(at(300, "airship").opacity > 0.5);
  assert.equal(at(500, "airship").opacity, 1);
  assert.equal(at(1500, "airship").hideModel, false);
  assert.equal(at(3000, "airship").hideModel, false);
  assert.equal(at(6000, "airship").hideModel, true);
  assert.equal(
    GROUND_UNIT_MODEL_CULL_PIXELS / AIRSHIP_MODEL_CULL_PIXELS,
    10,
  );
  assert.equal(AIRSHIP_MARKER_START_PIXELS, 3);
});
test("overlapping city units receive separate on-screen badge slots", () => {
  const placed: { x: number; y: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const p = markerPosition(400, 300, placed, 800, 600);
    assert.ok(
      placed.every(
        (q) => Math.abs(q.x - p.x) >= 36 || Math.abs(q.y - p.y) >= 34,
      ),
    );
    placed.push(p);
  }
});
