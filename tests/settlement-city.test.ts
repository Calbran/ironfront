import { test } from "node:test";
import assert from "node:assert/strict";
import { planSettlementCity } from "../packages/game-core/src/settlementCity";
import { cityBuildingFootprint } from "../packages/game-core/src/cityBuildingKit";
import {
  lotIntersectsStreet,
  lotsOverlap,
  segmentDistance,
} from "../packages/game-core/src/organicCity";

test("settlement size grows development without enlarging models or paving empty parcels", () => {
  const town = planSettlementCity({
    seed: 840,
    size: "town",
    setting: "inland",
  });
  const city = planSettlementCity({
    seed: 840,
    size: "city",
    setting: "inland",
  });
  assert.ok(city.lots.length > town.lots.length * 2);
  assert.ok(city.parcels.every((p) => p.lotIndices.length > 0));
  assert.ok(city.lots.some((l) => l.variant === "home"));
  assert.ok(city.lots.some((l) => l.variant.startsWith("commercialTower")));
  for (const lot of city.lots) {
    assert.ok(
      !city.streets.some((s) => lotIntersectsStreet(lot, s)),
      "building clears road",
    );
    assert.ok(
      !city.lots.some((other) => other !== lot && lotsOverlap(lot, other)),
      "buildings do not overlap",
    );
  }
  const frontage = city.access.filter((a) =>
    ["home", "shop", "workshopRow"].includes(city.lots[a.lotIndex].variant),
  );
  let aligned = 0;
  for (const a of frontage) {
    const lot = city.lots[a.lotIndex],
      depth = (cityBuildingFootprint(lot.variant).depth * lot.scale) / 2;
    assert.ok(
      Math.abs(Math.hypot(a.entrance.x - lot.x, a.entrance.z - lot.z) - depth) <
        0.01,
    );
    const road = city.streets
      .map((s) => ({
        width: s.width,
        d: Math.min(
          ...s.points
            .slice(1)
            .map((b, i) => segmentDistance(a.street, s.points[i], b)),
        ),
      }))
      .sort((a, b) => a.d - b.d)[0];
    if (
      road.d < 0.1 &&
      Math.abs(
        Math.hypot(a.entrance.x - a.street.x, a.entrance.z - a.street.z) -
          road.width / 2 -
          1.1,
      ) < 0.1
    )
      aligned++;
  }
  assert.ok(
    aligned > frontage.length * 0.7,
    "most outskirts fronts follow the sidewalk setback",
  );
  assert.ok(!city.rivers?.length, "inland settlement must not invent a canal");
});
