import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  upgradeWorld,
  command,
  type Region,
} from "../packages/game-core/src/index.ts";
import {
  localPath,
  localSegment,
  onLocalLand,
  stepLocal,
} from "../packages/game-core/src/localMovement.ts";
import { blockedByMountains } from "../packages/game-core/src/mountainObstacles.ts";
import { syncSquads } from "../packages/game-core/src/tactics.ts";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
function fixture() {
  const w = createWorld("OBSTACLE", "Boreal", 4, 3600000, Date.now());
  syncSquads(w);
  const s = w.tactics!.squads.find((s) => s.owner === 0)!;
  const r = w.regions[s.region];
  Object.assign(r, {
    terrain: "plains",
    x: 100,
    y: 200,
    polygon: [
      [0, 0],
      [600, 0],
      [600, 400],
      [0, 400],
    ],
    contours: undefined,
    navigationCellSize: 16,
    mountainObstacles: [{ x: 300, y: 200, radius: 75 }],
  });
  Object.assign(s, { x: 100, y: 200, previousX: 100, previousY: 200 });
  return { w, s, r };
}
test("ground detours around mountain footprints, rejects interior destinations; air flies across", () => {
  const { r } = fixture(),
    start = { x: 100, y: 200 },
    end = { x: 500, y: 200 };
  assert(!localSegment(r, start, end));
  assert(!onLocalLand(r, { x: 300, y: 200 }));
  assert.throws(() => localPath(r, start, { x: 300, y: 200 }));
  const route = localPath(r, start, end);
  assert(route.length > 1);
  let at = start;
  for (const p of route) {
    assert(!blockedByMountains(r.mountainObstacles, at, p));
    at = p;
  }
  assert.deepEqual(localPath(r, start, end, "air"), [end]);
  assert(
    onLocalLand({ ...r, terrain: "mountains" }, { x: 300, y: 200 }, "air"),
  );
});
test("saved routes are rechecked before movement; airborne squads remain exempt", () => {
  for (const layer of ["ground", "air"] as const) {
    const { w, s, r } = fixture();
    s.movementLayer = layer;
    s.localOrder = {
      region: r.id,
      mode: "move",
      waypoints: [{ x: 500, y: 200 }],
      path: [{ x: 500, y: 200, region: r.id }],
    };
    s.independent = true;
    for (let i = 0; i < 300 && s.localOrder.path.length; i++) {
      const before = { x: s.x, y: s.y };
      stepLocal(w, s, 0.05, 60);
      assert(!blockedByMountains(r.mountainObstacles, before, s, layer));
    }
    assert(Math.hypot(s.x - 500, s.y - 200) < 0.01);
  }
});
test("mountain geometry is saved idempotently and rejected API orders are atomic", async () => {
  const { w, s, r } = fixture();
  const saved = JSON.parse(JSON.stringify(w));
  const mountains = structuredClone(saved.mountainScenery);
  upgradeWorld(saved);
  assert.deepEqual(saved.mountainScenery, mountains);
  const store = new Store(":memory:");
  store.create(w, "mountain-token");
  const app = await makeServer(store);
  try {
    const before = JSON.stringify(store.get(w.id));
    const result = await app.inject({
      method: "POST",
      url: "/api/command",
      headers: { authorization: "Bearer mountain-token" },
      payload: {
        type: "squad-order",
        squads: [s.id],
        mode: "move",
        points: [{ x: 300, y: 200 }],
      },
    });
    assert.equal(result.statusCode, 400);
    assert.equal(JSON.stringify(store.get(w.id)), before);
  } finally {
    await app.close();
    store.close();
  }
});

test("mountain footprints and ground detours survive a real database reopen", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "ironfront-mountains-"));
  const { w, s, r } = fixture();
  s.localOrder = {
    region: r.id,
    mode: "move",
    waypoints: [{ x: 500, y: 200 }],
    path: localPath(r, s, { x: 500, y: 200 }).map((p) => ({
      ...p,
      region: r.id,
    })),
  };
  s.independent = true;
  let store = new Store(join(dir, "save.sqlite"));
  try {
    store.create(w, "restart-mountains");
    store.close();
    store = new Store(join(dir, "save.sqlite"));
    const restored = store.get(w.id)!;
    assert.deepEqual(restored.mountainScenery, w.mountainScenery);
    assert.deepEqual(
      restored.regions[r.id].mountainObstacles,
      r.mountainObstacles,
    );
    const saved = restored.tactics!.squads.find((v) => v.id === s.id)!;
    for (let i = 0; i < 300 && saved.localOrder!.path.length; i++) {
      const before = { x: saved.x, y: saved.y };
      stepLocal(restored, saved, 0.05, 60);
      assert(
        !blockedByMountains(
          restored.regions[r.id].mountainObstacles,
          before,
          saved,
        ),
      );
    }
    assert(Math.hypot(saved.x - 500, saved.y - 200) < 0.01);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
