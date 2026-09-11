import {createCityBattleAudio} from '../audio/cityBattleAudio';
import {cityBuildTools} from "./cityBuildTools";
import {cityAwarenessOverlay} from "./cityAwarenessOverlay";
import {CITY_CRATER_LIMIT,CITY_CRATER_SECONDS} from "../../../../packages/game-core/src/cityBallistics";
import {tracerSegment} from "./battlePresentation";
import { remoteCityBattle } from "./remoteCityBattle";
import type { TerrainProfile } from "../../../../packages/game-core/src/combinedDistrict";
import { createJeep } from "../prototypes/jeepModel";
import { cityUnitMarkers } from "./cityUnitMarkers";
import { cityIdleMotion } from "./cityIdleMotion";
import { CITY_TRIAL_SANDBAGS } from "../../../../packages/game-core/src/cityTactics";
import { createMilitaryModel } from "../prototypes/militaryModels";
import { createTankTracks } from "../prototypes/tankTracks";
import { runFlight } from "../prototypes/animationTimeline";
import * as T from "three";
import {
  createCityUnitTrial,
  CITY_RUN_STRIDE,
} from "../../../../packages/game-core/src/cityUnitTrial";
import type { createCityTactics } from "../../../../packages/game-core/src/cityTactics";
import type { bakeInfantry } from "../infantryModel";

export function createCityTestUnits(
  root: T.Group,
  getCamera: () => T.Camera,
  canvas: HTMLCanvasElement,
  rig: ReturnType<typeof bakeInfantry>,
  tactics: ReturnType<typeof createCityTactics>,
  config: {seed:number;profile:TerrainProfile},
  focus: (p: { x: number; z: number }) => void,
) {
  const jeep = createJeep();
  const tank = createMilitaryModel("tank", true);
  const tracks = createTankTracks(tank.root);
  const turret=tank.root.getObjectByName("turret_yaw")!,barrel=tank.root.getObjectByName("barrel_recoil")!;
  const corpseTimes=new Map<number,number>();
  const aimTwist=new T.Matrix4();
  const point = new T.Vector3(),
    matrix = new T.Matrix4();
  const run = Array.from({ length: 65 }, (_, i) => {
    const phase = i / 64,
      pose = rig.pose("run", phase);
    let min = Infinity;
    rig.parts.forEach((part, j) => {
      if (part.key !== "boot") return;
      matrix.fromArray(pose[j]);
      const a = part.geometry.attributes.position;
      for (let n = 0; n < a.count; n++) {
        point.fromBufferAttribute(a, n).applyMatrix4(matrix);
        min = Math.min(min, point.y);
      }
    });
    const lift = runFlight(phase) - (Number.isFinite(min) ? min : 0);
    pose.forEach((p) => (p[13] += lift));
    return pose;
  });
  const aimed = rig.pose("aim", 0.9);
  const covered = {
    partial: rig.pose("aim", 0.9, 0, 0.7, 0),
    full: rig.pose("aim", 0.9, 0, 0.25, 0.35),
  };
  const audio=createCityBattleAudio(root,getCamera,canvas);
  const trial = remoteCityBattle(tactics,{...config, multipleBattles: new URLSearchParams(location.search).get("battles") === "multiple"}),
    objects = new Map<number, T.Group>(),
    rings = new Map<number, T.Mesh>();
  const battleSites=document.createElement("div");
  battleSites.style.cssText="position:absolute;bottom:78px;left:16px;display:flex;gap:6px;z-index:20";
  const multiple=new URLSearchParams(location.search).get("battles")==="multiple";
  const switchBattle=document.createElement("button");switchBattle.textContent=multiple?"Restage firefights":"Stage multiple firefights";
  switchBattle.onclick=()=>{const url=new URL(location.href);url.searchParams.set("battles","multiple");location.assign(url.href);};
  battleSites.append(switchBattle);
  if(multiple)for(const [label,id] of [["Main squad",1],["West firefight",210],["East firefight",220]] as const){
    const unit=trial.units.find(u=>u.id===id);if(!unit)continue;
    const button=document.createElement("button");button.textContent=label;button.onclick=()=>focus(unit);battleSites.append(button);
  }
  canvas.parentElement!.append(battleSites);
  const bodyMaterial = new T.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.9,
  });
  const ringGeometry = new T.RingGeometry(0.55, 0.68, 24).rotateX(-Math.PI / 2);
  const idleRing = new T.MeshBasicMaterial({
    color: 0x72ded3,
    depthTest: false,
    transparent: true,
    opacity: 0.8,
    side: T.DoubleSide,
  });
  const enemyRing = new T.MeshBasicMaterial({color:0xf16b59,depthTest:false,side:T.DoubleSide});
  const enemyBody=bodyMaterial.clone();enemyBody.color.set(0xda9588);
  const selectedRing = new T.MeshBasicMaterial({
    color: 0xffdc69,
    depthTest: false,
    side: T.DoubleSide,
  });
  const layer = new T.Group();
  root.add(layer);
  const bagGeometry = new T.BoxGeometry(0.34, 0.14, 0.16),
    bagMaterial = new T.MeshStandardMaterial({ color: 0x938469, roughness: 1 });
  const bags = new T.InstancedMesh(bagGeometry, bagMaterial, 192),
    bagPose = new T.Object3D();
  for (let i = 0; i < 192; i++) {
    const row = Math.floor(i / 48),
      col = i % 12,
      side = Math.floor((i % 48) / 12);
    bagPose.position.set(
      CITY_TRIAL_SANDBAGS.x - 1.84 + col * 0.33 + (row % 2) * 0.05,
      tactics.height(CITY_TRIAL_SANDBAGS) + 0.19 + row * 0.13,
      CITY_TRIAL_SANDBAGS.z + (side - 1.5) * 0.16,
    );
    bagPose.updateMatrix();
    bags.setMatrixAt(i, bagPose.matrix);
  }
  bags.castShadow = true;
  layer.add(bags);
  for (const unit of trial.units) {
    const obj = new T.Group(),
      soldier = new T.Group();
    soldier.scale.setScalar(0.55);
    obj.add(soldier);
    if (unit.kind === "vehicle")
      soldier.add(unit.vehicleType === "jeep" ? jeep.root : tank.root);
    else
      for (const part of rig.parts) {
        const mesh = new T.Mesh(part.geometry, unit.friendly ? bodyMaterial : enemyBody);
        mesh.matrixAutoUpdate = false;
        mesh.castShadow = true;
        soldier.add(mesh);
      }
    const ring = new T.Mesh(ringGeometry, idleRing);
    ring.position.y = 0.1;
    ring.renderOrder = 22;
    obj.add(ring);
    if (unit.kind === "vehicle") ring.scale.setScalar(1.65);
    rings.set(unit.id, ring);
    objects.set(unit.id, obj);
    layer.add(obj);
  }
  const ghosts = new Map<
    number,
    { root: T.Group; material: T.MeshBasicMaterial }
  >();
  let previewRequest:
    { p: { x: number; z: number }; facing?: number } | undefined;
  let orderPreview: ReturnType<typeof trial.previewOrder> = [];
  for (const unit of trial.units) {
    const ghost = new T.Group(),
      material = new T.MeshBasicMaterial({
        color: 0x9dcbd3,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        depthTest: false,
      });
    if (unit.kind === "vehicle") {
      const body = (unit.vehicleType === "jeep" ? jeep.root : tank.root).clone(
        true,
      );
      body.scale.setScalar(0.55);
      body.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.material = material;
          o.castShadow = false;
        }
      });
      ghost.add(body);
    } else {
      const body = new T.Group();
      body.scale.setScalar(0.55);
      for (const part of rig.parts) {
        const mesh = new T.Mesh(part.geometry, material);
        mesh.matrixAutoUpdate = false;
        body.add(mesh);
      }
      ghost.add(body);
    }
    const ring = new T.Mesh(ringGeometry, material);
    ring.position.y = 0.1;
    ring.renderOrder = 23;
    ghost.add(ring);
    ghost.visible = false;
    layer.add(ghost);
    ghosts.set(unit.id, { root: ghost, material });
  }
  let lastPreviewSolve = -Infinity;
  function previewAt(p: { x: number; z: number }, facing?: number) {
    previewRequest = { p: { ...p }, facing };
    const now = performance.now();
    if (now - lastPreviewSolve < 80) return;
    lastPreviewSolve = now;
    orderPreview = trial.previewOrder(p, facing);
    for (const g of ghosts.values()) g.root.visible = false;
    for (const proposed of orderPreview) {
      const g = ghosts.get(proposed.id)!;
      g.root.visible = true;
      g.root.position.set(
        proposed.x,
        tactics.surfaceHeight(proposed),
        proposed.z,
      );
      g.root.rotation.y = proposed.angle;
      g.material.color.set(
        proposed.valid
          ? proposed.cover === "full"
            ? 0x75e299
            : proposed.cover === "partial"
              ? 0xffd16c
              : 0xa4cddd
          : 0xff6655,
      );
      if (proposed.kind === "infantry") {
        const pose =
          proposed.cover === "none" ? aimed : covered[proposed.cover];
        g.root.children[0].children.forEach((o, i) =>
          o.matrix.fromArray(pose[i]),
        );
      }
    }
  }
  function clearPreview() {
    previewRequest = undefined;
    lastPreviewSolve = -Infinity;
    orderPreview = [];
    for (const g of ghosts.values()) g.root.visible = false;
  }
  let pathLine: T.Line | undefined;
  const clearPath = () => {
    if (pathLine) {
      layer.remove(pathLine);
      pathLine.geometry.dispose();
      (pathLine.material as T.Material).dispose();
      pathLine = undefined;
    }
  };
  function drawPath() {
    clearPath();
    const active = trial.units.filter(
      (u) => trial.selectedIds().includes(u.id) && u.path.length,
    );
    if (!active.length) return;
    const points = active.flatMap((u) =>
      [u, ...u.guide.slice(1)].flatMap((p, i, ps) => (i ? [ps[i - 1], p] : [])),
    );
    const g = new T.BufferGeometry().setFromPoints(
      points.map(
        (p) => new T.Vector3(p.x, tactics.surfaceHeight(p) + 0.1, p.z),
      ),
    );
    pathLine = new T.LineSegments(
      g,
      new T.LineBasicMaterial({ color: 0xffdc69, depthTest: false }),
    );
    pathLine.renderOrder = 21;
    layer.add(pathLine);
  }
  const raycaster = new T.Raycaster(),
    mouse = new T.Vector2();
  function screen(p: { x: number; z: number }, above = 0) {
    const camera = getCamera();
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    const v = root
        .localToWorld(new T.Vector3(p.x, tactics.height(p) + above, p.z))
        .project(camera),
      rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + ((v.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - v.y) / 2) * rect.height,
    };
  }
  function ground(e: PointerEvent) {
    const camera = getCamera();
    const rect = canvas.getBoundingClientRect();
    mouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(mouse, camera);
    root.updateMatrixWorld(true);
    const ray = raycaster.ray
        .clone()
        .applyMatrix4(root.matrixWorld.clone().invert()),
      p = new T.Vector3();
    // Intersect the height field in local city coordinates (including world-river bearing).
    let y = 2;
    for (let i = 0; i < 8; i++) {
      if (!ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -y), p))
        return;
      y = tactics.surfaceHeight({ x: p.x, z: p.z });
    }
    return { x: p.x, z: p.z };
  }
  const buildTools=cityBuildTools(canvas,layer,tactics,ground,trial.units,trial);
  const marquee = document.createElement("div");
  Object.assign(marquee.style, {
    position: "fixed",
    pointerEvents: "none",
    border: "1px solid #ffdc69",
    background: "rgba(255,220,105,.12)",
    display: "none",
    zIndex: "1000",
  });
  document.body.append(marquee);
  let down:
    | { x: number; y: number; button: number; dragged: boolean; shift: boolean }
    | undefined;
  const onDown = (e: PointerEvent) => {
    down = {
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      dragged: false,
      shift: e.shiftKey,
    };
    if (e.button === 0) {
      e.stopImmediatePropagation();
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5)
      down.dragged = true;
    if (down.button !== 0) return;
    e.stopImmediatePropagation();
    if (down.dragged)
      Object.assign(marquee.style, {
        display: "block",
        left: `${Math.min(down.x, e.clientX)}px`,
        top: `${Math.min(down.y, e.clientY)}px`,
        width: `${Math.abs(e.clientX - down.x)}px`,
        height: `${Math.abs(e.clientY - down.y)}px`,
      });
  };
  const onUp = (e: PointerEvent) => {
    const start = down;
    down = undefined;
    marquee.style.display = "none";
    if (!start) return;
    if (start.button === 0) {
      e.stopImmediatePropagation();
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
      if (start.dragged) {
        const ids = trial.units
          .filter((u) => {
            const p = screen(u, 0.5);
            return (
              p.x >= Math.min(start.x, e.clientX) &&
              p.x <= Math.max(start.x, e.clientX) &&
              p.y >= Math.min(start.y, e.clientY) &&
              p.y <= Math.max(start.y, e.clientY)
            );
          })
          .map((u) => u.id);
        trial.selectMany(ids, start.shift);
      } else {
        const hit = trial.units
          .filter(u=>u.visible!==false)
          .map((u) => ({ u, p: screen(u, 0.5) }))
          .map(({ u, p }) => ({
            u,
            d: Math.hypot(p.x - e.clientX, p.y - e.clientY),
          }))
          .filter((v) => v.d < 18)
          .sort((a, b) => a.d - b.d)[0];
        if(hit?.u.friendly===false)trial.attack(hit.u.id);else trial.selectMany(hit ? [hit.u.id] : [], start.shift);
      }
      drawPath();
    } else if (start.button === 2 && !start.dragged) {
      const p = ground(e);
      if (p) {
        const enemy=trial.units.find(u=>!u.friendly&&u.health>0&&Math.hypot(u.x-p.x,u.z-p.z)<2);
        if(enemy)trial.attack(enemy.id);else trial.order(p);
        drawPath();
      }
    }
  };
  const onCancel = () => {
    down = undefined;
    marquee.style.display = "none";
  };
  const onKey = (e: KeyboardEvent) => {
    if (
      e.key === "Escape" &&
      !(
        e.target instanceof HTMLElement &&
        e.target.closest("input,textarea,select")
      )
    ) {
      trial.select();
      clearPath();
    }
  };
  canvas.addEventListener("pointerdown", onDown, true);
  canvas.addEventListener("pointerup", onUp, true);
  canvas.addEventListener("pointermove", onMove, true);
  canvas.addEventListener("pointercancel", onCancel);
  window.addEventListener("keydown", onKey);
  window.addEventListener("blur", onCancel);
  const awareness=cityAwarenessOverlay(canvas,layer,tactics);
  const markers=cityUnitMarkers(canvas,trial.units,(id,add)=>{
    if(trial.units.find(u=>u.id===id)?.friendly===false)trial.attack(id);else trial.selectMany([id],add);
    drawPath();
  },focus);
  const tracerGeometry=new T.BufferGeometry();
  const tracerPositions=new Float32Array(128*6);tracerGeometry.setAttribute('position',new T.BufferAttribute(tracerPositions,3));
  const tracerMaterial=new T.LineBasicMaterial({color:0xffd48a});
  const tracers=new T.LineSegments(tracerGeometry,tracerMaterial);tracers.frustumCulled=false;layer.add(tracers);
  const flashGeometry=new T.SphereGeometry(1,6,4),flashMaterial=new T.MeshBasicMaterial({color:0xffcb75});
  const riflePartIndex=rig.parts.findIndex(part=>part.key==="rifle"),muzzlePoint=new T.Vector3();
  const flashes=new T.InstancedMesh(flashGeometry,flashMaterial,128),flashPose=new T.Object3D();flashes.frustumCulled=false;layer.add(flashes);
  const dustGeometry=new T.SphereGeometry(1,7,4),dustMaterial=new T.MeshBasicMaterial({color:0x9c8b70,transparent:true,opacity:.28,depthWrite:false});
  const dust=new T.InstancedMesh(dustGeometry,dustMaterial,768);dust.frustumCulled=false;layer.add(dust);
  const shellGeometry=new T.SphereGeometry(1,8,5),shellMaterial=new T.MeshBasicMaterial({color:0xbfb49b});
  const shells=new T.InstancedMesh(shellGeometry,shellMaterial,128);shells.frustumCulled=false;layer.add(shells);
  const craterGeometry=new T.CircleGeometry(1,13).rotateX(-Math.PI/2),rimGeometry=new T.RingGeometry(.78,1,13).rotateX(-Math.PI/2);
  const craterMaterial=new T.MeshBasicMaterial({color:0x302b25,transparent:true,opacity:.72,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),rimMaterial=new T.MeshBasicMaterial({color:0x75644c,transparent:true,opacity:.65,depthWrite:false});
  const craters=new T.InstancedMesh(craterGeometry,craterMaterial,CITY_CRATER_LIMIT),rims=new T.InstancedMesh(rimGeometry,rimMaterial,CITY_CRATER_LIMIT);
  craters.frustumCulled=false;rims.frustumCulled=false;layer.add(craters,rims);
  const scars:{x:number;z:number;born:number;size:number}[]=[];
  const firedAt=new Map<number,number>();
  let lastShot=0;
  const effects:{shot:ReturnType<typeof trial.state>['shots'][number];start:number;until:number;fired:boolean}[]=[];
  let guideSignature="";
  let idleTime=0;
  function update(dt: number) {
    idleTime+=dt;
    trial.tick(dt);
    const audioState=trial.state();audio.update(idleTime,audioState.running,trial.units,audioState.shots,audioState.sounds);
    for(const shot of trial.state().shots)if(shot.id>lastShot){
      lastShot=shot.id;
      const start=idleTime+((shot.id*37)%173)/1000;
      const duration=shot.impact?1.1:shot.shell?.7:Math.max(.06,Math.hypot(shot.tx-shot.x,shot.tz-shot.z)/120);
      effects.push({shot,start,until:start+duration,fired:false});
    }
    for(let i=effects.length-1;i>=0;i--)if(effects[i].until<idleTime)effects.splice(i,1);
    if(effects.length>128)effects.splice(0,effects.length-128);
    let n=0,flashCount=0,dustCount=0,shellCount=0;
    for(const effect of effects){const {shot,start}=effect,age=idleTime-start;if(age<0)continue;
      if(!effect.fired){effect.fired=true;if(!shot.impact)firedAt.set(shot.from,start);else {scars.push({x:shot.tx,z:shot.tz,born:start,size:.65+(shot.id%5)*.045});if(scars.length>CITY_CRATER_LIMIT)scars.shift();}}
      const dx=shot.tx-shot.x,dz=shot.tz-shot.z,length=Math.hypot(dx,dz)||1;
      const muzzleX=shot.x+(dx/length*(shot.shell?1.65:.48)),muzzleZ=shot.z+(dz/length*(shot.shell?1.65:.48));
      if(!shot.impact&&age<(shot.shell?.09:.085)){
        const x=shot.impact?shot.tx:muzzleX,z=shot.impact?shot.tz:muzzleZ;
        flashPose.position.set(x,tactics.surfaceHeight({x,z})+(shot.impact?.25:shot.shell?1.24:.65),z);
        if(!shot.shell && riflePartIndex>=0){
          const gun=objects.get(shot.from)?.children[0]?.children[riflePartIndex];
          if(gun){gun.updateWorldMatrix(true,false);muzzlePoint.set(.65,.07,0);gun.localToWorld(muzzlePoint);root.worldToLocal(muzzlePoint);flashPose.position.copy(muzzlePoint);}
        }
        const size=shot.impact?.55:shot.shell?.48*(1-age/.1):.085*(1-age/.11);
        flashPose.scale.set(size,shot.shell?size*.65:size,shot.shell?size*1.7:size*2.4);flashPose.rotation.y=Math.atan2(dx,dz);
        flashPose.updateMatrix();flashes.setMatrixAt(flashCount++,flashPose.matrix);
      }
      if((shot.shell||shot.impact)&&age<(shot.impact?1.1:.65))for(let k=0;k<(shot.impact?6:2);k++){
        const x=shot.impact?shot.tx:muzzleX,z=shot.impact?shot.tz:muzzleZ,r=.2+age*2.8;
        flashPose.position.set(x+(shot.impact?Math.cos(k*Math.PI/3)*age*1.8:(k?1:-1)*dz/length*age*1.7),tactics.surfaceHeight({x,z})+.12+age*(shot.impact?.7:.2),z+(shot.impact?Math.sin(k*Math.PI/3)*age*1.8:-(k?1:-1)*dx/length*age*1.7));
        flashPose.rotation.set(0,0,0);flashPose.scale.set(r*(shot.impact?.55:1),.1+age*(shot.impact?.65:.3),r*(shot.impact?.55:.7));flashPose.updateMatrix();dust.setMatrixAt(dustCount++,flashPose.matrix);
      }
      // Rifle fire is mostly muzzle/recoil feedback; only occasional rounds have a visible trail.
      if(shot.impact || (!shot.shell && shot.id%3!==0))continue;
      const distance=Math.hypot(shot.tx-shot.x,shot.tz-shot.z),segment=tracerSegment(distance,age,shot.shell);
      if(!segment)continue;
      const y=tactics.surfaceHeight({x:shot.x,z:shot.z})+(shot.shell?1.24:.65),ty=tactics.surfaceHeight({x:shot.tx,z:shot.tz})+.5;
      const at=(t:number)=>[shot.x+(shot.tx-shot.x)*t,y+(ty-y)*t,shot.z+(shot.tz-shot.z)*t];
      if(shot.shell){
        const t=segment.head,position=at(t);flashPose.position.set(position[0],position[1],position[2]);
        flashPose.rotation.set(0,Math.atan2(dx,dz),0);flashPose.scale.set(.10,.10,.25);flashPose.updateMatrix();shells.setMatrixAt(shellCount++,flashPose.matrix);
      } else tracerPositions.set([...at(segment.tail),...at(segment.head)],n++*6);
    }
    while(scars.length&&idleTime-scars[0].born>CITY_CRATER_SECONDS)scars.shift();
    scars.forEach((scar,i)=>{
      const remaining=CITY_CRATER_SECONDS-(idleTime-scar.born),fade=Math.min(1,remaining/15);
      flashPose.position.set(scar.x,tactics.surfaceHeight(scar)+.018,scar.z);flashPose.rotation.set(0,i*2.4,0);
      flashPose.scale.set(scar.size*fade,1,scar.size*.82*fade);flashPose.updateMatrix();craters.setMatrixAt(i,flashPose.matrix);
      flashPose.position.y+=.012;flashPose.scale.multiplyScalar(1.2);flashPose.updateMatrix();rims.setMatrixAt(i,flashPose.matrix);
    });
    craters.count=rims.count=scars.length;craters.instanceMatrix.needsUpdate=true;rims.instanceMatrix.needsUpdate=true;
    shells.count=shellCount;shells.instanceMatrix.needsUpdate=true;
    dust.count=dustCount;dust.instanceMatrix.needsUpdate=true;
    flashes.count=flashCount;flashes.instanceMatrix.needsUpdate=true;
    tracerGeometry.setDrawRange(0,n*2);tracerGeometry.attributes.position.needsUpdate=true;
    if (previewRequest) previewAt(previewRequest.p, previewRequest.facing);
    const selected = trial.selectedIds();
    buildTools.sync(trial.state().sandbags,trial.state().message);
    const guides=JSON.stringify(trial.units.filter(u=>selected.includes(u.id)).map(u=>u.guide));
    if(guides!==guideSignature){guideSignature=guides;drawPath();}
    awareness.update(idleTime,trial.units,selected,trial.state().contacts,screen,getCamera(),root);
    markers.update(getCamera(),root,u=>tactics.surfaceHeight(u),selected);
    for (const u of trial.units) {
      const obj = objects.get(u.id)!;
      obj.visible=u.visible!==false&&(u.health>0||u.kind==='infantry');
      rings.get(u.id)!.visible=u.visible!==false&&u.health>0;
      if(u.visible===false)continue;
      if(u.health<=0&&u.kind==='infantry'){
        if(!corpseTimes.has(u.id))corpseTimes.set(u.id,idleTime);
        const age=idleTime-corpseTimes.get(u.id)!,variant=u.id%3,t=Math.min(1,age/(.9+variant*.22)),fall=t*t*(3-2*t);
        const body=obj.children[0];body.scale.setScalar(.55);
        body.position.set(variant===1?fall*.18:0,.16*fall,variant===0?-.12*fall:.08*fall);
        body.rotation.set(variant===1?0:(variant===0?-1:1)*Math.PI/2*fall,0,variant===1?Math.PI/2*fall:Math.sin(t*Math.PI)*.14);
        body.children.forEach((part,i)=>part.matrix.fromArray((variant===2?covered.full:covered.partial)[i]));
        continue;
      }
      obj.position.set(u.x, tactics.surfaceHeight(u), u.z);
      obj.rotation.y = u.angle;
      if (u.kind === "vehicle") {
        if (u.vehicleType !== "jeep") {
          tracks.update(u.leftTrack, u.rightTrack);
          turret.rotation.y=(u.turretAngle??u.angle)-u.angle;
          const age=idleTime-(firedAt.get(u.id)??-10);
          barrel.position.z=age<.4?-.36*Math.sin(Math.min(1,age/.4)*Math.PI):0;
          obj.children[0].rotation.x=age<.45?-.045*Math.sin(age/.45*Math.PI):0;
        }
        rings.get(u.id)!.material = selected.includes(u.id)
          ? selectedRing
          : u.friendly ? idleRing : enemyRing;
        continue;
      }
      const phase = (u.distance / CITY_RUN_STRIDE) * Math.PI * 2;
      const amount = Math.min(1, u.speed / 0.6);
      const body = obj.children[0];
      const idleMotion=cityIdleMotion(idleTime,u.id,u.speed,u.moving,u.facing!==undefined,u.cover);
      body.position.y = 0.035 * (1 - Math.cos(phase * 2)) * 0.5 * amount;
      body.rotation.z = 0.025 * Math.sin(phase) * amount;
      // Stretch from the planted feet rather than translating the whole soldier.
      body.scale.y=.55*(1+idleMotion.breath);
      body.rotation.z+=idleMotion.sway;
      body.position.z=-Math.max(0,.1-(idleTime-(firedAt.get(u.id)??-10)))*.3;
      const frame = ((u.distance / CITY_RUN_STRIDE) % 1) * 64,
        first = Math.floor(frame),
        fraction = frame - first;
      const blend = u.moving ? 1 : Math.min(1, u.speed / 0.6);
      obj.children[0].children.forEach((part, i) => {
        const a = run[first][i],
          b = run[first + 1][i],
          idle =
            u.cover === "none"
              ? u.facing === undefined
                ? rig.walk[0][i]
                : aimed[i]
              : covered[u.cover][i];
        const upper=!['hips','thigh','shin','boot'].includes(rig.parts[i].key);
        const movingFire=u.moving&&u.firing&&upper;
        for (let j = 0; j < 16; j++)
          part.matrix.elements[j] =
            movingFire ? aimed[i][j] : (a[j] + (b[j] - a[j]) * fraction) * blend + idle[j] * (1 - blend);
        if(movingFire&&u.aimAngle!==undefined){aimTwist.makeRotationY(Math.atan2(Math.sin(u.aimAngle-u.angle),Math.cos(u.aimAngle-u.angle)));part.matrix.premultiply(aimTwist);}
      });
      rings.get(u.id)!.material = selected.includes(u.id)
        ? selectedRing
        : u.friendly ? idleRing : enemyRing;
    }
    if (
      pathLine &&
      !trial.units.some((u) => selected.includes(u.id) && u.moving)
    )
      clearPath();
  }
  update(0);
  return {
    update,
    toggleBattle:trial.toggle,
    selectSquad(){trial.selectMany(trial.units.filter(u=>u.friendly&&u.health>0&&u.kind==="infantry").map(u=>u.id));drawPath();},
    previewAt,
    clearPreview,
    previewState: () => orderPreview.map((p) => ({ ...p })),
    orderAt(p: { x: number; z: number }, facing?: number) {
      trial.order(p, facing);
      drawPath();
    },
    orderScreen(e: PointerEvent) {
      const p = ground(e);
      if (p) {
        trial.order(p);
        drawPath();
      }
    },
    state: () => trial.state(),
    testFire: trial.testFire,
    resetHealth: trial.resetHealth,
    screen: (id: number) => {
      const u = trial.units.find((u) => u.id === id);
      return u ? screen(u, 0.5) : undefined;
    },
    project: screen,
    select: (id: number) => {
      trial.select(id);
      drawPath();
      const unit = trial.units.find((u) => u.id === id);
      if (unit) focus(unit);
    },
    stop: () => {
      trial.stop();
      clearPath();
    },
    dispose: () => {
      battleSites.remove();
      audio.dispose();
      trial.dispose();
      buildTools.dispose();
      shells.dispose();shellGeometry.dispose();shellMaterial.dispose();craters.dispose();rims.dispose();craterGeometry.dispose();rimGeometry.dispose();craterMaterial.dispose();rimMaterial.dispose();
      dust.dispose();dustGeometry.dispose();dustMaterial.dispose();
      flashes.dispose();flashGeometry.dispose();flashMaterial.dispose();
      tracerGeometry.dispose();tracerMaterial.dispose();enemyRing.dispose();enemyBody.dispose();
      markers.dispose();
      awareness.dispose();
      canvas.removeEventListener("pointerdown", onDown, true);
      canvas.removeEventListener("pointerup", onUp, true);
      canvas.removeEventListener("pointermove", onMove, true);
      marquee.remove();
      canvas.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onCancel);
      clearPath();
      root.remove(layer);
      ringGeometry.dispose();
      idleRing.dispose();
      selectedRing.dispose();
      bodyMaterial.dispose();
      tracks.dispose();
      for (const g of ghosts.values()) {
        g.root.traverse((o) => {
          if (o instanceof T.InstancedMesh) o.dispose();
        });
        g.material.dispose();
      }
      tank.dispose();
      jeep.root.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      bags.dispose();
      bagGeometry.dispose();
      bagMaterial.dispose();
    },
  };
}
