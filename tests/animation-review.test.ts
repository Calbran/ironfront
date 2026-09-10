import { test } from "node:test";
import { lmgFire } from "../apps/web/src/prototypes/animationTimeline.ts";
import assert from "node:assert/strict";
test("LMG visual bursts contain eight rapid shots and stop when disabled", () => {
  let flashes = 0,
    previous = false;
  for (let i = 0; i < 1000; i++) {
    const t = i / 1000,
      shot = lmgFire(t, true);
    const visible = shot.recoil > 0.72;
    if (visible && !previous) flashes++;
    previous = visible;
    assert.equal(lmgFire(t, false).recoil, 0);
    if (t > 0.8) assert.equal(shot.firing, false);
  }
  assert.equal(flashes, 8);
});
import * as T from "three";
import { createReviewInfantryKit } from "../apps/web/src/prototypes/animatedInfantry.ts";
import {
  soldierReview,
  RUN_CYCLE_SECONDS,
  RUN_SPEED,
  runFlight,
  coverClip,
  tankReview,
  type SoldierClip,
} from "../apps/web/src/prototypes/animationTimeline.ts";
test("running uses longer strides and distinct airborne intervals", () => {
  assert(RUN_CYCLE_SECONDS>=.75);
  assert(RUN_CYCLE_SECONDS*RUN_SPEED>2);
  assert.equal(runFlight(.2),0);
  assert(runFlight(.45)>.08);
  const kit=createReviewInfantryKit(), actor=kit.actor("rifle");
  try {
    actor.update(soldierReview(RUN_CYCLE_SECONDS*.45,"run"));
    assert(new T.Box3().setFromObject(actor.root).min.y>.07);
  } finally {kit.dispose();}
});
test("low cover keeps infantry in place and rifle/LMG muzzles above the sandbags", () => {
  const kit = createReviewInfantryKit();
  try {
    for (const role of ["rifle", "lmg"] as const) {
      const actor = kit.actor(role);
      for (const clip of [
        "sequence",
        "over",
        "around",
        "lean",
      ] as SoldierClip[]) {
        for (let t = 4; t < 22; t += 0.05) {
          const p = soldierReview(t, coverClip(clip, "low"));
          assert.equal(p.x, 0);
          assert.equal(p.z, -1.2);
          if (!p.firing) continue;
          if (role === "lmg") p.crouch = Math.max(p.crouch, 0.03);
          actor.update(p);
          actor.root.updateMatrixWorld(true);
          assert(actor.muzzle.getWorldPosition(new T.Vector3()).y > 1.05);
        }
      }
    }
    assert.equal(coverClip("sequence", "tall"), "lean");
    assert.equal(coverClip("around", "tall"), "around");
  } finally {
    kit.dispose();
  }
});

test("all infantry clips keep finite, grounded poses; crouch lowers the silhouette", () => {
  const kit = createReviewInfantryKit();
  try {
    for (const role of ["rifle", "guard", "lmg", "engineer", "antitank"] as const) {
      const actor = kit.actor(role);
      for (const clip of [
        "sequence",
        "walk",
        "run",
        "aim",
        "fire",
        "reload",
        "crouch",
        "over",
        "around",
        "lean",
      ] as SoldierClip[]) {
        for (let t = 0; t < 24; t += 0.125) {
          actor.update(soldierReview(t, clip));
          actor.root.updateMatrixWorld(true);
          actor.root.traverse((o) =>
            o.matrixWorld.elements.forEach((v) => assert(Number.isFinite(v))),
          );
          const bounds = new T.Box3().setFromObject(actor.root);
          assert(
            bounds.min.y >= -0.025,
            `${role} ${clip} ${t}: below ground ${bounds.min.y}`,
          );
          assert(
            bounds.min.y <
              (soldierReview(t, clip).mode === "run" ? 0.1 : 0.025),
          );
        }
      }
      actor.update(soldierReview(2, "aim"));
      const standing = new T.Box3().setFromObject(actor.root).max.y;
      actor.update(soldierReview(2, "crouch"));
      const crouched = new T.Box3().setFromObject(actor.root).max.y;
      assert(standing - crouched > 0.3);
    }
  } finally {
    kit.dispose();
  }
});
test("cover firing occurs only when exposed; reload and reverse remain deterministic", () => {
  for (const clip of ["over", "around", "lean"] as SoldierClip[]) {
    for (let t = 0; t < 6; t += 0.025) {
      const p = soldierReview(t, clip);
      if (p.firing) {
        assert.equal(p.reload, -1);
        if (clip === "over") assert(p.crouch < 0.01);
        else assert(p.x >= 2);
      }
    }
  }
  assert.equal(soldierReview(1, "reload").firing, false);
  assert.deepEqual(soldierReview(9.4), soldierReview(9.4));
  assert(tankReview(9).travel > tankReview(10).travel);
  assert.equal(tankReview(11).travel, 0);
  assert.equal(tankReview(5).travel, tankReview(6).travel);
  const walk = soldierReview(1.5, "walk").z - soldierReview(1, "walk").z;
  const run = soldierReview(1.5, "run").z - soldierReview(1, "run").z;
  assert(run > walk * 1.5);
});
test("tank shots kick quickly and settle, with smoke lingering after the last shot", () => {
  assert.equal(tankReview(3.9).kick, 0);
  assert(tankReview(4.07).recoil > 0.95);
  assert(tankReview(4.07).kick > 0.95);
  assert(tankReview(4.3).recoil > tankReview(4.5).recoil);
  assert.equal(tankReview(4.7).kick, 0);
  assert.equal(tankReview(4.7).recoil, 0);
  assert(tankReview(7.1).shotAge < 1.25);
  for (let t = 0; t < 24; t += 0.01) {
    const p = tankReview(t);
    assert(Number.isFinite(p.recoil));
    assert(p.kick >= 0 && p.kick <= 1);
  }
});
