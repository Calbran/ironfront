import { writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";

// Run `npx vite build --config vite.public-preview.config.ts` first.
const output = resolve(".impeccable/review/city-public");
await access(resolve(output, "city-diorama.html"));
await access(resolve(output, "city-seeds.html"));
await writeFile(resolve(output, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=/city-diorama.html?seed=732&amp;case=citywide"><title>Ironfront city preview</title><a href="/city-diorama.html?seed=732&amp;case=citywide">Open the city preview</a></html>\n`);
console.log(output);
