import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { pickCityOrbitPivot, rotateCityOrbit } from "../apps/web/src/experiments/cityOrbitPivot";
import { cityOcclusion } from "../apps/web/src/experiments/cityOcclusion";

test("focus-centered orbit does not move its target or change distance",()=>{
  for(const camera of [new T.PerspectiveCamera(50,1,.1,1000),new T.OrthographicCamera(-20,20,20,-20,.1,1000)]){
    const target=new T.Vector3(2,1,3),original=target.clone();
    camera.position.set(11,7,11);camera.lookAt(target);camera.updateMatrixWorld(true);
    const distance=camera.position.distanceTo(target);
    for(let i=0;i<20;i++){
      rotateCityOrbit(camera,target,original,.04,.02,.15,Math.PI/2-.08);
      camera.lookAt(target);camera.updateMatrixWorld(true);
      assert.ok(target.distanceTo(original)<1e-8);
      assert.ok(Math.abs(camera.position.distanceTo(target)-distance)<1e-8);
    }
  }
});

test("perspective orbit keeps the grabbed surface stationary on screen", () => {
  const camera=new T.PerspectiveCamera(50,1.5,.1,1000);
  const target=new T.Vector3(0,1,0), anchor=new T.Vector3(2,3,-1);
  camera.position.set(11,7,11);camera.lookAt(target);camera.updateMatrixWorld(true);
  const before=anchor.clone().project(camera);
  for(let i=0;i<20;i++){
    rotateCityOrbit(camera,target,anchor,.04,.025,.15,Math.PI/2-.08);
    camera.lookAt(target);camera.updateMatrixWorld(true);
    const after=anchor.clone().project(camera);
    assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<1e-8);
  }
});

test("cutaway excludes foreground blockers from orbit picking and resets in planning mode", () => {
  const material=new T.MeshBasicMaterial(), root=new T.Group();
  const geometry=new T.BoxGeometry(4,2,4), roof=new T.Mesh(geometry,material);
  roof.position.y=7;root.add(roof);
  const camera=new T.PerspectiveCamera();camera.position.set(0,20,0);
  camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  const cutaway=cityOcclusion([material]);
  const ray=new T.Raycaster(camera.position.clone(),new T.Vector3(0,-1,0));
  cutaway.update(camera,[new T.Vector3()]);
  assert.equal(pickCityOrbitPivot(ray,root,camera,new T.Vector3())?.y,0);
  assert.equal(material.userData.cityCutawayPoint(new T.Vector3(0,-5,0)),false);
  cutaway.update(camera,[]);
  assert.equal(pickCityOrbitPivot(ray,root,camera,new T.Vector3())?.y,8);
  geometry.dispose();material.dispose();
});

test("orbit picks visible roofs, skips hidden LODs and translucent effects, and handles instancing", () => {
  const root = new T.Group();
  const geometry = new T.BoxGeometry(4, 2, 4), material = new T.MeshBasicMaterial();
  const roof = new T.InstancedMesh(geometry, material, 1);
  roof.setMatrixAt(0, new T.Matrix4().makeTranslation(0, 7, 0));
  root.add(roof);
  const hidden = new T.Group(); hidden.visible = false;
  const lod = new T.Mesh(geometry, material); lod.position.y = 13; hidden.add(lod); root.add(hidden);
  const effectMaterial = new T.MeshBasicMaterial({transparent:true, opacity:.5});
  const effect = new T.Mesh(geometry,effectMaterial); effect.position.y=16; root.add(effect);
  const camera = new T.OrthographicCamera(-10,10,10,-10,.1,100);
  camera.position.set(0,20,0); camera.up.set(0,0,-1); camera.lookAt(0,0,0); camera.updateMatrixWorld(true);
  const ray = new T.Raycaster(new T.Vector3(0,20,0),new T.Vector3(0,-1,0));
  assert.equal(pickCityOrbitPivot(ray,root,camera,new T.Vector3())?.y,8);
  ray.ray.origin.x=8;
  const fallback=pickCityOrbitPivot(ray,root,camera,new T.Vector3(0,5,0));
  assert.ok(fallback && Math.abs(fallback.y-5)<1e-8);
  geometry.dispose();material.dispose();effectMaterial.dispose();roof.dispose();
});

test("orbit holds a rooftop's screen position and zoom through yaw and steep pitch changes", () => {
  const camera = new T.OrthographicCamera(-20,20,20,-20,.1,1000);
  camera.zoom=2.4; camera.updateProjectionMatrix();
  const target=new T.Vector3(0,3,0), anchor=new T.Vector3(4,12,-2);
  camera.position.set(0,100,12);camera.lookAt(target);camera.updateMatrixWorld(true);
  const before=anchor.clone().project(camera), distance=camera.position.distanceTo(target);
  for(let i=0;i<20;i++) {
    rotateCityOrbit(camera,target,anchor,.04,.065,.15,Math.PI/2-.08);
    camera.lookAt(target);camera.updateMatrixWorld(true);
    const after=anchor.clone().project(camera);
    assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<1e-8);
    assert.ok(Math.abs(camera.position.distanceTo(target)-distance)<1e-8);
    assert.equal(camera.zoom,2.4);
  }
});
