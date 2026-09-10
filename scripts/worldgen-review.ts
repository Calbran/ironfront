import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { generateContinent } from "../packages/game-core/src/geography.ts";
const seeds = [
  "Meridian",
  "Boreal",
  "Ironfront",
  "Florida",
  "Bosporus",
  "Andes",
];
const maps = seeds.map((seed) => ({ seed, ...generateContinent(seed, 4) }));
mkdirSync(".impeccable/review", { recursive: true });
writeFileSync(".impeccable/review/worldgen-samples.json", JSON.stringify(maps));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    '<body style="margin:0;background:#18363e"><canvas width="1500" height="1000"></canvas></body>',
  );
  await page.evaluate("window.__name = (value) => value");
  await page.evaluate((maps) => {
    const ctx = document.querySelector("canvas")!.getContext("2d")!;
    maps.forEach((m, index) => {
      const x = (index % 3) * 500,
        y = Math.floor(index / 3) * 500;
      ctx.save();
      ctx.translate(x + 15, y + 50);
      ctx.scale(470 / m.geography.width, 410 / m.geography.height);
      const fill = (rings: number[][][], color: string, border = false) => {
        ctx.beginPath();
        for (const ring of rings) {
          ctx.moveTo(ring[0][0], ring[0][1]);
          for (const p of ring.slice(1)) ctx.lineTo(p[0], p[1]);
          ctx.closePath();
        }
        ctx.fillStyle = color;
        ctx.fill("evenodd");
        if (border) {
          ctx.strokeStyle = "#65796d";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      };
      fill(m.geography.islands, "#788b7b");
      for (const r of m.regions)
        fill(
          r.contours,
          {
            plains: "#c9ceb0",
            forest: "#91ad91",
            highlands: "#b8b29b",
            mountains: "#e0e3df",
          }[r.terrain],
          true,
        );
      ctx.restore();
      ctx.fillStyle = "#eeeade";
      ctx.font = "20px sans-serif";
      ctx.fillText(m.seed, x + 20, y + 28);
      ctx.font = "12px sans-serif";
      ctx.fillText(
        `${m.geography.sources?.join(" + ")} · ${m.regions.filter((r) => r.terrain === "mountains").length} mountains`,
        x + 20,
        y + 482,
      );
    });
  }, maps);
  await page.screenshot({ path: ".impeccable/review/worldgen-gallery.png" });
} finally {
  await browser.close();
}
console.log(
  maps.map((m) => ({
    seed: m.seed,
    sources: m.geography.sources,
    mountains: m.regions.filter((r) => r.terrain === "mountains").length,
    islands: m.geography.islands.length,
    area: m.regions.reduce((n, r) => n + r.area, 0),
  })),
);
