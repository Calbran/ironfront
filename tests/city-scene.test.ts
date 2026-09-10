import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  type RegionFeature,
} from "../packages/game-core/src/index.ts";
import {
  cityScenePlan,
  SCENE_WIDTH,
} from "../packages/game-core/src/cityScene.ts";
const w = createWorld("SCENES", "Boreal", 4, 3600000, 0),
  r = w.regions[0];
r.polygon = [
  [0, 0],
  [2000, 0],
  [2000, 2000],
  [0, 2000],
];
r.contours = [r.polygon as [number, number][]];
const f: RegionFeature = {
  id: "scene-city",
  name: "Test",
  kind: "settlement",
  size: "town",
  x: 1000,
  y: 1000,
};
r.features = [f];
w.regions = [r];
test("authored scene choice is seeded and art dimensions are fixed by family", () => {
  const a = cityScenePlan(w, r, f, "port");
  assert.deepEqual(a, cityScenePlan(w, r, f, "port"));
  const variants = new Set(
    Array.from(
      { length: 12 },
      (_, i) =>
        cityScenePlan({ ...w, seed: `seed-${i}` }, r, f, "port").districts[0]
          .variant,
    ),
  );
  assert(variants.size > 1);
  for (const size of [
    "hamlet",
    "village",
    "town",
    "city",
    "metropolis",
  ] as const) {
    const p = cityScenePlan(w, r, { ...f, size }, "port");
    assert(
      p.districts.every(
        (d) =>
          d.width === SCENE_WIDTH[d.family][d.variant] &&
          d.variant >= 0 &&
          d.variant < SCENE_WIDTH[d.family].length,
      ),
    );
  }
  const town = cityScenePlan(w, r, f, "port"),
    city = cityScenePlan(w, r, { ...f, size: "city" }, "port");
  assert.equal(town.districts[0].width, city.districts[0].width);
  assert(city.districts.length > town.districts.length);
  assert.equal(
    cityScenePlan(w, r, { ...f, size: "metropolis" }, "port").districts[0]
      .family,
    "metropolis",
  );
});
test("extra districts are omitted when geography cannot accommodate them", () => {
  const narrow = structuredClone(r);
  narrow.polygon = [
    [980, 980],
    [1020, 980],
    [1020, 1020],
    [980, 1020],
  ];
  narrow.contours = [narrow.polygon as [number, number][]];
  assert.equal(
    cityScenePlan(w, narrow, { ...f, size: "metropolis" }, "port").districts
      .length,
    1,
  );
});

test("metropolis art is never constrained to a town-sized footprint", () => {
  assert(
    SCENE_WIDTH.metropolis[0] >= SCENE_WIDTH.border[0] * 5,
  );
  assert(new Set(SCENE_WIDTH.port).size > 1);
});

test("every family includes non-rounded silhouette variants", () => {
  for (const widths of Object.values(SCENE_WIDTH)) assert(widths.length >= 4);
});
