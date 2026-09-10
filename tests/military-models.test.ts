import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  createMilitaryModel,
  createInfantryReference,
  MILITARY_MODELS,
  SOLDIER_REFERENCE_HEIGHT,
} from "../apps/web/src/prototypes/militaryModels.ts";
test("military kit preserves infantry proportions and finite compact exportable geometry", () => {
  const infantry = createInfantryReference(),
    height = new T.Box3().setFromObject(infantry).getSize(new T.Vector3()).y;
  assert(height > 1.6 && height < SOLDIER_REFERENCE_HEIGHT + 0.1);
  for (const kind of MILITARY_MODELS) {
    const model = createMilitaryModel(kind),
      d = model.root.userData.dimensions;
    assert(
      model.triangles > 100 && model.triangles < 6500,
      `${kind}: ${model.triangles} triangles`,
    );
    assert.equal(model.root.scale.x, 1);
    model.root.traverse((o) => {
      if (o instanceof T.Mesh) {
        for (const value of o.geometry.attributes.position.array)
          assert(Number.isFinite(value));
        assert(o.geometry.attributes.color);
      }
    });
    if (kind === "sandbags" || kind === "wire") {
      assert(d.height < height * 0.65);
      assert(model.root.getObjectByName("join_left"));
      assert(model.root.getObjectByName("join_right"));
    }
    if (kind === "tank") assert(d.height > height && d.height < height * 1.7);
    if (kind === "airship")
      assert(d.length > height * 7 && d.length < height * 11);
    if (kind === "lmg") {
      assert.equal(model.root.userData.members, 6);
      assert(Math.abs(d.height - height) < 0.05);
      assert(model.root.getObjectByName("gunner"));
    }
    if (kind === "guards" || kind === "engineers") {
      assert.equal(model.root.userData.members, 6);
      assert(d.height >= height - 0.01 && d.height < height + 0.2);
      assert.equal(
        model.root.children.filter((o) => o.name.startsWith(kind + "_")).length,
        6,
      );
    }
    if (kind === "landship") {
      assert.equal(model.root.userData.faction, "Iron Directorate");
      assert(d.length > 8 && d.width > 4);
      assert(model.root.getObjectByName("turret_yaw"));
    }
    if (kind === "gunship") {
      assert.equal(model.root.userData.faction, "Aether Compact");
      assert(model.root.getObjectByName("turbine_-1"));
      assert(model.root.getObjectByName("turbine_1"));
      assert(d.length < 8);
    }
    model.animate(1);
    model.root.updateMatrixWorld(true);
    model.root.traverse((o) =>
      o.matrixWorld.elements.forEach((n) => assert(Number.isFinite(n))),
    );
    model.dispose();
  }
  infantry.geometry.dispose();
  (infantry.material as T.Material).dispose();
});
