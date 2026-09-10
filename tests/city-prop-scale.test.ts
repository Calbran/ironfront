import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { bakeInfantry } from "../apps/web/src/infantryModel";
import { CITY_PROP_SCALE } from "../packages/game-core/src/cityPropScale";
import { CIVIC_WALLS } from "../packages/game-core/src/cityTactics";
test("city seating and low walls stay proportionate to the rendered infantry rig", () => {
  const rig = bakeInfantry(0),
    bounds = new T.Box3(),
    pose = rig.pose("aim", 0.85);
  try {
    rig.parts.forEach((part, i) => {
      part.geometry.computeBoundingBox();
      bounds.union(
        part.geometry
          .boundingBox!.clone()
          .applyMatrix4(new T.Matrix4().fromArray(pose[i])),
      );
    });
    const height = bounds.getSize(new T.Vector3()).y * 0.55;
    const seatAbovePaving = CITY_PROP_SCALE.bench.seatY + 0.035 - 0.12;
    assert(
      seatAbovePaving > height * 0.2 && seatAbovePaving < height * 0.36,
      "seat belongs near the knees",
    );
    assert(
      CITY_PROP_SCALE.bench.backY +
        CITY_PROP_SCALE.bench.backHeight / 2 -
        0.12 <
        height * 0.8,
    );
    assert(
      CITY_PROP_SCALE.wall.height < height * 0.75,
      "civic wall remains low cover",
    );
    assert(
      CIVIC_WALLS.every(
        (w) => Math.min(w.width, w.depth) === CITY_PROP_SCALE.wall.thickness,
      ),
    );
  } finally {
    rig.parts.forEach((p) => p.geometry.dispose());
  }
});
