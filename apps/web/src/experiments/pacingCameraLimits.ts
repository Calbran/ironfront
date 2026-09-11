type Position={x:number;y:number;z:number};
export const PACING_MIN_CAMERA_HEIGHT=4;
/** Shared terrain height protects both the camera and its moving orbit target. */
export function constrainPacingCamera(camera:Position,target:Position,height:(p:Position)=>number=()=>0){
 // Recover a cursor-zoom/pan pivot that has travelled under the map first.
 const floor=height(target);
 if(target.y<floor){camera.y+=floor-target.y;target.y=floor;}
 camera.y=Math.max(height(camera)+PACING_MIN_CAMERA_HEIGHT,camera.y);
}
