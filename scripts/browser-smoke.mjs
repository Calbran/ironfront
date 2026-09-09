import { chromium } from "@playwright/test";
import fs from "node:fs";
import assert from "node:assert/strict";
const dir = ".impeccable/review";
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:3000");
await page.locator("canvas").waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
});
await page.screenshot({ path: dir + "/lobby-desktop.png", fullPage: true });
await page.getByRole("button", { name: "Begin campaign" }).click();
await page.getByRole("heading", { name: "Continental theater" }).waitFor();
await page.locator("canvas").waitFor();
const token = await page.evaluate(() =>
  localStorage.getItem("warfare-session"),
);
const response = await page.request.get("http://127.0.0.1:3000/api/world", {
  headers: { Authorization: "Bearer " + token },
});
const { world, owner } = await response.json();
const region = world.regions.find((r) => r.owner === owner && !r.building);
await page.getByRole("button", { name: "Command", exact: true }).click();
await page.getByLabel("Inspect region").selectOption(String(region.id));
await page.getByRole("button", { name: /Supply depot/ }).click();
await page.getByText("6h remaining").waitFor();
const target = world.regions.find((r) => r.owner === null);
await page.getByLabel("Inspect region").selectOption(String(target.id));
await page
  .getByRole("button", { name: "Advance to " + target.name, exact: true })
  .click();
await page.getByText("Advancing to " + target.name, { exact: true }).waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
});
await page.screenshot({ path: dir + "/desktop.png", fullPage: true });
const second = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const phone = await second.newPage();
phone.on("pageerror", (e) => errors.push(e.message));
await phone.goto("http://127.0.0.1:3000");
await phone.getByRole("button", { name: "Join friends", exact: true }).click();
await phone.getByLabel("Nation name").fill("Copper League");
await phone.getByLabel("Campaign invite code").fill(world.id);
await phone.getByRole("button", { name: "Join campaign", exact: true }).click();
await phone.locator(".campaign-view").waitFor();
await phone.locator("canvas").waitFor();
await phone.evaluate(() => window.scrollTo(0, 0));
await phone.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
});
await phone.screenshot({ path: dir + "/mobile.png", fullPage: true });
const overflow = await phone.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
assert.equal(errors.length, 0, "Browser page errors");
assert.equal(overflow, false, "Mobile horizontal overflow");
console.log(
  JSON.stringify({
    errors,
    overflow,
    code: world.id,
    desktop: await page.title(),
    mobile: await phone
      .getByRole("heading", { name: "Copper League", exact: true })
      .count(),
  }),
);
await browser.close();
