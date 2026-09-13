import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { bakeInfantry } from "../apps/web/src/infantryModel";
import { createTacticalInfantryAnimation } from "../apps/web/src/experiments/tacticalUnitAnimation";
import { createTacticalBattleEffects } from "../apps/web/src/experiments/tacticalBattleEffects";
import {
  countryPresentedUnits,
  countryPresentedShots,
  blendDisplayedPose,
} from "../apps/web/src/experiments/countryTacticalAdapter";
import {
  createSliceState,
  ensureSliceSquads,
} from "../packages/game-core/src/countrySlice";
import { sampleSliceMotion } from "../apps/web/src/experiments/sliceMotion";
import { advanceEncounter } from "../packages/game-core/src/countryEncounter";
import { createTankTracks } from "../apps/web/src/prototypes/tankTracks";
import { tacticalTankKick } from "../apps/web/src/experiments/tacticalTankAnimation";
import { readFileSync } from "node:fs";

test("city and country identical member inputs produce identical poses, including moving aim and death", () => {
  const rig = bakeInfantry(0),
    animation = createTacticalInfantryAnimation(rig),
    material = new T.MeshBasicMaterial();
  const make = () => {
    const root = new T.Group(),
      body = new T.Group();
    rig.parts.forEach((p) => {
      const mesh = new T.Mesh(p.geometry, material);
      mesh.matrixAutoUpdate = false;
      body.add(mesh);
    });
    root.add(body);
    return root;
  };
  const a = make(),
    b = make(),
    state = createSliceState(0);
  ensureSliceSquads(state);
  const member = state.units[0].members![0];
  Object.assign(member, {
    x: 5,
    z: 7,
    health: 100,
    distance: 1.23,
    speed: 1.1,
    angle: 0.2,
    aimAngle: 1.3,
    firing: true,
    path: [{ x: 20, z: 7 }],
    cover: false,
  });
  state.running = true;
  const country = countryPresentedUnits(state).find((u) => u.id === member.id)!;
  const city = { ...country, vehicleType: undefined };
  for(const distance of [-.001,0,100000.125]){
    animation.update(a,{...city,distance},1,.95);
    assert.ok(a.children[0].children.every(p=>p.matrix.elements.every(Number.isFinite)));
  }
  for (const health of [100, 0]) {
    for (const t of [1, 1.13, 1.47, 2.5]) {
      animation.update(a, { ...city, health }, t, 0.95);
      animation.update(b, { ...country, health }, t, 0.95);
      assert.deepEqual(
        a.children[0].rotation.toArray(),
        b.children[0].rotation.toArray(),
      );
      a.children[0].children.forEach((p, i) =>
        assert.deepEqual(
          p.matrix.elements,
          b.children[0].children[i].matrix.elements,
        ),
      );
    }
  }
  assert.notEqual(a.children[0].rotation.x + a.children[0].rotation.z, 0);
  rig.parts.forEach((p) => p.geometry.dispose());
  material.dispose();
});

test("individual soldier render motion advances between 50ms authority steps without mutating the snapshot", () => {
  const state = createSliceState(1000);
  ensureSliceSquads(state);
  state.running = true;
  const member = state.units[0].members![0];
  member.speed = 1;
  member.path = [{ x: member.x + 20, z: member.z }];
  const before = JSON.stringify(state);
  const samples = [1, 9, 17, 25, 33, 41, 49, 57].map(
    (t) => sampleSliceMotion(state, t).units[0].members![0],
  );
  assert(samples.every((s, i) => i === 0 || s.x > samples[i - 1].x));
  assert(
    samples.every((s, i) => i === 0 || s.distance > samples[i - 1].distance),
  );
  assert.equal(JSON.stringify(state), before);
  const p = blendDisplayedPose(
    { x: 0, z: 0, angle: 3.13, distance: 0 },
    { x: 10, z: 4, angle: -3.13, distance: 10 },
    0.5,
  );
  const from={x:150000,z:230000,angle:0,distance:0},to={x:150010,z:230010,angle:1,distance:10};
  assert.equal(blendDisplayedPose(from,to,-.1).distance,0);
  assert.equal(blendDisplayedPose(from,to,-.1).x,from.x);
  assert.equal(blendDisplayedPose(from,to,1.1).distance,10);
  assert.equal(p.x, 5);
  assert(Math.abs(p.angle - Math.PI) < 0.01);
});

test("shared effects consume shots once, draw bounded flashes and impacts, and reset cleanly", () => {
  const root = new T.Group(),
    fx = createTacticalBattleEffects(root, () => 2, new Map(), 0);
  const shot = {
    id: 1,
    from: 1,
    to: 2,
    x: 0,
    z: 0,
    tx: 12,
    tz: 0,
    shell: false,
    impact: false,
  };
  fx.update(0, true, []);
  fx.update(1, true, [shot]);
  fx.update(1.08, true, [shot]);
  const flashes = root.getObjectByName(
    "tactical-muzzle-flashes",
  ) as T.InstancedMesh;
  const tracers = root.getObjectByName("tactical-tracers") as T.LineSegments;
  assert.equal(flashes.count, 1);
  assert.equal(tracers.geometry.drawRange.count, 2);
  assert(fx.firedAt.has(1));
  const shell = { ...shot, id: 2, shell: true };
  fx.update(2, true, [shot, shell]);
  fx.update(2.1, true, [shot, shell]);
  assert.equal(
    tracers.geometry.drawRange.count,
    2,
    "a tank shell has its own short tracer",
  );
  fx.update(3, true, [shot]);
  assert.equal(flashes.count, 0);
  const impact = { ...shot, id: 3, shell: true, impact: true };
  fx.update(3, true, [impact]);
  fx.update(3.12, true, [impact]);
  const craters = root.getObjectByName("tactical-craters") as T.InstancedMesh;
  assert.equal(craters.count, 1);
  fx.reset();
  fx.update(4, false, []);
  assert.equal(craters.count, 0);
  assert.equal(flashes.count, 0);
  fx.dispose();
  assert.equal(root.children.length, 0);
});

test("batched country volleys replay in authoritative order instead of one robot line", () => {
  const root = new T.Group(),
    fx = createTacticalBattleEffects(root, () => 0, new Map(), 0),
    shots = [
      {
        id: 1,
        from: 100,
        to: 9,
        x: 0,
        z: 0,
        tx: 12,
        tz: 0,
        shell: false,
        impact: false,
        at: 4,
      },
      {
        id: 2,
        from: 100,
        to: 9,
        x: 0,
        z: 0,
        tx: 12,
        tz: 0,
        shell: false,
        impact: false,
        at: 4.25,
      },
    ];
  fx.update(0, true, []);
  fx.update(1, true, shots);
  fx.update(1.2, true, shots);
  assert(fx.firedAt.has(100));
  const first = fx.firedAt.get(100)!;
  fx.update(1.4, true, shots);
  assert(fx.firedAt.get(100)! > first);
  fx.dispose();
});

test("tank belts are independent per vehicle and recoil returns to rest", () => {
  const a = new T.Group(),
    b = new T.Group(),
    left = createTankTracks(a),
    right = createTankTracks(b);
  left.update(2, 3);
  right.update(0, 0);
  assert.notDeepEqual(
    (a.children[0] as T.InstancedMesh).instanceMatrix.array,
    (b.children[0] as T.InstancedMesh).instanceMatrix.array,
  );
  assert(tacticalTankKick(0.2).barrel < -0.3);
  assert.equal(tacticalTankKick(1).barrel, 0);
  left.dispose();
  right.dispose();
  assert.equal(a.children.length + b.children.length, 0);
});

test("country shell impact events survive serialization and arrive only at the authoritative impact time", () => {
  const s = createSliceState(0);
  s.running = true;
  s.encounter = {
    elapsed: 0,
    remainder: 0,
    stage: "bridge",
    progress: 0,
    bridge: { x: 1500, z: 900 },
    outpost: { x: 2000, z: 900 },
    shots: [],
    sequence: 0,
    pending: [
      {
        due: 0.5,
        x: 100,
        z: 100,
        enemy: true,
        antiTank: false,
        from: 8,
        to: 100,
      },
    ],
  };
  advanceEncounter(s, 250, () => 0);
  assert.equal(countryPresentedShots(s).length, 0);
  const resumed = JSON.parse(JSON.stringify(s));
  advanceEncounter(resumed, 500, () => 0);
  const shots = countryPresentedShots(resumed);
  assert.equal(shots.length, 1);
  assert.equal(shots[0].impact, true);
  assert.equal(shots[0].from, 8);
});

test("live tactical views must use the shared presentation owner; authoring uses shared effects and clips", () => {
  for (const file of ["cityTestUnits.ts", "countrySliceScene.ts"]) {
    const source = readFileSync(
      new URL("../apps/web/src/experiments/" + file, import.meta.url),
      "utf8",
    );
    assert.match(source, /createTacticalPresentation\(/);
    assert.doesNotMatch(
      source,
      /new T\.LineBasicMaterial\(\{\s*color:\s*0xff(?:ce79|d48a)/,
    );
    assert.doesNotMatch(source, /createTankTracks\(/);
  }
  const review = readFileSync(
    new URL("../apps/web/src/prototypes/animationReview.ts", import.meta.url),
    "utf8",
  );
  assert.match(review, /createTacticalBattleEffects\(/);
  assert.match(review, /tacticalTankKick\(/);
});

test("paused combat retains cosmetic infantry breathing without advancing a death", () => {
  const rig = bakeInfantry(0),
    animation = createTacticalInfantryAnimation(rig);
  const root = new T.Group(),
    body = new T.Group();
  root.add(body);
  rig.parts.forEach((p) => {
    const part = new T.Object3D();
    part.matrixAutoUpdate = false;
    body.add(part);
  });
  const unit = {
    id: 1,
    kind: "infantry",
    health: 100,
    distance: 0,
    speed: 0,
    moving: false,
    angle: 0,
    facing: 0,
    cover: "full" as const,
  };
  animation.update(root, unit, 5, -100, 3);
  const first = body.scale.y;
  animation.update(root, unit, 5, -100, 4);
  assert.notEqual(body.scale.y, first);
  animation.update(root, { ...unit, health: 0 }, 5, -100, 4);
  const fall = body.rotation.toArray();
  animation.update(root, { ...unit, health: 0 }, 5, -100, 8);
  assert.deepEqual(body.rotation.toArray(), fall);
  rig.parts.forEach((p) => p.geometry.dispose());
});
