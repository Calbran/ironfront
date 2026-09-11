import {buildMiniatureData} from '../apps/web/src/experiments/buildMiniatureData';
import {placeCountryPOIs} from '../packages/game-core/src/countryPOIPlacement';
const data=buildMiniatureData('Meridian');const sites=placeCountryPOIs(data.world,data.roads);console.log(JSON.stringify({roads:data.roads.length,sites:sites.length,kinds:[...new Set(sites.map(s=>s.kind))]}));
