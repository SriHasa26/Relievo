import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const theme of ["dark", "light"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((t) => { try { localStorage.setItem("rr-theme", t); } catch {} }, theme);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await p.goto("http://localhost:5173/login");
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `e2e/screenshots/l-${theme}-hero.png` });
  await p.locator("#capabilities").scrollIntoViewIfNeeded(); await p.waitForTimeout(1200);
  await p.screenshot({ path: `e2e/screenshots/l-${theme}-cap.png` });
  const top = await p.locator("#workflow").evaluate((e) => e.getBoundingClientRect().top + scrollY);
  for (const k of [0.1, 0.5, 0.85]) {
    await p.evaluate(([t, k]) => scrollTo(0, t + k * (document.querySelector("#workflow").offsetHeight - innerHeight)), [top, k]);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `e2e/screenshots/l-${theme}-wf${k}.png` });
  }
  await ctx.close();
}
await b.close();
