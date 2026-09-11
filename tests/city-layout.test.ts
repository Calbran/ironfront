import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  type RegionFeature,
} from "../packages/game-core/src/index.ts";
import {
  generateCityLayout,
  buildingCorners,
  buildingsOverlap,
} from "../packages/game-core/src/cityLayout.ts";
import { onLocalLand } from "../packages/game-core/src/localMovement.ts";
import {
  PORT_FRAME_BY_DIRECTION,
  portOrientation,
  portOrientationFromLand,
} from "../packages/game-core/src/portOrientation.ts";
const base = createWorld("CITIES", "Boreal", 4, 3600000, 0);
function fixture(x = 500) {
  const w = structuredClone(base),
    r = w.regions[0];
  r.terrain = "plains";
  r.polygon = [
    [0, 0],
    [1200, 0],
    [1200, 1200],
    [0, 1200],
  ];
  r.contours = [r.polygon as [number, number][]];
  r.x = 500;
  r.y = 500;
  r.area = 1440000;
  const f: RegionFeature = {
    id: "test-city",
    kind: "settlement",
    size: "city",
    name: "Test",
    x,
    y: 500,
  };
  r.features = [f];
  w.regions = [r];
  w.geography!.width = 14400;
  w.geography!.coastlines = [
    [
      [0, 0],
      [0, 1200],
    ],
  ];
  w.geography!.rivers = [];
  return { w, r, f };
}
test("city seeds produce stable varied layouts with legal separated building footprints", () => {
  const { w, r, f } = fixture();
  const a = generateCityLayout(w, r, f);
  assert.deepEqual(a, generateCityLayout(w, r, f));
  const b = generateCityLayout({ ...w, seed: "Another city" }, r, f);
  assert.notDeepEqual(a.buildings, b.buildings);
  assert(a.buildings.length >= 8);
  for (const building of a.buildings)
    assert(buildingCorners(building).every((p) => onLocalLand(r, p)));
  for (let i = 0; i < a.buildings.length; i++)
    for (let j = i + 1; j < a.buildings.length; j++) {
      const p = a.buildings[i],
        q = a.buildings[j];
      assert(!buildingsOverlap(p, q));
    }
});
test("ports face real water, river towns follow rivers, and terrain influences archetypes", () => {
  const { w, r, f } = fixture(60);
  const port = generateCityLayout(w, r, f);
  assert.equal(port.archetype, "port");
  assert(port.docks.length > 0);
  assert(port.buildings.filter((b) => b.role !== "prop").length > 0);
  for (const [land, water] of port.docks) {
    assert(onLocalLand(r, land));
    assert(!onLocalLand(r, water));
  }
  f.x = 600;
  w.geography!.rivers = [
    [
      [650, 0],
      [650, 1200],
    ],
  ];
  assert.equal(generateCityLayout(w, r, f).archetype, "riverside");
  w.geography!.rivers = [];
  r.terrain = "forest";
  assert.equal(generateCityLayout(w, r, f).archetype, "woodland");
  r.terrain = "highlands";
  assert.equal(generateCityLayout(w, r, f).archetype, "fortified");
});

test("a distant coast cannot make a settlement a port without reachable docks", () => {
  const { w, r, f } = fixture(500);
  f.size = "metropolis";
  r.features!.push({ ...f, id: "nearby-city", x: 962 });
  const layout = generateCityLayout(w, r, f);
  assert.notEqual(layout.archetype, "port");
  assert.equal(layout.docks.length, 0);

  for (const region of w.regions)
    for (const settlement of (region.features ?? []).filter(
      (feature) => feature.kind === "settlement",
    )) {
      const candidate = generateCityLayout(w, region, settlement);
      if (candidate.archetype === "port") assert(candidate.docks.length > 0);
    }
});

test("port art selects all eight directions with at most a half-step correction", () => {
  for (let index = 0; index < 8; index++) {
    const angle = -Math.PI / 2 + index * (Math.PI / 4) + 0.1;
    const orientation = portOrientation({
      docks: [
        [
          { x: 0, y: 0 },
          { x: Math.cos(angle), y: Math.sin(angle) },
        ],
      ],
    });
    assert.equal(orientation.index, index);
    assert.equal(orientation.frame, PORT_FRAME_BY_DIRECTION[index]);
    assert(Math.abs(orientation.correction - 0.1) < 1e-10);
    assert(Math.abs(orientation.correction) <= Math.PI / 8);
  }
});

test("port art follows visible open water instead of a misleading dock", () => {
  const land = {
    ...base.regions[0],
    polygon: [
      [-1000, 0],
      [1000, 0],
      [1000, 1000],
      [-1000, 1000],
    ],
    contours: [
      [
        [-1000, 0],
        [1000, 0],
        [1000, 1000],
        [-1000, 1000],
      ],
    ] as [number, number][][],
  };
  const orientation = portOrientationFromLand([land], { x: 0, y: 50 }, 100, {
    docks: [
      [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
    ],
  });
  assert.equal(orientation.index, 0, "north-facing water is selected");
  assert.equal(orientation.frame, 4, "uses the atlas's actual north frame");
});
test("nearby settlements constrain footprints, including across territory borders", () => {
  const { w, r, f } = fixture();
  r.features!.push({ ...f, id: "neighbor", x: f.x + 100 });
  assert(generateCityLayout(w, r, f).radius <= 42);
});

test("new worlds space settlements across administrative boundaries and favor smaller satellites", () => {
  const settlements = base.regions.flatMap((r) =>
    (r.features ?? []).filter((f) => f.kind === "settlement"),
  );
  const major = (f: RegionFeature) =>
    f.size === "city" || f.size === "metropolis";
  assert(settlements.length < base.regions.length * 1.5);
  assert(settlements.filter(major).length < settlements.length * 0.25);
  for (let i = 0; i < settlements.length; i++)
    for (let j = i + 1; j < settlements.length; j++) {
      const a = settlements[i],
        b = settlements[j];
      assert(
        Math.hypot(a.x - b.x, a.y - b.y) >= (major(a) && major(b) ? 899 : 284),
      );
    }
});

test("template buildings and props preserve the original art orientation", () => {
  for (const terrain of ["forest", "highlands"] as const) {
    const { w, r, f } = fixture();
    r.terrain = terrain;
    const layout = generateCityLayout(w, r, f);
    assert(layout.buildings.length > 0);
    assert(layout.buildings.every((b) => b.angle === 0));
    assert.deepEqual(
      layout.roads,
      generateCityLayout({ ...w, seed: "different occupants" }, r, f).roads,
    );
  }
});

test("street blocks are filled with contained lots rather than sparse frontage", () => {
  const { w, r, f } = fixture();
  r.terrain = "forest";
  const layout = generateCityLayout(w, r, f);
  const roofs = layout.buildings.filter((b) => b.role !== "prop");
  for (const b of roofs)
    assert(
      layout.blocks.some(
        (block) =>
          b.x - b.width / 2 >= block.x &&
          b.y - b.height / 2 >= block.y &&
          b.x + b.width / 2 <= block.x + block.width &&
          b.y + b.height / 2 <= block.y + block.height,
      ),
    );
  const occupied = roofs.reduce((sum, b) => sum + b.width * b.height, 0);
  const available = layout.blocks.reduce(
    (sum, b) => sum + b.width * b.height,
    0,
  );
  assert(
    occupied / available > 0.65,
    `block occupancy ${occupied / available}`,
  );
});

test("settlement rank changes building count, never the size of a building", () => {
  const { w, r, f } = fixture();
  r.terrain = "forest";
  w.geography!.coastlines = [];
  const counts: number[] = [];
  for (const size of [
    "hamlet",
    "village",
    "town",
    "city",
    "metropolis",
  ] as const) {
    const layout = generateCityLayout(w, r, { ...f, size });
    const buildings = layout.buildings.filter((b) => b.role !== "prop");
    assert(buildings.length > 0);
    assert(buildings.every((b) => b.width === 48 && b.height === 48));
    counts.push(buildings.length);
  }
  for (let i = 1; i < counts.length; i++)
    assert(counts[i] > counts[i - 1], `building counts ${counts}`);
});

test("city artwork and dock scale stay fixed when world dimensions grow", () => {
  const { w, r, f } = fixture();
  const original = generateCityLayout(w, r, f);
  w.geography!.width *= 2;
  w.geography!.height *= 2;
  const expanded = generateCityLayout(w, r, f);
  assert.equal(expanded.radius, original.radius);
  assert.deepEqual(expanded.docks, original.docks);
  assert.deepEqual(expanded.buildings, original.buildings);
});
