import { test } from "node:test";
import assert from "node:assert/strict";
import type { World, Region } from "../packages/game-core/src/index";
import {
  buildConnectedTerrain,
  terrainHeight,
  terrainGrade,
} from "../packages/game-core/src/connectedTerrain";
import { createPacingStudy } from "../packages/game-core/src/campaignPacingStudy";
import { createConnectedTerrainScene } from "../apps/web/src/experiments/connectedTerrainScene";
import * as T from "three";
import { constrainPacingCamera } from "../apps/web/src/experiments/pacingCameraLimits";

const ring = (x: number, y: number, w: number, h: number) =>
  [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ] as [number, number][];
function fixture(split = false): World {
  const region = (id: number, polygon: [number, number][]) =>
    ({
      id,
      name: "Ironspine",
      polygon,
      terrain: "plains",
      x: 500,
      y: 400,
      area: 640000,
      neighbors: [],
      owner: null,
      garrison: 0,
    }) as unknown as Region;
  return {
    seed: "connected-range",
    regions: split
      ? [
          region(0, ring(100, 100, 400, 600)),
          region(1, ring(500, 100, 400, 600)),
        ]
      : [region(0, ring(100, 100, 800, 600))],
    geography: {
      width: 1000,
      height: 800,
      rivers: [],
      terrainPatches: [
        { terrain: "mountains", contours: [ring(200, 200, 600, 400)] },
      ],
    },
  } as unknown as World;
}

test("mountains fill their geography and remain continuous across administrative splits", () => {
  const a = buildConnectedTerrain(fixture(), 14.3),
    b = buildConnectedTerrain(fixture(true), 14.3);
  assert.deepEqual(a.heights, b.heights);
  assert.equal(a.ranges.filter((s) => s.mountain).length, 1);
  let raised = 0,
    total = 0;
  for (let y = 230; y < 570; y += 10)
    for (let x = 230; x < 770; x += 10) {
      total++;
      if (terrainHeight(a, x, y) > a.peak * 0.15) raised++;
    }
  assert.ok(
    raised / total > 0.95,
    `mountain interior coverage ${raised / total}`,
  );
  assert.ok(
    terrainHeight(a, 190, 400) > 0,
    "foothills extend across biome edges",
  );
  assert.ok(
    terrainHeight(a, 500, 400) > a.peak * 0.15,
    "no artificial east/west trench",
  );
});

test("rivers and sites carve local clearances without shrinking the rest of a range", () => {
  const world = fixture(),
    before = JSON.stringify(world),
    a = buildConnectedTerrain(world, 14.3);
  world.geography!.rivers = [
    [
      [300, 100],
      [300, 700],
    ],
  ];
  const b = buildConnectedTerrain(
    world,
    14.3,
    [{ x: 700, y: 450, radius: 15 }],
    [
      [
        { x: 600, y: 200 },
        { x: 650, y: 560 },
      ],
    ],
  );
  for (let y = 100; y <= 700; y += 3) assert.equal(terrainHeight(b, 300, y), 0);
  for (let k = 0; k < 32; k++) {
    const angle = (k * Math.PI) / 16;
    assert.equal(
      terrainHeight(b, 700 + Math.cos(angle) * 15, 450 + Math.sin(angle) * 15),
      0,
    );
  }
  for (let t = 0; t <= 1; t += 0.01)
    assert.equal(terrainHeight(b, 600 + t * 50, 200 + t * 360), 0);
  assert.equal(terrainHeight(a, 450, 350), terrainHeight(b, 450, 350));
  assert.equal(b.ranges.length, a.ranges.length);
  world.geography!.rivers = [];
  assert.equal(JSON.stringify(world), before);
});

test("water stays flat and terrain sampling agrees with the mesh diagonal", () => {
  const s = buildConnectedTerrain(fixture(), 14.3);
  for (let i = 0; i < s.heights.length; i++) {
    assert.ok(Number.isFinite(s.heights[i]) && s.heights[i] >= 0);
    if (!s.land[i]) assert.equal(s.heights[i], 0);
  }
  assert.equal(terrainHeight(s, -100, 400), 0);
  assert.equal(terrainHeight(s, 950, 400), 0);
  const x = 240,
    y = 180,
    i = y * s.cols + x,
    h = s.heights,
    d = s.step;
  assert.ok(
    Math.abs(
      terrainHeight(s, (x + 0.2) * d, (y + 0.3) * d) -
        (h[i] * 0.5 + h[i + 1] * 0.2 + h[i + s.cols] * 0.3),
    ) < 1e-8,
  );
  assert.ok(
    Math.abs(
      terrainHeight(s, (x + 0.8) * d, (y + 0.7) * d) -
        (h[i + s.cols + 1] * 0.5 + h[i + s.cols] * 0.2 + h[i + 1] * 0.3),
    ) < 1e-8,
  );
  assert.ok(Number.isFinite(terrainGrade(s, 500, 400)));
  const camera = { x: 500, y: 2, z: 400 },
    target = { x: 510, y: 0, z: 405 };
  const ground = (p: { x: number; z: number }) => terrainHeight(s, p.x, p.z);
  constrainPacingCamera(camera, target, ground);
  assert.ok(camera.y >= ground(camera) + 4);
  assert.equal(target.y, ground(target));
});

test("chunk seams share positions/normals and chunk resources are released", () => {
  const s = buildConnectedTerrain(fixture(), 14.3),
    scene = new T.Scene();
  const rendered = createConnectedTerrainScene(
    scene,
    s,
    (x, y, h = 0) => new T.Vector3(x * s.scale, h, y * s.scale),
  );
  assert.ok(rendered.chunks > 1 && rendered.chunks <= 81);
  const edges = new Map<string, { height: number; normal: number[] }>();
  let shared = 0;
  scene.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const p = o.geometry.getAttribute("position"),
      n = o.geometry.getAttribute("normal");
    for (let i = 0; i < p.count; i++) {
      const key = `${Math.round(p.getX(i) + o.position.x)},${Math.round(p.getZ(i) + o.position.z)}`,
        height = p.getY(i),
        normal = [n.getX(i), n.getY(i), n.getZ(i)],
        previous = edges.get(key);
      if (previous) {
        assert.equal(height, previous.height);
        assert.deepEqual(normal, previous.normal);
        shared++;
      } else edges.set(key, { height, normal });
    }
  });
  assert.ok(shared > 100);
  rendered.dispose();
  assert.equal(scene.children.length, 0);
});

test("real country terrain is deterministic, bounded and preserves source geography", () => {
  const { world } = createPacingStudy("Meridian"),
    before = JSON.stringify(world);
  const a = buildConnectedTerrain(world, 14.3),
    b = buildConnectedTerrain(world, 14.3);
  assert.deepEqual(a.heights, b.heights);
  assert.equal(JSON.stringify(world), before);
  assert.ok(a.cols <= 513 && a.rows <= 513);
  assert.ok(a.ranges.some((r) => r.mountain));
  assert.ok(a.peak > 1000, "ranges must be substantial relative to infantry");
  assert.throws(() => buildConnectedTerrain(world, 0));
});
