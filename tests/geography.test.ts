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
test("continental geography is deterministic, compact, and partitioned into connected provinces", () => {
  for (const seats of [2, 4, 8]) {
    const a = generateContinent("Meridian", seats),
      b = generateContinent("Meridian", seats);
    assert.deepEqual(a, b);
    assert.equal(a.regions.length, seats * 24);
    assert.equal(a.geography.provinces.length, seats * 2);
    assert(a.geography.islands.length > 0);
    assert(a.geography.rivers.length > 0);
    const coastArea = a.geography.coastlines.reduce(
      (sum, ring) => sum + signedArea(ring),
      0,
    );
    const landArea = a.regions.reduce((sum, r) => sum + r.area, 0);
    assert(
      Math.abs(coastArea - landArea) / landArea < 0.01,
      "Coastal rings correctly account for land and inland water",
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

test("seeds change the broad mainland silhouette, not just its coastal detail", () => {
  const maps = ["Meridian", "Boreal", "Ironfront"].map((seed) =>
    generateContinent(seed, 4),
  );
  const mask = (map: (typeof maps)[number]) => {
    const inside = (x: number, y: number) => {
      let land = false;
      for (const ring of map.geography.coastlines)
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const a = ring[i],
            b = ring[j];
          if (
            a[1] > y !== b[1] > y &&
            x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
          )
            land = !land;
        }
      return land;
    };
    return Array.from({ length: 60 * 40 }, (_, i) =>
      inside(
        (((i % 60) + 0.5) * map.geography.width) / 60,
        ((Math.floor(i / 60) + 0.5) * map.geography.height) / 40,
      ),
    );
  };
  const masks = maps.map(mask);
  for (let i = 0; i < masks.length; i++)
    for (let j = i + 1; j < masks.length; j++) {
      const union = masks[i].filter((v, k) => v || masks[j][k]).length;
      const changed = masks[i].filter((v, k) => v !== masks[j][k]).length;
      assert(
        changed / union > 0.15,
        "Different seeds must visibly reshape the continent",
      );
    }
});

test("more nations expand world and mainland area while preserving territory scale", () => {
  for (const seed of ["Meridian", "Boreal"]) {
    let previous = 0;
    const perTerritory: number[] = [];
    for (const seats of [2, 3, 4, 6, 8]) {
      const { geography, regions } = generateContinent(seed, seats);
      const area = regions.reduce((sum, region) => sum + region.area, 0);
      assert(area > previous, "Mainland must grow when seats increase");
      previous = area;
      assert(
        Math.abs(
          (geography.width * geography.height) / (14400 * 9600) - seats / 4,
        ) < 0.02,
      );
      perTerritory.push(area / regions.length);
      assert(
        regions.every(
          (r) =>
            r.x >= 0 &&
            r.x <= geography.width &&
            r.y >= 0 &&
            r.y <= geography.height,
        ),
      );
    }
    assert(
      Math.max(...perTerritory) / Math.min(...perTerritory) < 1.08,
      "Average territory area should remain stable across nation counts",
    );
  }
});

test("twenty Earth-derived seeds produce connected terrain, merging drainage, and strategic bottlenecks", () => {
  let worldsWithBottlenecks = 0;
  const silhouettes = new Set<string>();
  for (let index = 0; index < 20; index++) {
    const seed = `Survey-${index}`;
    const { regions, geography } = generateContinent(seed, 4);
    assert.equal(geography.version, 6);
    assert.equal(new Set(geography.sources).size, 2);
    silhouettes.add(JSON.stringify(geography.coastlines));
    const open = regions.filter((r) => r.terrain !== "mountains");
    assert(open.length > regions.length * 0.65);
    assert(
      open.length < regions.length,
      `${seed}: real relief must produce mountains`,
    );
    for (const r of regions) {
      assert(
        r.coastal || r.neighbors.length > 1,
        `${seed}: inland territory ${r.id} must not be enclosed by one neighbor`,
      );
      assert.equal(
        r.contours.filter((ring) => signedArea(ring) > 0).length,
        1,
        `${seed}: territory ${r.id} must not jump a water channel`,
      );
      assert(
        Number.isFinite(r.elevation) && r.elevation >= 0 && r.elevation <= 1,
      );
      assert(Number.isFinite(r.moisture) && r.moisture >= 0 && r.moisture <= 1);
    }
    const componentsWithout = (excluded: number) => {
      const seen = new Set([excluded]);
      const sizes: number[] = [];
      for (const r of open) {
        if (seen.has(r.id)) continue;
        const queue = [r.id];
        seen.add(r.id);
        for (let i = 0; i < queue.length; i++)
          for (const n of regions[queue[i]].neighbors) {
            if (regions[n].terrain !== "mountains" && !seen.has(n)) {
              seen.add(n);
              queue.push(n);
            }
          }
        sizes.push(queue.length);
      }
      return sizes;
    };
    assert.deepEqual(
      componentsWithout(-1),
      [open.length],
      `${seed}: land routes remain connected`,
    );
    if (
      open.some(
        (r) => componentsWithout(r.id).filter((n) => n >= 3).length >= 2,
      )
    )
      worldsWithBottlenecks++;
    const riverEdges = new Set<string>();
    for (const river of geography.rivers) {
      assert.equal(
        new Set(river.map((p) => p.join(","))).size,
        river.length,
        "No drainage loops",
      );
      for (let i = 1; i < river.length; i++) {
        assert(
          Math.hypot(
            river[i][0] - river[i - 1][0],
            river[i][1] - river[i - 1][1],
          ) <=
            geography.cellSize * Math.SQRT2 + 0.01,
        );
        const edge = `${river[i - 1]}:${river[i]}`;
        assert(
          !riverEdges.has(edge),
          "Tributaries join existing rivers instead of retracing them",
        );
        riverEdges.add(edge);
      }
    }
  }
  assert.equal(silhouettes.size, 20);
  assert(
    worldsWithBottlenecks >= 12,
    "Most sampled worlds should have meaningful land necks or passes",
  );
});

test("local features stay inside their territories and settlement sizes vary", () => {
  const sizes = new Set<string>();
  const inside = (x: number, y: number, rings: number[][][]) => {
    let result = false;
    for (const ring of rings)
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i],
          b = ring[j];
        if (
          a[1] > y !== b[1] > y &&
          x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
        )
          result = !result;
      }
    return result;
  };
  for (const seed of ["Meridian", "Boreal", "Ironfront", "Survey-1"]) {
    const { regions, geography } = generateContinent(seed, 4);
    const areas = regions.map((r) => r.area).sort((a, b) => a - b);
    assert(
      areas[Math.floor(areas.length * 0.8)] /
        areas[Math.floor(areas.length * 0.2)] >
        3,
      "Large and compact territories must remain visibly distinct",
    );
    assert(
      areas[0] > (areas.reduce((a, b) => a + b, 0) / areas.length) * 0.05,
      "Sampled compact regions should not collapse into token slivers",
    );
    const ids = new Set<string>();
    for (const r of regions) {
      for (const f of r.features ?? []) {
        assert(!ids.has(f.id));
        ids.add(f.id);
        assert(inside(f.x, f.y, r.contours), `${f.id} must be on its own land`);
        if (f.kind === "settlement") {
          assert.notEqual(r.terrain, "mountains");
          assert(f.size);
          sizes.add(f.size);
        }
      }
    }
    const patchArea = geography.terrainPatches!.reduce(
      (sum, patch) =>
        sum + patch.contours.reduce((a, ring) => a + signedArea(ring), 0),
      0,
    );
    assert.equal(
      patchArea,
      regions.reduce((a, r) => a + r.area, 0),
      "Local terrain partitions the same mainland",
    );
  }
  assert.equal(sizes.size, 5);
});

// Baselines are measured version-3 mainland areas, not a duplicate generator formula.
test("expanded maps retain usable land at the new territory density", () => {
  for (const [seed, oldArea] of [
    ["Meridian", 695552],
    ["Boreal", 1280128],
    ["Ironfront", 1402112],
  ] as const) {
    const { regions, geography } = generateContinent(seed, 4);
    assert.equal(regions.length, 96);
    const ratio = regions.reduce((n, r) => n + r.area, 0) / oldArea;
    assert(ratio > 35.1 && ratio < 36.9);
    assert(geography.width > 4000 && geography.height > 3000);
  }
});

test("new nations have connected starts separated by neutral expansion land", () => {
  for (const seats of [2, 4, 8])
    for (const seed of ["Meridian", "Boreal", "Ironfront"]) {
      const w = createWorld("spacing", seed, seats, 10000, 0);
      const owned = w.regions.filter((r) => r.owner !== null);
      assert.equal(owned.length, seats * 4);
      assert(
        w.regions.filter((r) => r.owner === null && r.terrain !== "mountains")
          .length >
          owned.length * 2,
      );
      for (const n of w.nations) {
        const ids = w.regions.filter((r) => r.owner === n.id).map((r) => r.id),
          seen = new Set([n.capital]),
          queue = [n.capital];
        for (let i = 0; i < queue.length; i++)
          for (const next of w.regions[queue[i]].neighbors)
            if (ids.includes(next) && !seen.has(next)) {
              seen.add(next);
              queue.push(next);
            }
        assert.equal(seen.size, 4);
      }
      for (const a of owned)
        for (const b of owned.filter((b) => b.owner !== a.owner))
          assert(
            path(w, a.id, b.id).length >= 4,
            `${seed}/${seats}: two neutral regions should separate starting borders`,
          );
    }
});

test("generated farmland reserves rural space before towns are placed", () => {
  const { regions } = generateContinent("Boreal", 4);
  const farms = regions.filter((r) => r.landUse === "agricultural");
  assert(farms.length > 0);
  assert(farms.some((r) => !r.features?.some((f) => f.kind === "settlement")));
  for (const r of farms) {
    const towns = r.features!.filter((f) => f.kind === "settlement");
    assert(towns.length <= 1);
    assert(towns.every((f) => f.size === "hamlet" || f.size === "village"));
  }
});
