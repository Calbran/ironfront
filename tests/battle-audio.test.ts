import { test } from "node:test";
import assert from "node:assert/strict";
import {
  spatialBattleMix,
  createAudioEventCursor,
} from "../apps/web/src/audio/battleAudioMath";
import {
  synthesizeBattleSound,
  SOUND_LENGTH,
  type BattleSound,
} from "../apps/web/src/audio/battleSoundSynthesis";
import { createCityHearing } from "../packages/game-core/src/cityHearing";
test("distance attenuates and muffles fire while footsteps cull locally", () => {
  const ears = { x: 0, y: 10, z: 0, rightX: 1, rightZ: 0 },
    near = spatialBattleMix({ x: 5, y: 0, z: 0 }, ears, "rifle"),
    far = spatialBattleMix({ x: 180, y: 0, z: 0 }, ears, "rifle");
  assert(near.gain > far.gain && far.gain > 0);
  assert(near.cutoff > far.cutoff);
  assert(far.delay > near.delay);
  assert.equal(spatialBattleMix({ x: 180, y: 0, z: 0 }, ears, "step").gain, 0);
  assert.equal(
    spatialBattleMix({ x: 6000, y: 0, z: 0 }, ears, "cannon").gain,
    0,
  );
  assert(
    spatialBattleMix({ x: 0, y: 0, z: 0 }, { ...ears, y: 150 }, "rifle").gain <
      near.gain,
  );
});
test("camera right direction controls stereo panning without changing volume", () => {
  const p = { x: 30, y: 0, z: 0 },
    a = spatialBattleMix(
      p,
      { x: 0, y: 0, z: 0, rightX: 1, rightZ: 0 },
      "rifle",
    ),
    b = spatialBattleMix(
      p,
      { x: 0, y: 0, z: 0, rightX: -1, rightZ: 0 },
      "rifle",
    );
  assert(a.pan > 0 && b.pan < 0);
  assert.equal(a.gain, b.gain);
});
test("event cursor prevents snapshot replay, handles unordered batches and bounds burst work", () => {
  const c = createAudioEventCursor();
  assert.deepEqual(c.take([{ id: 3 }]), []);
  assert.deepEqual(c.take([{ id: 5 }, { id: 3 }, { id: 4 }]), [
    { id: 4 },
    { id: 5 },
  ]);
  assert.deepEqual(c.take([{ id: 4 }]), []);
  assert.equal(
    c.take(Array.from({ length: 200 }, (_, i) => ({ id: i + 6 }))).length,
    64,
  );
  c.reset();
  assert.deepEqual(c.take([{ id: 500 }]), []);
});
test("synthesized variants have bounded finite PCM, nonzero energy and clean edges", () => {
  for (const kind of Object.keys(SOUND_LENGTH) as BattleSound[]) {
    const a = synthesizeBattleSound(kind),
      b = synthesizeBattleSound(kind, 1);
    assert.equal(a.length, Math.round(24000 * SOUND_LENGTH[kind]));
    let energy = 0;
    for (const sample of a) {
      assert(Number.isFinite(sample) && Math.abs(sample) < 0.73);
      energy += sample * sample;
    }
    assert(energy / a.length > 0.0001);
    assert(Math.abs(a[0]) < 0.01 && Math.abs(a.at(-1)!) < 0.01);
    assert.notDeepEqual(a, b);
  }
});
test("hearing emits only coarse positions with no combat identity or targeting details", () => {
  const h = createCityHearing(),
    shot = { id: 1, x: 11, z: 9, tx: 14, tz: 10, shell: false, impact: false },
    observer = { friendly: true, health: 100, x: 0, z: 0 };
  h.emit(shot, 0, [observer]);
  const cue = h.snapshot(0)[0];
  assert.deepEqual(cue, { id: 1, kind: "rifle", x: 16, z: 16, time: 0 });
  assert.equal("from" in cue, false);
  assert.equal("to" in cue, false);
  assert.equal("tx" in cue, false);
  const none = createCityHearing();
  none.emit(shot, 0, [{ ...observer, health: 0 }]);
  assert.equal(none.snapshot(0).length, 0);
  none.emit({ ...shot, x: 1300 }, 0, [observer]);
  assert.equal(none.snapshot(0).length, 0);
  none.emit({ ...shot, x: 250, shell: true }, 0, [observer]);
  assert.equal(none.snapshot(0).length, 1);
});
test("hearing history is bounded and expires independently of visibility", () => {
  const h = createCityHearing(),
    observer = { friendly: true, health: 100, x: 0, z: 0 };
  for (let id = 0; id < 1000; id++)
    h.emit({ id, x: 0, z: 0, tx: 2, tz: 3, shell: true, impact: true }, 0, [
      observer,
    ]);
  assert.equal(h.snapshot(0).length, 128);
  assert.equal(h.snapshot(3).length, 0);
});

test("long-range fire remains quiet and dark beyond the old cutoff", () => {
  const ears = { x: 0, y: 0, z: 0, rightX: 1, rightZ: 0 },
    near = spatialBattleMix({ x: 10, y: 0, z: 0 }, ears, "rifle"),
    far = spatialBattleMix({ x: 1800, y: 0, z: 0 }, ears, "rifle");
  assert(far.gain > 0.003 && far.gain < near.gain * 0.05);
  assert(far.cutoff < 500);
  assert(
    spatialBattleMix({ x: 3500, y: 0, z: 0 }, ears, "cannon").gain > 0.003,
  );
  const h = createCityHearing();
  h.emit(
    { id: 1, x: 1001, z: 13, tx: 1002, tz: 14, shell: false, impact: false },
    0,
    [{ friendly: true, health: 100, x: 0, z: 0 }],
  );
  const cue = h.snapshot(0)[0];
  assert(cue);
  assert.equal(cue.x % 256, 128);
  assert.notEqual(cue.x, 1001);
});
test("city impulse has a predelay, bounded reflections and a decaying tail", async () => {
  const { synthesizeCityImpulse } =
    await import("../apps/web/src/audio/battleSoundSynthesis");
  const a = synthesizeCityImpulse();
  assert(a.slice(0, 600).every((v) => v === 0));
  assert(a.every(Number.isFinite));
  const energy = (lo: number, hi: number) =>
    a.slice(lo, hi).reduce((sum, v) => sum + v * v, 0);
  assert(energy(720, 4800) > energy(12000, 16000) * 10);
  assert(Math.abs(a.at(-1)!) < 0.001);
});

test("rifle reports vary independently and retain an elevated listening distance", async()=>{
 const {battleShotVariation}=await import('../apps/web/src/audio/battleAudioMath');
 const shots=Array.from({length:100},(_,i)=>battleShotVariation(i,'rifle'));
 assert(new Set(shots.map(s=>s.rate)).size>90);
 assert(new Set(shots.map(s=>s.variant)).size===4);
 assert(shots.every(s=>s.rate>=1.06&&s.rate<=1.24&&s.strength>=.88&&s.strength<=1.12));
 assert.deepEqual(battleShotVariation(42,'rifle'),battleShotVariation(42,'rifle'));
 const ears={x:0,y:10,z:0,rightX:1,rightZ:0};
 const rifle=spatialBattleMix({x:0,y:0,z:0},ears,'rifle');
 assert(rifle.distance>=65&&rifle.gain<.3&&rifle.cutoff<3000);
 assert.equal(spatialBattleMix({x:0,y:0,z:0},ears,'cannon').distance,10);
});
