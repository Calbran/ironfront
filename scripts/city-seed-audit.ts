import { writeFileSync } from "node:fs";
import {
  auditCitySeed,
  seedCases,
} from "../packages/game-core/src/citySeedAudit";
const results = seedCases.flatMap((mode) =>
  Array.from({ length: 12 }, (_, i) => auditCitySeed(731 + i, mode)),
);
const report = {
  description: `${results.length} city study cases; geometry checks do not replace visual review. Timings are local measurements.`,
  results,
};
if (process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      cases: results.length,
      flagged: results.filter((r) => r.failures.length),
    },
    null,
    2,
  ),
);
