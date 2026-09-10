import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  makeArmy,
  command,
  advance,
} from "../packages/game-core/src/index.ts";
import {
  advanceTactics,
  syncSquads,
} from "../packages/game-core/src/tactics.ts";
import { coverSite, inCover } from "../packages/game-core/src/cover.ts";
import { worldForPlayer } from "../packages/game-core/src/vision.ts";
import { Store } from "../apps/api/src/store.ts";
function fixture() {
  const w = createWorld("COVER001", "Cover", 4, 10000, 0);
  for (const n of w.nations) n.bot = false;
  const r = w.regions.find((r) => r.owner === 0)!;
  r.polygon = [[r.x - 100, r.y - 100], [r.x + 100, r.y - 100], [r.x + 100, r.y + 100], [r.x - 100, r.y + 100]];
  r.contours = undefined;
  r.area = 40000;
  r.features = [
    { id: "shelter", kind: "settlement", name: "Shelter", x: r.x, y: r.y },
  ];
  w.armies = [makeArmy(0, 0, r.id, "line")];
  w.tactics = undefined;
  syncSquads(w);
  return { w, r, a: w.armies[0] };
}
test("cover orders validate ownership and real cover; soldiers move into cover and new orders cancel it", () => {
  const { w, r, a } = fixture();
  assert.throws(() =>
    command(w, 1, { type: "cover", army: 0, region: r.id, feature: "shelter" }),
  );
  assert.throws(() =>
    command(w, 0, {
      type: "cover",
      army: 0,
      region: r.id,
      feature: "invented",
    }),
  );
  command(w, 0, { type: "cover", army: 0, region: r.id, feature: "shelter" });
  assert.equal(coverSite(w, a)?.name, "Shelter");
  const s = w.tactics!.squads[0];
  s.x += 60;
  assert.equal(inCover(w, a, s), false);
  for (let i = 0; i < 30; i++) advanceTactics(w, 0.1);
  assert(w.tactics!.squads.every((s) => inCover(w, a, s)));
  assert.equal(
    worldForPlayer(w, 1).armies.find((a) => a.id === 0)?.cover,
    undefined,
  );
  command(w, 0, { type: "order", army: 0, order: "hold" });
  assert.equal(a.cover, undefined);
  assert.equal(inCover(w, a, s), false);
});
test("cover goal survives travel and persistence; ownership loss removes it", () => {
  const { w, r, a } = fixture();
  const dest =
    w.regions[r.neighbors.find((id) => w.regions[id].terrain !== "mountains")!];
  dest.owner = 0;
  dest.building = "fort";
  command(w, 0, { type: "cover", army: 0, region: dest.id, feature: "fort" });
  assert.equal(a.order, "redeploy");
  const store = new Store(":memory:");
  try {
    store.create(w, "cover-test");
    assert.deepEqual(store.get(w.id)!.armies[0].cover, a.cover);
    for (let i = 0; i < 10 && a.region !== dest.id; i++) advance(w);
    assert.equal(a.region, dest.id);
    assert.equal(a.cover?.feature, "fort");
    dest.owner = 1;
    advanceTactics(w, 0.1);
    assert.equal(a.cover, undefined);
  } finally {
    store.close();
  }
});
