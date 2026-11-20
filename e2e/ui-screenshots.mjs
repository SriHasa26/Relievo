// Takes screenshots of every main screen at 1440 and 390 px width into docs/ui-screenshots/ (synthetic data only).
// Needs the app running against MOCK data:  MOCK_CHAT=true MOCK_AI=true MOCK_DB=true VITE_MOCK_CHAT=true npm run dev
// Run:  node e2e/ui-screenshots.mjs      (from the repo root)
import { chromium } from "@playwright/test";
import fs from "node:fs";

const OUT = "docs/ui-screenshots";
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function login(page, name) {
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await page.waitForURL((u) => !u.pathname.includes("login"));
}
async function snap(page, tag, w, name) {
  await page.waitForTimeout(700); // let counters / map tiles settle
  await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: true });
  console.log("shot", `${tag}-${name}`);
}

for (const [w, h, tag] of [[1440, 900, "1440"], [390, 844, "390"]]) {
  const ctx = async () => browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });

  // login
  let c = await ctx(), p = await c.newPage();
  await p.goto(`${BASE}/login`);
  await p.getByRole("heading", { name: "Demo role switcher" }).waitFor();
  await snap(p, tag, w, "01-login");
  await c.close();

  // citizen
  c = await ctx(); p = await c.newPage();
  await login(p, "Asha Rao");
  await p.getByText("SYNTHETIC DEMO DATA").waitFor();
  await snap(p, tag, w, "02-citizen-requests");
  await p.goto(`${BASE}/citizen/new`);
  await snap(p, tag, w, "03-citizen-new-request");
  await p.getByRole("button", { name: "Send request" }).click(); // shows the validation message
  await snap(p, tag, w, "04-citizen-validation");
  await p.goto(`${BASE}/citizen`);
  const mine = await p.locator('a[href^="/incidents/"]').first().getAttribute("href");
  if (mine) { await p.goto(`${BASE}${mine}`); await snap(p, tag, w, "05-citizen-incident"); }
  await c.close();

  // coordinator
  c = await ctx(); p = await c.newPage();
  await login(p, "Coordinator Priya");
  await p.getByRole("button", { name: /Everything/ }).click();
  await snap(p, tag, w, "06-coordinator-command-centre");
  const hrefs = await p.locator('a[href^="/incidents/"]').evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  const seen = new Set();
  for (const href of hrefs) {
    await p.goto(`${BASE}${href}`);
    await p.waitForTimeout(500);
    const feature =
      (await p.getByRole("button", { name: "Verify incident" }).count()) ? "07-coordinator-verify"
        : (await p.getByRole("button", { name: "Approve assignment" }).count()) ? "08-coordinator-matching"
          : (await p.getByLabel("Message").count()) ? "09-coordinator-incident-chat" : null;
    if (feature && !seen.has(feature)) { seen.add(feature); await snap(p, tag, w, feature); }
  }
  for (const [path, name] of [["/impact", "10-impact"], ["/resources", "11-resources"], ["/messages", "12-messages"]]) {
    await p.goto(`${BASE}${path}`);
    await snap(p, tag, w, name);
  }
  await p.goto(`${BASE}/coordinator`);
  await p.getByRole("switch", { name: "Large text" }).click();
  await snap(p, tag, w, "13-coordinator-large-text");
  await c.close();

  // volunteer
  c = await ctx(); p = await c.newPage();
  await login(p, "Sana Khan");
  await snap(p, tag, w, "14-volunteer-assignments");
  const v = await p.locator('a[href^="/incidents/"]').first().getAttribute("href").catch(() => null);
  if (v) { await p.goto(`${BASE}${v}`); await snap(p, tag, w, "15-volunteer-incident"); }
  await c.close();
}
await browser.close();
