import test from "node:test";
import assert from "node:assert/strict";
import { CURVED_OCEAN_WATERFRONT as coast, OCEAN_CITY_WATERFRONT, shoreAt, shoreSlope,
  validateWaterfront, coastalFootprintOnLand, portInfrastructure } from "../packages/game-core/src/portDistrict";
import { combinedPosition, combinedCanonicalZ, combinedLot, planCombinedDistrict } from "../packages/game-core/src/combinedDistrict";
import { lotCorners } from "../packages/game-core/src/angledDistrict";
import { createCityTactics } from "../packages/game-core/src/cityTactics";

test("curved coast projection is invertible, does not fold streets, and leaves civic and river anchors fixed",()=>{
  for(let x=-160;x<=160;x+=8) {
    let previous=-Infinity;
    for(let z=-160;z<=164;z+=4) {
      const p=combinedPosition({x,z},732,"ocean");
      assert.ok(p.z>previous); previous=p.z;
      assert.ok(Math.abs(combinedCanonicalZ(p,732,"ocean")-z)<1e-6);
      if(z<=60) assert.deepEqual(p,combinedPosition({x,z},732,"normal"));
    }
    assert.ok(Math.abs(combinedPosition({x,z:164},732,"ocean").z-shoreAt(coast,x))<1e-8);
  }
});
test("coastline validation rejects reversals and footprints crossing a narrow inlet",()=>{
  assert.throws(()=>validateWaterfront({...coast,shoreline:[{x:-160,z:164},{x:10,z:145},{x:0,z:150},{x:160,z:164}]}));
  const inlet={...OCEAN_CITY_WATERFRONT,shoreline:[{x:-160,z:164},{x:-5,z:164},{x:0,z:132},{x:5,z:164},{x:160,z:164}]};
  assert.equal(coastalFootprintOnLand([{x:-10,z:150},{x:10,z:150},{x:10,z:155},{x:-10,z:155}],inlet),false);
  const steep={...OCEAN_CITY_WATERFRONT,shoreline:[{x:-160,z:164},{x:80,z:164},{x:90,z:120},{x:110,z:164},{x:160,z:164}]};
  const result=portInfrastructure(steep,[{portZone:"cargo-quay",boundary:[{x:80,z:125},{x:120,z:125},{x:120,z:160},{x:80,z:160}]}],true);
  assert.equal(result.length,0);
});
test("fitted coastal city keeps buildings dry, curves its outer road and points separated berths into water",()=>{
  const plan=planCombinedDistrict(732,"ocean",true);
  assert.ok(plan.portInfrastructure.length>=2);
  const coastalLots=plan.lots.filter(l=>l.z>85);
  assert.ok(coastalLots.length>80);
  for(const lot of coastalLots)
    assert.ok(coastalFootprintOnLand(lotCorners(combinedLot(lot,732,"ocean")),coast, .9));
  assert.ok(new Set(plan.portInfrastructure.map(p=>p.angle.toFixed(2))).size>1);
  for(const p of plan.portInfrastructure) {
    assert.ok(Math.abs(p.z-shoreAt(coast,p.x))<1e-8);
    assert.ok(Math.abs(Math.sin(p.angle)+shoreSlope(coast,p.x)*Math.cos(p.angle))<1e-8);
    for(let v=3;v<=24;v+=1) for(const u of [-3.5,0,6,11.8]) {
      const x=p.x+u*Math.cos(p.angle)+v*Math.sin(p.angle),z=p.z-u*Math.sin(p.angle)+v*Math.cos(p.angle);
      assert.ok(z>shoreAt(coast,x));
    }
  }
  const tactics=createCityTactics(plan,732,"ocean");
  for(let x=-150;x<=150;x+=20) assert.equal(tactics.walkable({x,z:shoreAt(coast,x)+2}),false);
});
