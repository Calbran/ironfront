import * as T from 'three';
import type {POIField} from '../../../../packages/game-core/src/countryPOI';
type Point={x:number;z:number};
/** All crop surfaces and clipped furrows share one draw call, regardless of parcel count. */
export function countryFieldGeometry(fields:POIField[]){
 const positions:number[]=[],colors:number[]=[];
 const palette={wheat:0xc4b250,barley:0x9d9b43,potatoes:0x4b642c,flax:0x7a8c50,beets:0x657936,fallow:0x806541};
 function add(poly:Point[],y:number,color:T.Color){for(let i=1;i<poly.length-1;i++)for(const p of [poly[0],poly[i+1],poly[i]]){positions.push(p.x,y,p.z);colors.push(color.r,color.g,color.b);}}
 function clip(poly:Point[],nx:number,nz:number,offset:number){const out:Point[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a.x*nx+a.z*nz-offset,db=b.x*nx+b.z*nz-offset;if(da>=0)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}}return out;}
 fields.forEach((f,index)=>{
  const poly=f.polygon??[{x:f.x-f.width/2,z:f.z-f.depth/2},{x:f.x+f.width/2,z:f.z-f.depth/2},{x:f.x+f.width/2,z:f.z+f.depth/2},{x:f.x-f.width/2,z:f.z+f.depth/2}];
  const color=new T.Color(palette[f.crop]).multiplyScalar(.9+(index*17%23)/100);
  const angle=f.rowAngle??Math.PI/2,nx=-Math.sin(angle),nz=Math.cos(angle),projections=poly.map(p=>p.x*nx+p.z*nz),min=Math.min(...projections),max=Math.max(...projections),spacing=Math.max(1.3,(max-min)/Math.min(240,f.rows));
  // Tile the surface with adjacent color bands instead of layering coplanar rows.
  const band=(a:number,b:number,c:T.Color)=>add(clip(clip(poly,nx,nz,a),-nx,-nz,-b),.04,c);
  let previous=min;for(let t=min+spacing*.5;t<max;t+=spacing){band(previous,t,color);const end=Math.min(max,t+spacing*.22);band(t,end,color.clone().multiplyScalar(f.crop==='fallow'?.75:1.16));previous=end;}if(previous<max)band(previous,max,color);
 });
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
