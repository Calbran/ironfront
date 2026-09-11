import {performance} from 'node:perf_hooks';
import {planCombinedDistrict} from '../packages/game-core/src/combinedDistrict';
import {createCityTactics} from '../packages/game-core/src/cityTactics';
import {createCityUnitTrial} from '../packages/game-core/src/cityUnitTrial';
const tactics=createCityTactics(planCombinedDistrict(732,'worldgen',true),732,'worldgen');
const trial=createCityUnitTrial(tactics);
trial.units.splice(3);for(let id=4;id<=6;id++)trial.units.push({...structuredClone(trial.units[0]),id});
trial.selectMany([1,2,3,4,5,6]);
const wall=tactics.obstacles.find(o=>o.kind==='wall')!;
const samples:number[]=[];
for(let i=0;i<220;i++) {const t=performance.now();trial.previewOrder({x:wall.x+Math.sin(wall.angle)*(wall.depth/2+2.5),z:wall.z+Math.cos(wall.angle)*(wall.depth/2+2.5)},i*.03);if(i>=20)samples.push(performance.now()-t);}
samples.sort((a,b)=>a-b);
console.log(JSON.stringify({obstacles:tactics.obstacles.length,samples:samples.length,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95Ms:samples[Math.floor(samples.length*.95)],maxMs:samples.at(-1)}));
