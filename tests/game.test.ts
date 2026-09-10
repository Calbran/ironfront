import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  command,
  createWorld,
  generateRegions,
  ownership,
  path,
  BUILDINGS,
  offensivePath,
} from "../packages/game-core/src/index.ts";

test("seeded continents are repeatable, connected, and scale with seats", () => {
  for (const seats of [2, 4, 8]) {
    const r = generateRegions("Meridian", seats);
    assert.deepEqual(r, generateRegions("Meridian", seats));
    assert.equal(r.length, seats * 24);
    assert(r.every((r) => r.area > 0));
    const w = createWorld("test", "Meridian", seats, 10000, 0);
    const start = r.find((r) => r.terrain !== "mountains")!.id;
    for (const region of r.filter((r) => r.terrain !== "mountains"))
      assert(path(w, start, region.id).length > 0);
    assert.equal(new Set(w.nations.map((n) => n.capital)).size, seats);
    assert(
      w.nations.every(
        (n) => w.regions.filter((r) => r.owner === n.id).length === 4,
      ),
    );
  }
});
test("scoring counts physical area and never buildings", () => {
  const w = createWorld("t", "Area", 4, 1, 0);
  const before = ownership(w);
  for (const r of w.regions) r.building = "factory";
  assert.deepEqual(ownership(w), before);
  const shares = before.reduce((s, n) => s + n.percent, 0);
  assert(shares > 0 && shares < 100);
});
test("construction charges once, completes after its duration, and rejects hostile building", () => {
  const w = createWorld("t", "Build", 4, 1, 0);
  w.nations.forEach((n) => (n.bot = false));
  const r = w.regions.find((r) => r.owner === 0 && !r.building)!;
  const old = w.nations[0].industry;
  command(w, 0, { type: "build", region: r.id, building: "refinery" });
  assert.equal(w.nations[0].industry, old - BUILDINGS.refinery.cost);
  assert.throws(() =>
    command(w, 0, { type: "build", region: r.id, building: "refinery" }),
  );
  assert.throws(() =>
    command(w, 1, { type: "build", region: r.id, building: "fort" }),
  );
  for (let i = 0; i < 6; i++) advance(w);
  assert.equal(r.building, "refinery");
  assert.equal(r.construction, null);
});
test("standing objective eventually captures neutral territory without further commands", () => {
  const w = createWorld("t", "Orders", 4, 1, 0);
  w.nations.forEach((n) => (n.bot = false));
  const target = w.regions
    .filter(
      (r) =>
        r.owner === null &&
        r.terrain !== "mountains" &&
        offensivePath(w, w.armies[0], r.id).length > 1,
    )
    .sort(
      (a, b) =>
        path(w, w.armies[0].region, a.id).length -
        path(w, w.armies[0].region, b.id).length,
    )[0];
  command(w, 0, {
    type: "order",
    army: 0,
    order: "advance",
    target: target.id,
  });
  for (let i = 0; i < 70 && target.owner !== 0; i++) advance(w);
  assert.equal(target.owner, 0);
  assert(w.events.some((e) => e.text.includes("captured")));
  assert.throws(() => command(w, 1, { type: "order", army: 0, order: "hold" }));
});
test("majority must persist; finished campaigns reject commands", () => {
  const w = createWorld("t", "Victory", 2, 1, 0);
  w.nations.forEach((n) => (n.bot = false));
  w.regions.forEach((r) => (r.owner = 0));
  for (let i = 0; i < 47; i++) advance(w);
  assert.equal(w.winner, null);
  advance(w);
  assert.deepEqual(w.winner, [0]);
  assert.throws(() => command(w, 0, { type: "order", army: 0, order: "hold" }));
  const hour = w.hour;
  advance(w);
  assert.equal(w.hour, hour);
});
test("672-hour bot simulations stay deterministic with finite, nonnegative resources", () => {
  for (const seed of ["Meridian", "Brass", "Frost"]) {
    const a = createWorld("t", seed, 4, 1, 0),
      b = structuredClone(a);
    for (let i = 0; i < 672; i++) {
      advance(a);
      advance(b);
      for (const n of a.nations)
        for (const key of ["industry", "fuel", "manpower"] as const)
          assert(
            Number.isFinite(n[key]) && n[key] >= 0,
            `${seed} ${key} at ${a.hour}`,
          );
      assert(a.armies.every((a) => a.strength >= 0 && a.strength <= 100));
    }
    assert.deepEqual(a, b);
    assert.notEqual(a.winner, null);
  }
});
