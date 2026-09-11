import * as T from 'three';
import type {MiniatureKit} from './referenceAssets';
import type {MiniatureData} from './miniatureData';
import {placeCountryPOIs} from '../../../../packages/game-core/src/countryPOIPlacement';
import {generateCountryPOI} from '../../../../packages/game-core/src/countryPOI';
import {countryPOIAssets} from './countryPOIAssets';
export function countryWorldPOIs(scene:T.Scene,data:MiniatureData,kit:MiniatureKit){
 const sites=placeCountryPOIs(data.world,data.roads),resident=new Map<string,ReturnType<typeof countryPOIAssets>>();
 const geo=new T.ConeGeometry(1.2,2,4),material=new T.MeshBasicMaterial({color:0xc7b78c}),markers=new T.InstancedMesh(geo,material,sites.length),o=new T.Object3D();
 sites.forEach((p,i)=>{o.position.set(p.x/12,1,p.y/12);o.updateMatrix();markers.setMatrixAt(i,o.matrix);});scene.add(markers);
 let last=0;
 return {sites,update(focus:T.Vector3,tactical:boolean,strategy:boolean,time:number){
  markers.visible=!strategy&&!tactical;if(time-last<300)return;last=time;
  const wanted=tactical&&!strategy?sites.filter(p=>Math.hypot(p.x/12-focus.x,p.y/12-focus.z)<200).sort((a,b)=>Math.hypot(a.x/12-focus.x,a.y/12-focus.z)-Math.hypot(b.x/12-focus.x,b.y/12-focus.z)).slice(0,6):[];
  for(const [id,asset] of resident)if(!wanted.some(p=>p.id===id)){asset.dispose();resident.delete(id);}
  for(const site of wanted)if(!resident.has(site.id)){const asset=countryPOIAssets(generateCountryPOI(site.kind,site.seed),kit,false);asset.group.position.set(site.x/12,.025,site.y/12);asset.group.rotation.y=site.angle;scene.add(asset.group);resident.set(site.id,asset);}
 },dispose(){resident.forEach(a=>a.dispose());scene.remove(markers);markers.dispose();geo.dispose();material.dispose();}};
}
