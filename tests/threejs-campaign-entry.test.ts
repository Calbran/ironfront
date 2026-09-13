import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("Three.js is the production campaign renderer and Pixi is legacy-only", () => {
  const main = read("apps/web/src/main.tsx"),
    alpha = read("apps/web/src/BattlefieldApp.tsx"),
    shared = read("apps/web/src/experiments/countrySliceScene.ts");
  assert.match(main, /import\(['"]\.\/BattlefieldApp['"]\)/);
  assert.match(alpha, /countrySliceScene\(/);
  assert.match(alpha, /CAMPAIGN_ROSTER/);
  assert.match(shared, /createTacticalPresentation\(/);
  assert.match(shared, /terrainHatchScale/);
  assert.match(shared, /if \(plan\.campaignMap\)/);
  assert.match(shared, /terrainInkDistance\.value = T\.MathUtils\.smoothstep/);
  assert.match(shared, /Math\.log2\(cameraDistance \/ 650\)/);
  assert.match(shared, /mountainWeight/);
  assert.match(shared, /mountainSurface/);
  assert.match(shared, /terrainPeak/);
  assert.match(shared, /campaignOverviewMasses/);
  assert.match(shared, /campaignSiteOverview/);
  assert.match(shared, /!wanted && !batchedSites/);
  assert.match(shared, /overviewStep = plan\.campaignMap \? 2 : 4/);
  assert.match(shared, /strategicPixelRatio/);
  assert.match(shared, /target\.closest\("\.slice-site-label"\)/);
  assert.match(shared, /tacticalGestures\.zoom\(event\)/);
  assert.doesNotMatch(
    alpha,
    /api\/country-slice|startEncounter|restage|Fight locally/,
  );
  const index = read("apps/web/index.html");
  const legacy = read("apps/web/legacy.html");
  const app = read("apps/web/src/App.tsx");
  const campaignMap = read("apps/web/src/CampaignMap.tsx");

  assert.match(index, /src="\/src\/main\.tsx"/);
  assert.match(legacy, /data-renderer="pixi"/);
  assert.match(app, /from "\.\/CampaignMap"/);
  assert.doesNotMatch(app, /LiveCampaignMap/);
  assert.match(campaignMap, /return <ThreeCampaign \{\.\.\.props\} \/>/);
  assert.match(campaignMap, /if \(props\.archivedPixi\)/);
  assert.doesNotMatch(campaignMap, /renderer=three|renderer-choice/);
  assert.doesNotMatch(app, /country-slice\/campaign|Fight locally/);
});
