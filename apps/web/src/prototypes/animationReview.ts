import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createMilitaryModel } from "./militaryModels";
import { createJeep } from "./jeepModel";
import { createReviewInfantryKit, type InfantryRole } from "./animatedInfantry";
import {
  soldierReview,
  coverClip,
  lmgFire,
  smooth,
  tankReview,
  REVIEW_DURATION,
  type SoldierClip,
} from "./animationTimeline";
import "./animationReview.css";
const stage = document.querySelector<HTMLElement>("#stage")!,
  status = document.querySelector<HTMLElement>("#status")!;
const timeline = document.querySelector<HTMLInputElement>("#timeline")!,
  play = document.querySelector<HTMLButtonElement>("#play")!;
try {
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.append(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color(0x263332);
  scene.fog = new T.Fog(0x263332, 75, 140);
  const camera = new T.PerspectiveCamera(42, 1, 0.1, 180),
    controls = new OrbitControls(camera, renderer.domElement);
  controls.zoomSpeed = -1;
  controls.minDistance = 3;
  controls.maxDistance = 110;
  controls.maxPolarAngle = Math.PI * 0.49;
  scene.add(new T.HemisphereLight(0xf3e6c7, 0x5c7165, 2.3));
  const sun = new T.DirectionalLight(0xffe2b1, 3);
  sun.position.set(-25, 42, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -38,
    right: 38,
    top: 32,
    bottom: -32,
    near: 1,
    far: 100,
  });
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  const resources: { dispose: () => void }[] = [],
    cleanup: (() => void)[] = [];
  function material(color: number) {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.9 });
    resources.push(m);
    return m;
  }
  const earth = material(0x586049),
    stone = material(0x757467),
    roadMat = material(0x74725e),
    wood = material(0x887451),
    metal = material(0x343c3c);
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: T.Material = stone,
    parent: T.Object3D = scene,
  ) {
    const g = new T.BoxGeometry(w, h, d);
    resources.push(g);
    const o = new T.Mesh(g, mat);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  box(68, 0.4, 53, 0, -0.25, 0, earth);
  box(8, 0.035, 49, 3, -0.03, 0, roadMat);
  // Simple ruined training street: silhouettes leave clear sightlines to the actors.
  for (const [x, z] of [
    [-24, -19],
    [-16, -19],
    [23, -18],
    [24, 16],
  ]) {
    box(5, 2.6, 0.45, x, 1.3, z);
    box(0.45, 3.6, 4, x - 2.3, 1.8, z + 1.8);
    box(1.3, 0.5, 1, x + 1, 0.25, z + 2);
  }
  const models: ReturnType<typeof createMilitaryModel>[] = [];
  function model(
    kind: Parameters<typeof createMilitaryModel>[0],
    x: number,
    z: number,
    moving = false,
  ) {
    const m = createMilitaryModel(kind, moving);
    m.root.position.set(x, 0, z);
    scene.add(m.root);
    models.push(m);
    return m;
  }
  const kit = createReviewInfantryKit();
  cleanup.push(() => kit.dispose());
  const cast: {
    actor: ReturnType<typeof kit.actor>;
    x: number;
    z: number;
    role: InfantryRole;
    offset: number;
    clip: SoldierClip;
    cover: "low" | "tall" | "none";
  }[] = [];
  function squad(role: InfantryRole, x: number, z: number, clip: SoldierClip) {
    for (let i = 0; i < 3; i++) {
      const a = kit.actor(role);
      scene.add(a.root);
      cast.push({
        actor: a,
        x: x + i * 5.5,
        z,
        role,
        offset: 0,
        clip,
        cover: clip === "lean" ? "tall" : "low",
      });
      model("sandbags", x + i * 5.5, z);
      if (clip === "lean") box(3.9, 2.15, 0.35, x + i * 5.5, 1.075, z);
    }
  }
  squad("rifle", -23, 3, "sequence");
  squad("guard", -23, -6, "lean");
  squad("lmg", -23, 12, "over");
  squad("engineer", -23, 21, "over");
  const rocketGunner = kit.actor("antitank");
  scene.add(rocketGunner.root);
  cast.push({
    actor: rocketGunner,
    x: -4,
    z: 14,
    role: "antitank",
    offset: 0,
    clip: "over",
    cover: "low",
  });
  model("sandbags", -4, 14);
  const rocketSupport = kit.actor("rifle");
  scene.add(rocketSupport.root);
  cast.push({
    actor: rocketSupport,
    x: -1,
    z: 14,
    role: "rifle",
    offset: 0,
    clip: "aim",
    cover: "none",
  });
  box(0.8, 0.45, 0.55, -1, 0.225, 12, wood);
  model("wire", -11, 18);
  model("wire", -6, 18);
  const tank = model("tank", 3, -5, true),
    landship = model("landship", 13, -7, true),
    artillery = model("artillery", 15, 10);
  const airship = model("airship", 1, -20),
    gunship = model("gunship", 16, -20);
  const jeep = createJeep();
  jeep.root.position.set(25, 0, 3);
  scene.add(jeep.root);
  cleanup.push(() => {
    const gs = new Set<T.BufferGeometry>(),
      ms = new Set<T.Material>();
    jeep.root.traverse((o) => {
      if (o instanceof T.Mesh) {
        gs.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          ms.add(m),
        );
      }
    });
    gs.forEach((g) => g.dispose());
    ms.forEach((m) => m.dispose());
  });
  for (const x of [12, 18]) {
    const a = kit.actor("rifle");
    scene.add(a.root);
    cast.push({
      actor: a,
      x,
      z: 8,
      role: "rifle",
      offset: 0,
      clip: "aim",
      cover: "none",
    });
  }
  // Instanced tread links circulate around a closed belt; phase follows signed hull travel.
  const trackDummy = new T.Object3D();
  function tracks(parent: T.Object3D, large: boolean) {
    const half = large ? 3.45 : 2.38,
      r = large ? 0.76 : 0.57,
      cy = large ? 0.82 : 0.63,
      x = large ? 1.8 : 1.28,
      count = large ? 48 : 36;
    const g = new T.BoxGeometry(
      large ? 0.85 : 0.67,
      0.085,
      large ? 0.29 : 0.23,
    );
    resources.push(g);
    const mesh = new T.InstancedMesh(g, metal, count * 2);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    parent.add(mesh);
    const length = 4 * half + 2 * Math.PI * r;
    return (travel: number) => {
      for (let side = 0; side < 2; side++)
        for (let i = 0; i < count; i++) {
          const s =
            ((((i / count) * length + travel) % length) + length) % length;
          let y: number, z: number, angle: number;
          if (s < 2 * half) {
            z = -half + s;
            y = cy + r;
            angle = 0;
          } else if (s < 2 * half + Math.PI * r) {
            const a = (s - 2 * half) / r;
            z = half + r * Math.sin(a);
            y = cy + r * Math.cos(a);
            angle = a;
          } else if (s < 4 * half + Math.PI * r) {
            z = half - (s - 2 * half - Math.PI * r);
            y = cy - r;
            angle = Math.PI;
          } else {
            const a = (s - 4 * half - Math.PI * r) / r;
            z = -half - r * Math.sin(a);
            y = cy - r * Math.cos(a);
            angle = Math.PI + a;
          }
          trackDummy.position.set(side === 0 ? -x : x, y, z);
          trackDummy.rotation.set(angle, 0, 0);
          trackDummy.updateMatrix();
          mesh.setMatrixAt(side * count + i, trackDummy.matrix);
        }
      mesh.instanceMatrix.needsUpdate = true;
    };
  }
  const tankTracks = tracks(tank.root, false),
    landTracks = tracks(landship.root, true);
  const fxGeo = new T.SphereGeometry(1, 7, 5);
  resources.push(fxGeo);
  const flashMat = new T.MeshBasicMaterial({ color: 0xffd378 }),
    smokeMat = new T.MeshBasicMaterial({
      color: 0x999b8d,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
  resources.push(flashMat, smokeMat);
  function effect(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    size: number,
    heavy = false,
  ) {
    const flash = new T.Mesh(fxGeo, flashMat),
      smoke = new T.Mesh(fxGeo, smokeMat);
    parent.add(flash, smoke);
    flash.position.set(x, y, z);
    const puffMaterial = heavy ? smokeMat.clone() : smokeMat;
    if (heavy) {
      resources.push(puffMaterial);
      smoke.material = puffMaterial;
    }
    return (pulse: number, clock: number, shotAge?: number) => {
      flash.visible = pulse > 0.72;
      flash.scale.set(size * 0.65, size * 0.65, size * 1.4);
      const a = shotAge ?? ((clock % 1.4) + 1.4) % 1.4;
      smoke.visible =
        Number.isFinite(a) && (heavy ? a < 1.25 : pulse > 0 || a < 0.55);
      if (smoke.visible) {
        smoke.position.set(
          x,
          y + a * size * 1.8,
          z + a * size * (heavy ? 2 : 0.3),
        );
        smoke.scale.setScalar(size * (heavy ? 0.8 + a * 3.2 : 0.5 + a * 1.7));
        if (heavy) puffMaterial.opacity = 0.5 * (1 - a / 1.25);
      }
    };
  }
  const soldierFX = cast.map((c) =>
    effect(c.actor.muzzle, 0, 0, 0, c.role === "lmg" ? 0.17 : 0.095),
  );
  const rocket = box(
    0.075,
    0.075,
    0.38,
    0,
    0,
    0,
    flashMat,
    rocketGunner.muzzle,
  );
  const trail = box(0.045, 0.045, 1.8, 0, 0, 0, smokeMat, rocketGunner.muzzle);
  rocket.castShadow = false;
  trail.castShadow = false;
  const rocketFX = effect(rocketGunner.muzzle, 0, 0, 0, 0.25, true);
  const tracers = cast.map((c) => {
    if (c.role !== "lmg") return null;
    const tracer = box(0.022, 0.022, 0.65, 0, 0, 0, flashMat, c.actor.muzzle);
    tracer.castShadow = false;
    tracer.receiveShadow = false;
    return tracer;
  });
  const tankTurret = tank.root.getObjectByName("turret_yaw")!,
    landTurret = landship.root.getObjectByName("turret_yaw")!;
  const tankBarrel = tank.root.getObjectByName("barrel_recoil")!,
    landBarrel = landship.root.getObjectByName("barrel_recoil")!,
    artBarrel = artillery.root.getObjectByName("barrel_recoil")!;
  const tankFX = effect(tankBarrel, 0, 0.29, 2.75, 0.48, true),
    landFX = effect(landBarrel, 0, 0.3, 3.45, 0.58, true),
    artFX = effect(artBarrel, 0, 1.83, 2.85, 0.4),
    gunFX = effect(gunship.root, 0, 0.52, 3.03, 0.16);
  const labelTextures: T.Texture[] = [];
  const labels: T.Sprite[] = [];
  function label(text: string, x: number, z: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#182925dd";
    ctx.fillRect(0, 0, 640, 80);
    ctx.fillStyle = "#f0dec0";
    ctx.font = "30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 320, 50);
    const texture = new T.CanvasTexture(canvas);
    labelTextures.push(texture);
    const mat = new T.SpriteMaterial({ map: texture, depthTest: false });
    resources.push(mat);
    const sprite = new T.Sprite(mat);
    sprite.position.set(x, 3.3, z);
    sprite.scale.set(10, 1.25, 1);
    scene.add(sprite);
    labels.push(sprite);
  }
  label("INFANTRY · full cover sequence", -17, 5);
  label("GUARDS · wall lean", -17, -4);
  label("LMG · rise and suppress", -17, 14);
  label("ENGINEERS · tool movement", -17, 23);
  label("ANTI-TANK · rocket team", -3, 17);
  label("ARMOR · advance / traverse / fire", 8, 1);
  label("ARTILLERY · recoil / recovery", 15, 14);
  label("AIR · patrol / hover / fire", 9, -13);
  label("JEEP · drive / unload", 25, 9);
  const viewpoints: Record<string, { target: number[]; offset: number[] }> = {
    all: { target: [0, 1, 1], offset: [40, 38, 52] },
    rifle: { target: [-17, 1, 1], offset: [8, 6, -12] },
    guards: { target: [-17, 1, -7], offset: [8, 6, -12] },
    lmg: { target: [-17, 1, 10], offset: [8, 6, -12] },
    engineers: { target: [-17, 1, 19], offset: [8, 6, -12] },
    antitank: { target: [-3, 1, 13], offset: [6, 4, -7] },
    armor: { target: [9, 1, 0], offset: [19, 16, 23] },
    air: { target: [9, 4, -20], offset: [24, 15, 23] },
    jeep: { target: [25, 1, 3], offset: [9, 7, 13] },
  };
  const focus = document.querySelector<HTMLSelectElement>("#focus")!;
  function frame() {
    labels.forEach((label) => {
      label.visible = focus.value === "all";
    });
    const p = viewpoints[focus.value];
    controls.target.set(...(p.target as [number, number, number]));
    camera.position
      .copy(controls.target)
      .add(
        new T.Vector3(...p.offset).multiplyScalar(camera.aspect < 1 ? 1.6 : 1),
      );
    controls.update();
  }
  function resize() {
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    frame();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  focus.onchange = frame;
  document.querySelector<HTMLButtonElement>("#reset-camera")!.onclick = frame;
  let time = 0,
    running = !matchMedia("(prefers-reduced-motion: reduce)").matches,
    previous = performance.now(),
    speed = 1,
    clip: SoldierClip = "sequence";
  function sync() {
    play.textContent = running ? "Pause" : "Play";
    play.setAttribute("aria-pressed", String(running));
  }
  function draw() {
    const p = soldierReview(time, clip);
    cast.forEach((c, i) => {
      const selectedClip = coverClip(
          clip === "sequence" ? c.clip : clip,
          c.cover,
        ),
        q = soldierReview(time + c.offset, selectedClip);
      const automatic = lmgFire(time + i * 0.037, q.firing && q.reload < 0);
      if (c.role === "lmg") {
        // Stay braced through the burst pause, with quick recoil instead of rifle kicks.
        if (q.firing) q.crouch = Math.max(q.crouch, 0.03);
        q.recoil = automatic.recoil * 0.8;
        q.firing = automatic.firing;
        const tracer = tracers[i]!;
        tracer.visible = automatic.firing && automatic.age < 0.07;
        tracer.position.z = 0.4 + automatic.age * 45;
      }
      if (c.role === "engineer") {
        q.firing = false;
        q.recoil = 0;
      }
      if (c.role === "antitank") {
        const phase = ((time % 6) + 6) % 6,
          age = phase - 2.25;
        const allowed = selectedClip === "over" || selectedClip === "fire";
        q.firing = allowed && age >= 0 && age < 0.18;
        q.recoil = q.firing ? Math.sin((Math.PI * age) / 0.18) * 0.45 : 0;
        if (allowed) {
          q.phase = 0.85;
          q.crouch = phase < 4 ? 0 : q.crouch;
          if (phase > 2.43) {
            q.reload = Math.min(1, (phase - 2.43) / 3.57);
          }
        }
        rocket.visible = trail.visible = allowed && age >= 0 && age < 0.6;
        rocket.position.z = 0.2 + Math.max(0, age) * 14;
        trail.position.z = rocket.position.z - 0.9;
        rocketFX(q.recoil * 2, time, allowed && age >= 0 ? age : Infinity);
      }
      c.actor.update(q);
      c.actor.root.position.set(c.x + q.x, 0, c.z + q.z);
      c.actor.root.rotation.y = q.yaw;
      soldierFX[i](
        c.role === "lmg" ? automatic.recoil : q.recoil,
        q.firing ? time : 1,
      );
    });
    const a = tankReview(time),
      b = tankReview(time + 2),
      g = tankReview(time + 4);
    tank.root.position.set(
      3 - Math.sin(a.turret) * a.kick * 0.12,
      0,
      -5 + a.travel - Math.cos(a.turret) * a.kick * 0.12,
    );
    landship.root.position.set(
      13 - Math.sin(b.turret) * b.kick * 0.085,
      0,
      -7 + b.travel - Math.cos(b.turret) * b.kick * 0.085,
    );
    tankTracks(a.travel);
    landTracks(b.travel);
    tankTurret.rotation.y = a.turret;
    landTurret.rotation.y = b.turret;
    tankBarrel.position.z = -a.recoil * 0.48;
    landBarrel.position.z = -b.recoil * 0.6;
    artBarrel.position.set(0, -g.recoil * 0.045, -g.recoil * 0.22);
    tankFX(a.flash, time, a.shotAge);
    landFX(b.flash, time, b.shotAge);
    artFX(g.recoil, g.firing ? time : 1);
    airship.animate(time);
    airship.root.position.set(
      1 + Math.sin((time * Math.PI) / 12) * 1.8,
      0.3 + Math.sin(time * 0.7) * 0.12,
      -20,
    );
    airship.root.rotation.y = Math.sin((time * Math.PI) / 12) * 0.12;
    gunship.animate(time);
    gunship.root.position.y = 1.5 + Math.sin(time * 1.1) * 0.12;
    gunship.root.rotation.z = Math.sin(time * 0.4) * 0.035;
    gunFX(g.recoil, g.firing ? time : 1);
    const j = tankReview(time + 1);
    jeep.root.position.z = 3 + j.travel;
    const jt = (time + 1) % 12;
    jeep.tailgate.rotation.x =
      -Math.PI * 0.45 * smooth((jt - 4) / 0.6) * (1 - smooth((jt - 6.4) / 0.6));
    status.textContent = `${p.state} · Tank: ${a.state} · Landship: ${b.state} · ${renderer.info.render.calls} draw calls`;
    timeline.value = String(time);
    document.querySelector("#time")!.textContent = `${time.toFixed(2)} / 24 s`;
    stage.dataset.ready = "true";
    stage.dataset.time = time.toFixed(3);
    stage.dataset.soldierState = p.state;
    stage.dataset.tankTravel = String(a.travel);
    stage.dataset.trackPhase = String(a.travel);
    controls.update();
    renderer.render(scene, camera);
  }
  play.onclick = () => {
    running = !running;
    previous = performance.now();
    sync();
  };
  document.querySelector<HTMLButtonElement>("#restart")!.onclick = () => {
    time = 0;
    draw();
  };
  document.querySelector<HTMLButtonElement>("#step")!.onclick = () => {
    running = false;
    time = (time + 1 / 30) % REVIEW_DURATION;
    sync();
    draw();
  };
  timeline.oninput = () => {
    running = false;
    time = Number(timeline.value);
    sync();
    draw();
  };
  document.querySelector<HTMLSelectElement>("#speed")!.onchange = (e) => {
    speed = Number((e.target as HTMLSelectElement).value);
  };
  document.querySelector<HTMLSelectElement>("#clip")!.onchange = (e) => {
    clip = (e.target as HTMLSelectElement).value as SoldierClip;
    time = 0;
    draw();
  };
  document.addEventListener("visibilitychange", () => {
    previous = performance.now();
  });
  sync();
  draw();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - previous) / 1000);
    previous = now;
    if (document.hidden) return;
    if (running) time = (time + dt * speed) % REVIEW_DURATION;
    draw();
  });
  window.addEventListener(
    "pagehide",
    () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      models.forEach((m) => m.dispose());
      cleanup.forEach((f) => f());
      resources.forEach((r) => r.dispose());
      labelTextures.forEach((t) => t.dispose());
      sun.shadow.map?.dispose();
      renderer.dispose();
    },
    { once: true },
  );
} catch (error) {
  status.textContent = `Animation preview failed: ${String(error)}`;
  stage.dataset.error = String(error);
}
