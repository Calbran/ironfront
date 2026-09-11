import {parentPort,workerData} from 'node:worker_threads';
import {tsImport} from 'tsx/esm/api';
const {planCombinedDistrict}=await tsImport('../../../packages/game-core/src/combinedDistrict.ts',import.meta.url);
parentPort.postMessage(planCombinedDistrict(workerData.seed,workerData.profile,true));
