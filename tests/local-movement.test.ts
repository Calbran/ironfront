import { refreshAttack } from "../packages/game-core/src/attackOrders.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createWorld,
  command,
  type Region,
} from "../packages/game-core/src/index.ts";
import {
  advanceTactics,
  syncSquads,
} from "../packages/game-core/src/tactics.ts";
import {
  stepLocal,
  movementSpeed,
  localSpeed,
  localPath,
  localSegment,
  onLocalLand,
} from "../packages/game-core/src/localMovement.ts";
import { worldForPlayer } from "../packages/game-core/src/vision.ts";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
function fixture() {
  const w = createWorld("LOCAL", "Boreal", 4, 3600000, 0);
  w.nations.forEach((n) => (n.bot = false));
  syncSquads(w);
  const s = w.tactics!.squads.find((s) => s.army === 0)!;
  const r = w.regions[s.region];
  r.terrain = "plains";
  r.polygon = [
    [0, 0],
    [200, 0],
    [200, 200],
    [0, 200],
  ];
  r.contours = [r.polygon as [number, number][]];
  r.x = 100;
  r.y = 100;
  r.area = 40000;
  s.x = 20;
  s.y = 20;
  s.previousX = 20;
  s.previousY = 20;
  return { w, s, r };
}
test("local routes go around a lake and concave coast without leaving the territory", () => {
  const { r } = fixture();
  r.contours!.push([
    [70, 50],
    [70, 150],
    [130, 150],
    [130, 50],
  ]);
  for (const shape of [
    r,
    {
      ...r,
      contours: [
        [
          [0, 0],
          [200, 0],
          [200, 40],
          [40, 40],
          [40, 160],
          [200, 160],
          [200, 200],
          [0, 200],
        ],
      ],
    } as Region,
  ]) {
    const start = { x: 20, y: 20 },
      end = { x: 180, y: 180 };
    assert(!localSegment(shape, start, end));
    const path = localPath(shape, start, end);
    assert(path.length > 1);
    let previous = start;
    for (const next of path) {
      assert(localSegment(shape, previous, next));
      previous = next;
    }
    assert.deepEqual(path.at(-1), end);
  }
  assert.throws(
    () => localPath(r, { x: 20, y: 20 }, { x: 100, y: 100 }),
    /land/,
  );
});
test("squad waypoints progress without teleporting, Hold stays exact, army orders supersede", () => {
  const { w, s, r } = fixture();
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "move",
    points: [{ x: 100, y: 20 }],
  });
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "move",
    points: [{ x: 100, y: 100 }],
    append: true,
  });
  assert.equal(s.localOrder!.waypoints.length, 2);
  const before = s.x;
  advanceTactics(w, 0.1);
  assert(s.x > before && s.x < 30);
  assert.equal(s.y, 20);
  for (let i = 0; i < 100; i++) {
    advanceTactics(w, 0.1);
    assert(onLocalLand(r, s));
  }
  assert(Math.abs(s.x - 100) < 1e-8 && Math.abs(s.y - 100) < 1e-8);
  assert.equal(s.localOrder!.mode, "hold");
  advanceTactics(w, 1);
  assert.equal(s.x, 100);
  assert.equal(s.y, 100);
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "move",
    points: [{ x: 180, y: 180 }],
  });
  advanceTactics(w, 0.1);
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "hold",
    points: [],
  });
  const held = { x: s.x, y: s.y };
  advanceTactics(w, 1);
  assert.deepEqual({ x: s.x, y: s.y }, held);
  command(w, 0, { type: "order", army: 0, order: "hold" });
  assert.equal(s.localOrder, undefined);
});
test("group commands validate atomically, reject hostile squads, and hide enemy routes", () => {
  const { w, s } = fixture();
  const other = w.tactics!.squads.find((s) => s.owner === 1)!;
  const before = structuredClone(w);
  assert.throws(
    () =>
      command(w, 0, {
        type: "squad-order",
        squads: [s.id, other.id],
        mode: "move",
        points: [{ x: 40, y: 40 }],
      }),
    /own/,
  );
  assert.deepEqual(w, before);
  assert.throws(
    () =>
      command(w, 0, {
        type: "squad-order",
        squads: [s.id],
        mode: "move",
        points: [{ x: NaN, y: 40 }],
      }),
    /land/,
  );
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "move",
    points: [{ x: 100, y: 20 }],
  });
  assert(
    worldForPlayer(w, 0).tactics!.squads.find((v) => v.id === s.id)!.localOrder,
  );
  assert(
    worldForPlayer(w, 1).tactics!.squads.every(
      (v) => v.owner === 1 || !v.localOrder,
    ),
  );
  w.winner = [0];
  assert.throws(
    () =>
      command(w, 0, {
        type: "squad-order",
        squads: [s.id],
        mode: "hold",
        points: [],
      }),
    /ended/,
  );
});
test("local orders survive reopen and API authorization preserves state on rejection", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ironfront-local-"));
  let store = new Store(join(dir, "db.sqlite"));
  let app = await makeServer(store);
  try {
    const { w, s } = fixture();
    store.create(w, "local-owner");
    const payload = {
      type: "squad-order",
      squads: [s.id],
      mode: "move",
      points: [{ x: 100, y: 20 }],
    };
    assert.equal(
      (await app.inject({ method: "POST", url: "/api/command", payload }))
        .statusCode,
      401,
    );
    const headers = { authorization: "Bearer local-owner" };
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/command",
          headers,
          payload,
        })
      ).statusCode,
      200,
    );
    const checkpoint = store.get(w.id)!;
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/command",
          headers,
          payload: { ...payload, points: [{ x: 500, y: 500 }] },
        })
      ).statusCode,
      400,
    );
    assert.deepEqual(store.get(w.id), checkpoint);
    await app.close();
    store.close();
    store = new Store(join(dir, "db.sqlite"));
    app = await makeServer(store);
    const restored = store.get(w.id)!;
    assert.deepEqual(restored.tactics!.squads, checkpoint.tactics!.squads);
    const uninterrupted = structuredClone(checkpoint);
    advanceTactics(restored, 0.2);
    advanceTactics(uninterrupted, 0.2);
    assert.deepEqual(restored, uninterrupted);
  } finally {
    await app.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("group orders use the slowest live member, survive persistence and detach on a separate order", () => {
  const { w, s, r } = fixture();
  const mobile = w.tactics!.squads.find(
    (v) => v.owner === 0 && v.kind === "motorized",
  )!;
  mobile.region = s.region;
  mobile.x = s.x;
  mobile.y = s.y;
  const order = (ids: string[]) =>
    command(w, 0, {
      type: "squad-order",
      squads: ids,
      mode: "move",
      points: [{ x: 150, y: 20 }],
    });
  order([s.id, mobile.id]);
  const group = s.localOrder!.movementGroup;
  assert.notEqual(group, undefined);
  assert.equal(mobile.localOrder!.movementGroup, group);
  s.suppression = 0.5;
  stepLocal(w, s, 0.1);
  stepLocal(w, mobile, 0.1);
  assert(Math.abs(s.x - mobile.x) < 1e-9);
  const store = new Store(":memory:");
  try {
    store.create(w, "group-fixture");
    const saved = store.get(w.id)!;
    assert.equal(
      saved.tactics!.squads.find((v) => v.id === s.id)!.localOrder!
        .movementGroup,
      group,
    );
    assert.equal(saved.tactics!.movementSequence, w.tactics!.movementSequence);
  } finally {
    store.close();
  }
  order([mobile.id]);
  assert.equal(mobile.localOrder!.movementGroup, undefined);
  const beforeInfantry = s.x,
    beforeMobile = mobile.x;
  stepLocal(w, s, 0.1);
  stepLocal(w, mobile, 0.1);
  assert(mobile.x - beforeMobile > s.x - beforeInfantry);
  order([s.id, mobile.id]);
  assert.notEqual(s.localOrder!.movementGroup, group);
  s.strength = 0;
  assert.equal(movementSpeed(w, mobile), localSpeed(w, mobile));
});

test("group move orders assign stable lanes and keep vehicles beside infantry", () => {
  const { w, s } = fixture();
  const infantry = w.tactics!.squads.find(
    (v) => v.owner === 0 && v.id !== s.id && v.kind === "infantry",
  )!;
  const mobile = w.tactics!.squads.find(
    (v) => v.owner === 0 && v.kind === "motorized",
  )!;
  for (const squad of [infantry, mobile]) {
    squad.region = s.region;
    squad.x = s.x;
    squad.y = s.y;
  }
  command(w, 0, {
    type: "squad-order",
    squads: [mobile.id, s.id, infantry.id],
    mode: "move",
    points: [{ x: 150, y: 20 }],
  });
  const destinations = [s, infantry, mobile].map(
    (squad) => squad.localOrder!.waypoints[0],
  );
  assert.equal(new Set(destinations.map((p) => `${p.x},${p.y}`)).size, 3);
  for (let i = 0; i < destinations.length; i++)
    for (let j = i + 1; j < destinations.length; j++)
      assert(
        Math.hypot(
          destinations[i].x - destinations[j].x,
          destinations[i].y - destinations[j].y,
        ) >= 8,
      );
  assert.equal(mobile.localOrder!.waypoints[0].x, 150);
  assert.notEqual(
    mobile.localOrder!.waypoints[0].y,
    s.localOrder!.waypoints[0].y,
  );

  const saved = structuredClone(w);
  assert.deepEqual(saved.tactics!.squads, w.tactics!.squads);
  for (let i = 0; i < 100; i++) advanceTactics(w, 0.1);
  assert.equal(
    new Set([s, infantry, mobile].map((squad) => `${squad.x},${squad.y}`)).size,
    3,
  );
});

test("explicit attacks prioritize a visible target, persist, and cancel on Hold or target loss", () => {
  const { w, s, r } = fixture();
  r.owner = null;
  const enemy = {
    ...s,
    id: `garrison-${r.id}`,
    army: null,
    owner: null,
    kind: "garrison" as const,
    x: 50,
    y: 20,
    previousX: 50,
    previousY: 20,
    strength: 100,
  };
  r.garrison = 100;
  w.tactics!.squads.push(enemy);
  command(w, 0, { type: "squad-attack", squads: [s.id], target: enemy.id });
  assert.equal(s.localOrder!.attackTarget, enemy.id);
  advanceTactics(w, 0.05);
  assert.equal(s.target, enemy.id);
  assert.equal(s.action, "firing");
  assert(enemy.strength < 100);
  const store = new Store(":memory:");
  try {
    store.create(w, "attack-fixture");
    assert.equal(
      store.get(w.id)!.tactics!.squads.find((v) => v.id === s.id)!.localOrder!
        .attackTarget,
      enemy.id,
    );
  } finally {
    store.close();
  }
  const before = structuredClone(w);
  assert.throws(() =>
    command(w, 0, { type: "squad-attack", squads: [s.id], target: s.id }),
  );
  assert.deepEqual(w, before);
  enemy.strength = 0;
  refreshAttack(w, s);
  assert.equal(s.localOrder!.attackTarget, undefined);
  assert.equal(s.localOrder!.path.length, 0);
  enemy.strength = 100;
  command(w, 0, { type: "squad-attack", squads: [s.id], target: enemy.id });
  command(w, 0, {
    type: "squad-order",
    squads: [s.id],
    mode: "hold",
    points: [],
  });
  assert.equal(s.localOrder!.attackTarget, undefined);
});
