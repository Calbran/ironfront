import { test } from "node:test";
import assert from "node:assert/strict";
import type { World } from "../packages/game-core/src";
import type { TerrainSurface } from "../packages/game-core/src/connectedTerrain";
import {
  buildCountryRoadNetwork,
  alignBridgeApproaches,
  countryRoadFieldFilter,
  type RoadDestination,
} from "../packages/game-core/src/countryRoadNetwork";
import {
  drapedRoadPoints,
  createCountryRoadScene,
} from "../apps/web/src/experiments/countryRoadScene";
import * as T from "three";

test("bridge approaches keep bends off the deck and preserve distant road endpoints", () => {
  const road = {
    id: "bend",
    highway: true,
    width: 6,
    path: [
      { x: -30, y: -9 },
      { x: -6, y: 0 },
      { x: 6, y: 0 },
      { x: 30, y: 12 },
    ],
  };
  const endpoints = [road.path[0], road.path.at(-1)];
  alignBridgeApproaches({
    roads: [road],
    bridges: [{ x: 0, y: 0, angle: 0, length: 24, width: 7 }],
    scale: 1,
    step: 8,
    connectedSites: 2,
    components: 1,
    connections: [],
    unreachable: [],
  });
  assert.deepEqual([road.path[0], road.path.at(-1)], endpoints);
  assert.deepEqual(road.path.slice(1, -1), [
    { x: -12, y: 0 },
    { x: 12, y: 0 },
  ]);
});

function fixture() {
  const cols = 41,
    rows = 41,
    n = cols * rows;
  const surface: TerrainSurface = {
    version: 1,
    seed: "roads",
    scale: 10,
    step: 10,
    cols,
    rows,
    heights: new Float32Array(n),
    land: new Uint8Array(n).fill(1),
    biomes: new Uint8Array(n).fill(1),
    mountainWeight: new Float32Array(n),
    ranges: [],
    peak: 0,
  };
  const world = {
    geography: {
      rivers: [
        [
          [200, 0],
          [200, 400],
        ],
      ],
    },
  } as unknown as World;
  const sites: RoadDestination[] = [
    [60, 70, true],
    [340, 300, true],
    [80, 300, false],
    [320, 80, false],
  ].map(([x, y, major], i) => ({
    x: Number(x),
    y: Number(y),
    major: !!major,
    id: String(i),
    name: String(i),
    radius: 1,
    entrances: [{ x: Number(x) + 1, y: Number(y) }],
  }));
  return { world, surface, sites };
}
test("country roads connect every entrance with a shared highway and local branches", () => {
  const { world, surface, sites } = fixture(),
    before = JSON.stringify(sites),
    roads = buildCountryRoadNetwork(world, surface, sites);
  assert.equal(roads.connectedSites, 4);
  assert.equal(roads.components, 1);
  assert.equal(roads.unreachable.length, 0);
  assert.ok(roads.roads.some((r) => r.highway && r.width === 6));
  assert.ok(roads.roads.some((r) => !r.highway && r.width === 3));
  // Check rendered polyline connectivity, not only the abstract connection report.
  const graph = new Map<string, Set<string>>(),
    key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
  for (const r of roads.roads)
    for (let i = 1; i < r.path.length; i++) {
      const a = key(r.path[i - 1]),
        b = key(r.path[i]);
      for (const [x, y] of [
        [a, b],
        [b, a],
      ]) {
        const next = graph.get(x) ?? new Set();
        next.add(y);
        graph.set(x, next);
      }
    }
  const seen = new Set([key(sites[0].entrances[0])]),
    queue = [...seen];
  for (const p of queue)
    for (const q of graph.get(p) ?? [])
      if (!seen.has(q)) {
        seen.add(q);
        queue.push(q);
      }
  for (const s of sites) assert.ok(seen.has(key(s.entrances[0])), s.id);
  assert.ok(roads.bridges.length > 0);
  for (const b of roads.bridges) assert.equal(b.x, 200);
  assert.deepEqual(roads, buildCountryRoadNetwork(world, surface, sites));
  assert.equal(JSON.stringify(sites), before);
  const r = roads.roads[0],
    p = r.path[0],
    filter = countryRoadFieldFilter(roads);
  assert.equal(filter({ ...p, width: 10, depth: 10, crop: 0 }), false);
  assert.equal(filter({ x: 0, y: 0, width: 1, depth: 1, crop: 0 }), true);
  const scene = new T.Scene(),
    view = createCountryRoadScene(
      scene,
      roads,
      surface,
      (x, y, h = 0) => new T.Vector3(x * 10, h, y * 10),
    );
  scene.traverse((o) => {
    if (o instanceof T.Mesh) {
      const a = o.geometry.getAttribute("position");
      for (let i = 0; i < a.count; i++) assert.ok(Number.isFinite(a.getX(i)));
    }
  });
  view.dispose();
  assert.equal(scene.children.length, 0);
});
test("mountain walls detour roads and sea gaps stay disconnected", () => {
  const { world, surface, sites } = fixture();
  for (let y = 1; y < 31; y++)
    for (let x = 18; x <= 22; x++) surface.biomes[y * surface.cols + x] = 4;
  const roads = buildCountryRoadNetwork(world, surface, sites);
  assert.equal(roads.connectedSites, 4);
  for (const r of roads.roads)
    for (const p of r.path)
      assert.notEqual(
        surface.biomes[Math.round(p.y / 10) * 41 + Math.round(p.x / 10)],
        4,
      );
  for (let y = 0; y < 41; y++)
    for (let x = 18; x <= 22; x++) surface.land[y * 41 + x] = 0;
  const split = buildCountryRoadNetwork(world, surface, sites);
  assert.equal(split.components, 2);
  assert.equal(split.bridges.length, 0);
  const lonely = buildCountryRoadNetwork(world, surface, [sites[0], sites[1]]);
  assert.equal(lonely.connectedSites, 0);
  assert.equal(lonely.unreachable.length, 2);
});
test("road draping splits grid axes and triangle diagonals", () => {
  const points = drapedRoadPoints(
    [
      { x: 1, y: 2 },
      { x: 27, y: 18 },
    ],
    10,
  );
  assert.deepEqual(points[0], { x: 1, y: 2 });
  assert.deepEqual(points.at(-1), { x: 27, y: 18 });
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    assert.ok(
      [p.x, p.y, p.x + p.y].some(
        (v) => Math.abs(v / 10 - Math.round(v / 10)) < 1e-9,
      ),
    );
  }
});
