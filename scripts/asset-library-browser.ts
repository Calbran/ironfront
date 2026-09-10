import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const out = ".impeccable/review/asset-library";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404"))
      errors.push(m.text());
  });
  await page.goto(
    `${process.env.CITY_TEST_URL ?? "http://127.0.0.1:5173"}/city-diorama.html`,
  );
  await page.waitForFunction(() => !!window.__cityDiorama);
  const geometry = await page.evaluate(async () => {
    const kitPath = "/src/experiments/referenceAssets.ts",
      boundsPath =
        "/@fs/home/brutus/Documents/ChatGPT/Ironfront/packages/game-core/src/cityBuildingKit.ts";
    const kit = (await import(kitPath)).createMiniatureKit();
    const { cityBuildingEnvelope } = await import(boundsPath);
    const results = [];
    try {
      for (const [name, parts] of kit.variants) {
        if (["tree", "pine"].includes(name)) continue;
        const e = cityBuildingEnvelope(name);
        let full = 0,
          low = 0;
        for (const p of parts) {
          p.geometry.computeBoundingBox();
          const b = p.geometry.boundingBox;
          if (
            Math.max(Math.abs(b.min.x), Math.abs(b.max.x)) >
              e.width / 2 + 0.015 ||
            Math.max(Math.abs(b.min.z), Math.abs(b.max.z)) > e.depth / 2 + 0.015
          )
            throw new Error(`Envelope too small: ${name} ${JSON.stringify(b)}`);
          full += p.geometry.getAttribute("position").count;
        }
        for (const p of kit.distantVariants.get(name))
          low += p.geometry.getAttribute("position").count;
        if (low >= full) throw new Error(`No detail reduction: ${name}`);
        results.push({ name, full, low });
      }
    } finally {
      kit.dispose();
    }
    return results;
  });
  await writeFile(
    `${out}/asset-library.json`,
    JSON.stringify(geometry, null, 2),
  );
  console.log(JSON.stringify(geometry));
  await page.evaluate(async () => {
    const tp =
        "/@fs/home/brutus/Documents/ChatGPT/Ironfront/node_modules/three/build/three.module.js",
      kp = "/src/experiments/referenceAssets.ts";
    const T = await import(tp),
      kit = (await import(kp)).createMiniatureKit();
    window.__cityDiorama?.dispose();
    document.body.innerHTML = "";
    document.body.style.cssText =
      "margin:0;background:#263933;color:#eee;font:15px sans-serif";
    const names = [...kit.variants.keys()].filter((n) =>
      /commercialTower.+|urbanMansard|urbanGable|urbanArcade|urbanCopper|urbanBay|warehouseFoundry|warehouseEngine|workshopRowCanopy|^street/.test(
        n,
      ),
    );
    const r = new T.WebGLRenderer({ antialias: true }),
      w = 1440,
      h = 1800,
      cw = 288,
      ch = 360;
    r.setSize(w, h);
    r.setScissorTest(true);
    document.body.append(r.domElement);
    const light = new T.DirectionalLight(0xffead2, 3);
    light.position.set(-10, 20, 15);
    const scene = new T.Scene();
    scene.background = new T.Color("#263933");
    scene.add(light, new T.HemisphereLight(0xe4ecf5, 0x686342, 2));
    names.forEach((name, i) => {
      const group = new T.Group();
      for (const p of kit.variants.get(name))
        if (!p.snow) group.add(new T.Mesh(p.geometry, p.material));
      scene.add(group);
      const bounds = new T.Box3().setFromObject(group),
        size = bounds.getSize(new T.Vector3()),
        center = bounds.getCenter(new T.Vector3()),
        span = Math.max(size.y, size.x, size.z) * 0.85;
      const camera = new T.OrthographicCamera(
        (-span * cw) / ch,
        (span * cw) / ch,
        span,
        -span,
        0.1,
        500,
      );
      camera.position.copy(center).add(new T.Vector3(50, 35, 50));
      camera.lookAt(center);
      const x = (i % 5) * cw,
        y = Math.floor(i / 5) * ch;
      r.setViewport(x, h - y - ch, cw, ch);
      r.setScissor(x, h - y - ch, cw, ch);
      r.render(scene, camera);
      scene.remove(group);
      const label = document.createElement("div");
      label.textContent = name;
      label.style.cssText = `position:absolute;left:${x}px;top:${y + ch - 26}px;width:${cw}px;text-align:center`;
      document.body.append(label);
    });
  });
  await page.setViewportSize({ width: 1440, height: 1800 });
  await page.screenshot({ path: `${out}/catalog.png`, fullPage: true });
} finally {
  await browser.close();
}
