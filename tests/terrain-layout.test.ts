import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, type Region } from "../packages/game-core/src/index.ts";
import { generateContinent } from "../packages/game-core/src/geography.ts";
import {
  localPath,
  localSegment,
  onLocalLand,
  invalidateLocalPaths,
} from "../packages/game-core/src/localMovement.ts";
import {
  terrainCover,
  type TerrainLayout,
  type TerrainPoint,
  polygonContains,
} from "../packages/game-core/src/terrainLayout.ts";
import {
  layoutPreservesConnectivity,
  supportsSettlement,
} from "../packages/game-core/src/terrainLayoutGenerator.ts";
import { Store } from "../apps/api/src/store.ts";

const box = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
function region(layout?: TerrainLayout): Region {
  return {
    id: 0,
    name: "Test",
    x: 100,
    y: 300,
    polygon: [
      [0, 0],
      [800, 0],
      [800, 600],
      [0, 600],
    ],
    area: 480000,
    neighbors: [],
    terrain: "plains",
    owner: 0,
    garrison: 0,
    consolidation: 0,
    building: null,
    construction: null,
    navigationCellSize: 20,
    terrainLayout: layout,
  };
}
const lake = (): TerrainLayout => ({
  version: 1,
  theme: "lake",
  obstacles: [{ id: "lake", kind: "water", polygon: box(300, 100, 200, 400) }],
  crossings: [
    {
      id: "bridge",
      polygon: box(260, 270, 280, 60),
      points: [
        { x: 260, y: 300 },
        { x: 540, y: 300 },
      ],
      width: 60,
    },
  ],
  routes: [],
});
test("water blocks endpoints and swept movement, with only the physical bridge providing an exception", () => {
  const r = region(lake());
  assert(!onLocalLand(r, { x: 400, y: 200 }));
  assert(onLocalLand(r, { x: 400, y: 300 }));
  assert(localSegment(r, { x: 100, y: 300 }, { x: 700, y: 300 }));
  assert(!localSegment(r, { x: 100, y: 150 }, { x: 700, y: 150 }));
  assert(!localSegment(r, { x: 100, y: 100 }, { x: 700, y: 500 }));
  assert(localSegment(r, { x: 100, y: 150 }, { x: 700, y: 150 }, "air"));
  r.terrainLayout!.obstacles.push({
    id: "solid",
    kind: "scrap",
    polygon: box(390, 280, 20, 40),
  });
  assert(
    !onLocalLand(r, { x: 400, y: 300 }),
    "a bridge never exempts solid obstacles",
  );
});
test("routing detours around scrap and never tunnels through thin footprints", () => {
  const r = region({
    version: 1,
    theme: "scrapyard",
    obstacles: [{ id: "heap", kind: "scrap", polygon: box(399, 100, 2, 400) }],
    crossings: [],
    routes: [],
  });
  const start = { x: 100, y: 300 },
    end = { x: 700, y: 300 };
  assert(!localSegment(r, start, end));
  const path = localPath(r, start, end);
  assert(path.length > 1);
  let at = start;
  for (const p of path) {
    assert(localSegment(r, at, p));
    at = p;
  }
});
test("cover is local, directional, and unavailable in the obstacle or to air units", () => {
  const r = region({
    version: 1,
    theme: "scrapyard",
    obstacles: [
      { id: "heap", kind: "scrap", polygon: box(300, 200, 100, 100) },
    ],
    crossings: [],
    routes: [],
  });
  assert(terrainCover(r, { x: 410, y: 250 }, { x: 100, y: 250 }));
  assert(!terrainCover(r, { x: 410, y: 250 }, { x: 700, y: 250 }));
  assert(!terrainCover(r, { x: 450, y: 250 }, { x: 100, y: 250 }));
  assert(!terrainCover(r, { x: 350, y: 250 }, { x: 100, y: 250 }));
  assert(
    !terrainCover(
      r,
      { x: 410, y: 250, movementLayer: "air" },
      { x: 100, y: 250 },
    ),
  );
});
test("connectivity validator rejects sealed regions but accepts a usable bridge", () => {
  const r = region();
  assert(layoutPreservesConnectivity(r, lake()));
  assert(
    !layoutPreservesConnectivity(r, {
      version: 1,
      theme: "mountain-pass",
      obstacles: [{ id: "wall", kind: "ridge", polygon: box(390, 0, 20, 600) }],
      crossings: [],
      routes: [],
    }),
  );
  assert.equal(r.terrainLayout, undefined);
});
test("seeded region layouts precede settlements and retain connected bridge approaches", () => {
  for (const seed of ["Boreal", "Ironfront", "Meridian"]) {
    const map = generateContinent(seed, 4);
    const layouts = map.regions.filter((r) => r.terrainLayout);
    console.log(
      seed,
      layouts
        .map(
          (r) =>
            `${r.id}:${r.terrainLayout!.theme}:${r.terrainLayout!.obstacles.length}`,
        )
        .join(" "),
    );
    for (const theme of ["scrapyard", "lake", "mountain-pass"])
      assert(
        layouts.some((r) => r.terrainLayout!.theme === theme),
        `${seed}: ${theme}`,
      );
    for (const r of layouts) {
      assert(layoutPreservesConnectivity(r, r.terrainLayout!));
      for (const f of r.features ?? [])
        if (f.kind === "settlement") assert(supportsSettlement(r, f));
      for (const bridge of r.terrainLayout!.crossings) {
        assert(localSegment(r, bridge.points[0], bridge.points[1]));
        for (const end of bridge.points) assert(localPath(r, r, end).length);
      }
    }
    const again = generateContinent(seed, 4);
    assert.deepEqual(
      again.regions.map((r) => r.terrainLayout),
      map.regions.map((r) => r.terrainLayout),
    );
  }
});
test("saved physical layouts survive store serialization without regenerating old maps", () => {
  const world = createWorld("TERRAIN-LAYOUT", "Boreal", 4, 3600000, 0);
  const store = new Store(":memory:");
  try {
    store.create(world, "terrain-layout-test");
    // JSON is the same serialization used by the persistent store.
    const restored = store.get(world.id)!;
    assert.deepEqual(
      restored.regions.map((r) => r.terrainLayout),
      world.regions.map((r) => r.terrainLayout),
    );
    const r = restored.regions.find((r) => r.terrainLayout?.theme === "lake")!;
    assert(r);
    const obstacle = r.terrainLayout!.obstacles[0];
    const p = { x: obstacle.polygon[0].x - 50, y: obstacle.polygon[0].y };
    assert(polygonContains(obstacle.polygon, p));
    assert.equal(onLocalLand(r, p), onLocalLand(world.regions[r.id], p));
  } finally {
    store.close();
  }
});
