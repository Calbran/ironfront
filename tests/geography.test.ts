import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateContinent,
  signedArea,
} from "../packages/game-core/src/geography.ts";
import {
  createWorld,
  ownership,
  path,
} from "../packages/game-core/src/index.ts";
test("continental geography is deterministic, dense, and partitioned into connected provinces", () => {
  for (const seats of [2, 4, 8]) {
    const a = generateContinent("Meridian", seats),
      b = generateContinent("Meridian", seats);
    assert.deepEqual(a, b);
    assert.equal(a.regions.length, Math.max(72, seats * 24));
    assert.equal(a.geography.provinces.length, seats * 2);
    assert(a.geography.islands.length > 0);
    assert(a.geography.rivers.length > 0);
    assert(
      a.geography.coastlines.some((r) => signedArea(r) < 0),
      "Inland water is cut out of the continent",
    );
    for (const r of a.regions) {
      assert(r.area > 0);
      assert(r.contours.length > 0);
      assert(r.neighbors.every((n) => a.regions[n].neighbors.includes(r.id)));
    }
    for (const province of a.geography.provinces) {
      const seen = new Set([province.regions[0]]),
        q = [province.regions[0]];
      for (let i = 0; i < q.length; i++)
        for (const n of a.regions[q[i]].neighbors)
          if (a.regions[n].province === province.id && !seen.has(n)) {
            seen.add(n);
            q.push(n);
          }
      assert.equal(seen.size, province.regions.length);
    }
  }
});
test("mountains remain unowned, are excluded from victory, and leave connected passes", () => {
  for (const seed of ["Meridian", "Boreal", "Ironfront"]) {
    const w = createWorld("geo", seed, 4, 10000, 0),
      mountains = w.regions.filter((r) => r.terrain === "mountains"),
      open = w.regions.filter((r) => r.terrain !== "mountains");
    assert(mountains.length > 0);
    assert(
      mountains.every(
        (r) => r.owner === null && r.garrison === 0 && r.building === null,
      ),
    );
    assert(
      w.nations.every((n) => w.regions[n.capital].terrain !== "mountains"),
    );
    const start = open[0].id;
    for (const r of open) assert(path(w, start, r.id).length > 0);
    for (const r of mountains) assert.equal(path(w, start, r.id).length, 0);
    open.forEach((r) => (r.owner = 0));
    assert(Math.abs(ownership(w)[0].percent - 100) < 0.00001);
  }
});
