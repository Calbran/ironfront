import { readFileSync } from "node:fs";
import { parentPort } from "node:worker_threads";
import { tsImport } from "tsx/esm/api";
const { createCountrySlice } = await tsImport(
  "../../../packages/game-core/src/countrySlice.ts",
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
parentPort.postMessage(createCountrySlice(sample));
