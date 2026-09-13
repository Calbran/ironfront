import { readFileSync } from "node:fs";
import { parentPort, workerData } from "node:worker_threads";
import { tsImport } from "tsx/esm/api";
const { createCountrySlice } = await tsImport(
  "../../../packages/game-core/src/countrySlice.ts",
  import.meta.url,
);
const { createCampaignPlan } = await tsImport(
  "../../../packages/game-core/src/campaignBattlefield.ts",
  import.meta.url,
);
const { parseOSMSample } = await tsImport(
  "../../../packages/game-core/src/countryOSM.ts",
  import.meta.url,
);
const sample = parseOSMSample(
  JSON.parse(
    readFileSync(
      new URL(
        "../../web/public/data/country-osm/painswick.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
);
const base = createCountrySlice(sample);
if (workerData?.version === 2 || workerData?.version === 3) {
  const { createMassiveCampaignPlan } = await tsImport(
    "../../../packages/game-core/src/massiveCampaign.ts",
    import.meta.url,
  );
  parentPort.postMessage(createMassiveCampaignPlan(base, workerData.version));
} else parentPort.postMessage(createCampaignPlan(base));
