import test from "node:test";
import assert from "node:assert/strict";
import { segmentDistance } from "../packages/game-core/src/organicCity";
import {
  createCityTactics,
  obstacleDistance,
} from "../packages/game-core/src/cityTactics";
import {
  planCombinedDistrict,
  combinedPosition,
} from "../packages/game-core/src/combinedDistrict";

test("city tactical geometry blocks buildings and water, preserves gates and bridges, and provides valid routes", () => {
  for (const seed of [732, 735]) {
    const data = createCityTactics(
      planCombinedDistrict(seed, "worldgen", true),
      seed,
      "worldgen",
    );
    assert.ok(data.obstacles.length > 600);
    const openGround = [];
    for (let x = -140; x <= 140 && !openGround.length; x += 5)
      for (let z = -140; z <= 140; z += 5) {
        const p = { x, z };
        if (
          data.walkable(p, "vehicle") &&
          Math.hypot(x, z) > 40 &&
          data.streets.every((s) =>
            s.points
              .slice(1)
              .every(
                (b, i) => segmentDistance(p, s.points[i], b) > s.width / 2 + 2,
              ),
          )
        ) {
          openGround.push(p);
          break;
        }
      }
    assert.ok(
      openGround.length,
      "tanks can occupy clear ground outside streets and the plaza",
    );
    const destination = openGround[0],
      nearby = { x: destination.x + 0.1, z: destination.z };
    assert.ok(
      data.route(nearby, destination, "vehicle").length,
      "off-road destinations accept tank routes",
    );
    for (const o of data.obstacles.filter((o) => o.kind !== "garden"))
      assert.equal(data.walkable(o), false, o.id);
    assert.equal(
      data.walkable(combinedPosition({ x: 0, z: -94 }, seed, "worldgen")),
      false,
    );
    assert.equal(
      data.walkable(
        combinedPosition({ x: 80, z: -94 }, seed, "worldgen"),
        "vehicle",
      ),
      true,
    );
    assert.equal(data.inControlArea({ x: 0, z: 10 }), true);
    assert.equal(
      data.walkable({ x: 16, z: 8 }),
      true,
      "infantry can cross civic lawns",
    );
    assert.ok(
      data.route({ x: 16, z: 12 }, { x: 16, z: 3 }).length,
      "lawn no longer seals the space behind it",
    );
    assert.equal(
      data.walkable({ x: 16, z: 8 }, "vehicle"),
      false,
      "vehicles cannot cross planted civic beds",
    );
    assert.equal(data.inControlArea({ x: 0, z: -5 }), false);
    assert.equal(data.inControlArea({ x: 0, z: 30 }), false);
    assert.equal(
      data.walkable({ x: 0, z: 10 }, "vehicle"),
      true,
      "vehicles can enter paved civic space",
    );
    assert.equal(
      data.segmentClear({ x: 20, z: -8 }, { x: 23, z: -8 }),
      false,
      "thin walls block swept movement",
    );
    assert.ok(data.cover.length > 100);
    for (const c of data.cover) {
      assert.ok(data.walkable(c.position));
      assert.ok(Math.abs(Math.hypot(c.normal.x, c.normal.z) - 1) < 1e-8);
      assert.ok(
        obstacleDistance(
          c.position,
          data.obstacles.find((o) => o.id === c.obstacleId)!,
        ) < 1,
      );
    }
    const gate = data.route({ x: 0, z: 20 }, { x: 0, z: 10 });
    assert.ok(gate.length > 0);
    const tankGate = data.route({ x: 0, z: 20 }, { x: 0, z: 10 }, "vehicle");
    assert.ok(tankGate.length > 0, "tank can drive through the plaza gate");
    for (let i = 1; i < tankGate.length; i++)
      assert.ok(data.segmentClear(tankGate[i - 1], tankGate[i], "vehicle"));
    assert.equal(
      data.segmentClear({ x: 20, z: -8 }, { x: 23, z: -8 }, "vehicle"),
      false,
      "plaza access does not permit driving through walls",
    );
    const start = combinedPosition({ x: 80, z: -106 }, seed, "worldgen"),
      end = combinedPosition({ x: 80, z: -82 }, seed, "worldgen");
    const bridge = data.route(start, end, "vehicle");
    assert.ok(bridge.length > 0);
    for (const route of [gate, bridge])
      for (let i = 1; i < route.length; i++)
        assert.ok(
          data.segmentClear(
            route[i - 1],
            route[i],
            route === bridge ? "vehicle" : "infantry",
          ),
        );
    assert.deepEqual(data.route({ x: 0, z: -5 }, { x: 0, z: 10 }), []);
    assert.deepEqual(data.route({ x: 999, z: 0 }, { x: 0, z: 10 }), []);
  }
});
