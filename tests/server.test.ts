import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../apps/api/src/store.ts";
import { makeServer } from "../apps/api/src/server.ts";
import { createWorld } from "../packages/game-core/src/index.ts";

test("two sessions share a persistent campaign but cannot command one another", async () => {
  const dir = mkdtempSync(join(tmpdir(), "warfare-"));
  const file = join(dir, "test.sqlite");
  let store = new Store(file);
  let app = await makeServer(store);
  try {
    const create = await app.inject({
      method: "POST",
      url: "/api/campaigns",
      payload: {
        name: "First Nation",
        faction: "iron",
        seed: "Test",
        seats: 4,
        pace: "test",
      },
    });
    assert.equal(create.statusCode, 200);
    const token = create.json().token,
      headers = { authorization: "Bearer " + token };
    const view = (await app.inject({ url: "/api/world", headers })).json();
    const id = view.world.id;
    const joined = await app.inject({
      method: "POST",
      url: "/api/join",
      payload: { name: "Second Nation", faction: "crown", code: id },
    });
    assert.equal(joined.statusCode, 200);
    const second = { authorization: "Bearer " + joined.json().token };
    const view2 = (
      await app.inject({ url: "/api/world", headers: second })
    ).json();
    assert.equal(view2.owner, 1);
    assert.equal(view2.world.id, id);
    assert.equal((await app.inject({ url: "/api/world" })).statusCode, 401);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/command",
          headers: second,
          payload: { type: "order", army: 0, order: "recover" },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/advance",
          headers: second,
          payload: {},
        })
      ).statusCode,
      400,
    );
    const own = view.world.regions.find(
      (r: any) => r.owner === 0 && !r.building,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/command",
          headers,
          payload: { type: "build", region: own.id, building: "depot" },
        })
      ).statusCode,
      200,
    );
    const before = store.get(id)!;
    await app.close();
    store.close();
    store = new Store(file);
    app = await makeServer(store);
    const restored = (await app.inject({ url: "/api/world", headers })).json();
    assert.equal(restored.owner, 0);
    assert.deepEqual(restored.world, before);
    assert.equal(restored.world.regions[own.id].construction.kind, "depot");
    assert.equal(store.tick(id, before.nextTickAt), true);
    assert.equal(store.tick(id, before.nextTickAt), false);
    assert.equal(store.get(id)!.hour, 1);
    const snapshot = store.get(id);
    assert.throws(() =>
      store.mutate(id, (w) => {
        w.nations[0].industry = -100;
        throw Error("rollback");
      }),
    );
    assert.deepEqual(store.get(id), snapshot);
  } finally {
    await app.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("restart pauses downtime and normal campaigns reject manual advancement", async () => {
  const store = new Store(":memory:");
  const w = createWorld("PAUSE", "Pause", 2, 3600000, 0);
  store.create(w, "private-token");
  store.resume(999999999);
  assert.equal(store.get("PAUSE")!.hour, 0);
  assert.equal(store.get("PAUSE")!.nextTickAt, 999999999 + 3600000);
  const app = await makeServer(store);
  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/advance",
      headers: { authorization: "Bearer private-token" },
      payload: {},
    });
    assert.equal(response.statusCode, 400);
    assert.equal(store.get("PAUSE")!.hour, 0);
  } finally {
    await app.close();
    store.close();
  }
});

test("front plans and reserves survive reopen; invalid sector commands roll back atomically", async () => {
  const dir = mkdtempSync(join(tmpdir(), "warfare-fronts-"));
  const file = join(dir, "fronts.sqlite");
  let store = new Store(file);
  const w = createWorld("FRONTS01", "Persistence", 4, 10000, 0);
  w.nations.forEach((n) => (n.bot = false));
  store.create(w, "front-plan-session");
  let app = await makeServer(store);
  const headers = { authorization: "Bearer front-plan-session" };
  try {
    const army = w.armies.find((a) => a.owner === 0)!;
    const neighbor = w.regions[army.region].neighbors.find(
      (id) => w.regions[id].owner === 0,
    )!;
    const post = (payload: unknown) =>
      app.inject({
        method: "POST",
        url: "/api/command",
        headers,
        payload: payload as any,
      });
    assert.equal(
      (
        await post({
          type: "sector",
          army: army.id,
          regions: [army.region, neighbor],
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (
        await post({
          type: "policy",
          army: army.id,
          risk: "cautious",
          fallback: neighbor,
        })
      ).statusCode,
      200,
    );
    const before = store.get(w.id)!;
    assert.equal(
      (
        await post({
          type: "sector",
          army: army.id,
          regions: [army.region, 999999],
        })
      ).statusCode,
      400,
    );
    assert.deepEqual(store.get(w.id), before);
    assert.equal(
      (
        await post({
          type: "sector",
          army: army.id,
          regions: [army.region, army.region],
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await post({
          type: "policy",
          army: army.id,
          risk: "reckless",
          fallback: null,
        })
      ).statusCode,
      400,
    );
    const mobile = w.armies.find((a) => a.owner === 0 && a.role === "mobile")!;
    assert.equal(
      (
        await post({
          type: "order",
          army: mobile.id,
          order: "redeploy",
          target: army.region,
        })
      ).statusCode,
      200,
    );
    const checkpoint = store.get(w.id)!;
    await app.close();
    store.close();
    store = new Store(file);
    app = await makeServer(store);
    assert.deepEqual(store.get(w.id), checkpoint);
    const uninterrupted = new Store(":memory:");
    try {
      uninterrupted.create(checkpoint, "reference");
      for (let i = 0; i < 8; i++) {
        store.tick(w.id, i * 10000, true);
        uninterrupted.tick(w.id, i * 10000, true);
      }
      assert.deepEqual(store.get(w.id), uninterrupted.get(w.id));
    } finally {
      uninterrupted.close();
    }
  } finally {
    await app.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
