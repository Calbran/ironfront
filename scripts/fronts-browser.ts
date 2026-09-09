import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const base = process.env.FRONT_TEST_URL || "http://127.0.0.1:3000";
const dir = ".impeccable/review";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
const errors: string[] = [];
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await desktop.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByLabel("Campaign pace").selectOption("normal");
  await page.getByRole("button", { name: "Begin campaign" }).click();
  await page.getByRole("heading", { name: "Continental theater" }).waitFor();
  const token = await page.evaluate(() =>
    localStorage.getItem("warfare-session"),
  );
  const headers = { Authorization: "Bearer " + token };
  const getWorld = async () =>
    (await (await page.request.get(base + "/api/world", { headers })).json())
      .world;
  let world = await getWorld();
  const own = world.armies.filter((a: any) => a.owner === 0);
  assert.equal(own.length, 3);
  await page.getByRole("button", { name: "Command", exact: true }).click();
  await page.getByLabel("Command army").selectOption(String(own[0].id));
  const neighbor = world.regions[own[0].region].neighbors.find(
    (id: number) => world.regions[id].owner === 0,
  );
  await page.getByText("Defensive sector", { exact: true }).click();
  await page
    .getByRole("checkbox", { name: world.regions[neighbor].name, exact: true })
    .check();
  await page.getByRole("button", { name: "Deploy to sector" }).click();
  await page
    .getByText("Sector deployment: 4h remaining", { exact: true })
    .waitFor();
  await page.getByText("Fallback and support", { exact: true }).click();
  await page.getByLabel("Risk tolerance").selectOption("cautious");
  await page.getByLabel("Fallback position").selectOption(String(neighbor));
  await page.getByRole("button", { name: "Reserve", exact: true }).click();
  await page.getByText("Reserve watching sector", { exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Command", exact: true }).click();
  await page.getByText("Reserve watching sector", { exact: true }).waitFor();
  world = await getWorld();
  assert.equal(
    world.armies.find((a: any) => a.id === own[0].id).risk,
    "cautious",
  );
  assert.deepEqual(world.armies.find((a: any) => a.id === own[0].id).sector, [
    own[0].region,
    neighbor,
  ]);
  await page.getByLabel("Command army").selectOption(String(own[2].id));
  await page.getByLabel("Inspect region").selectOption(String(own[0].region));
  await page
    .getByRole("button", {
      name: "Redeploy to " + world.regions[own[0].region].name,
      exact: true,
    })
    .click();
  await page
    .getByText("Redeploying to " + world.regions[own[0].region].name, {
      exact: true,
    })
    .waitFor();
  const assault = own[1];
  await page.getByLabel("Command army").selectOption(String(assault.id));
  const visited = new Set<number>([assault.region]),
    queue: number[] = [assault.region];
  let objective: number | undefined;
  while (queue.length && objective === undefined) {
    for (const id of world.regions[queue.shift()!].neighbors) {
      if (visited.has(id) || world.regions[id].terrain === "mountains")
        continue;
      visited.add(id);
      if (world.regions[id].owner === null) {
        objective = id;
        break;
      }
      if (world.regions[id].owner === 0) queue.push(id);
    }
  }
  assert.notEqual(objective, undefined);
  await page.getByLabel("Inspect region").selectOption(String(objective));
  await page
    .getByRole("button", {
      name: "Advance to " + world.regions[objective!].name,
      exact: true,
    })
    .click();
  await page
    .getByText("Advancing to " + world.regions[objective!].name, {
      exact: true,
    })
    .waitFor();
  const mountain = world.regions.find((r: any) => r.terrain === "mountains");
  await page.getByLabel("Inspect region").selectOption(String(mountain.id));
  assert(
    await page
      .getByRole("button", { name: "Advance to " + mountain.name, exact: true })
      .isDisabled(),
  );
  await page.getByLabel("Inspect region").selectOption(String(objective));
  await page.getByLabel("Command army").scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.screenshot({ path: dir + "/fronts-desktop.png", fullPage: true });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(base);
  await phone.evaluate(
    (t) => localStorage.setItem("warfare-session", t!),
    token,
  );
  await phone.reload();
  await phone.getByRole("button", { name: "Command", exact: true }).click();
  await phone.getByLabel("Command army").selectOption(String(own[0].id));
  await phone.getByText("Reserve watching sector", { exact: true }).waitFor();
  await phone.getByRole("button", { name: "Hold", exact: true }).click();
  await phone.getByText("Holding sector", { exact: true }).first().waitFor();
  await phone.getByLabel("Command army").scrollIntoViewIfNeeded();
  await phone.evaluate(async () => {
    await document.fonts.ready;
  });
  await phone.screenshot({ path: dir + "/fronts-mobile.png", fullPage: true });
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(await phone.locator(".army-section .region-facts").evaluate(el => el.scrollWidth > el.clientWidth), false, "Army status must fit the phone panel");
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      verified: [
        "three armies",
        "sector deployment",
        "risk and fallback",
        "reserve",
        "reload",
        "friendly redeployment",
        "offensive preview",
        "mountain blocked",
        "mobile hold",
      ],
      pageErrors: errors,
    }),
  );
} finally {
  await browser.close();
}
