// v3 feature tests. One browser context with several pages: each tab keeps its own login (sessionStorage) and mock chat
// travels between tabs of one browser through a BroadcastChannel.
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

let ctx: BrowserContext;

async function login(page: Page, name: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name }).click();
  await page.waitForURL((u) => !u.pathname.includes("login"));
}
const newPage = async () => ctx.newPage();

test.beforeAll(async ({ browser }) => {
  ctx = await browser.newContext({
    permissions: ["microphone", "geolocation"], geolocation: { latitude: 17.41, longitude: 78.48 },
  });
  // A scripted fake of the Web Speech API: says "water is rising help us" a moment after start().
  await ctx.addInitScript(() => {
    class FakeSR {
      lang = ""; continuous = false; interimResults = false;
      onresult: ((e: unknown) => void) | null = null; onerror: ((e: unknown) => void) | null = null; onend: (() => void) | null = null;
      timers: number[] = [];
      start() {
        this.timers.push(window.setTimeout(() => this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: "water is" } }] }), 300));
        this.timers.push(window.setTimeout(() => this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "water is rising help us" } }] }), 800));
      }
      stop() { this.timers.forEach(clearTimeout); window.setTimeout(() => this.onend?.(), 30); }
      abort() { this.stop(); }
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeSR;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeSR;
  });
});
test.afterAll(async () => { await ctx?.close(); });

test("SOS: Critical incident reaches the coordinator within ~10 s, audio is attached and plays", async () => {
  const coord = await newPage();
  await login(coord, /^Coordinator Priya/);
  const citizen = await newPage();
  await login(citizen, /^Asha Rao/);

  await citizen.getByTestId("sos-button").first().click();
  await expect(citizen.getByTestId("sos-screen")).toBeVisible();
  await expect(citizen.getByText("We are alerting responders").first()).toBeVisible();
  await expect(citizen.getByTestId("sos-screen").getByText(/112 in India/)).toBeVisible();
  await expect(citizen.getByTestId("sos-transcript")).toContainText("water is rising help us", { timeout: 15_000 });

  // the coordinator gets the red popup for the SOS itself (poll is every 5 s)
  await expect(coord.getByRole("alertdialog")).toContainText("EMERGENCY SOS", { timeout: 12_000 });
  await coord.getByRole("alertdialog").getByRole("button", { name: "Dismiss", exact: true }).click();

  await citizen.getByRole("button", { name: "Stop recording" }).click();
  await expect(citizen.getByText("Responders have your message.")).toBeVisible({ timeout: 20_000 });

  // a second alert says the audio is available, with a player that does not autoplay
  const dialog = coord.getByRole("alertdialog");
  await expect(dialog).toContainText("audio available", { timeout: 12_000 });
  await expect(dialog).toContainText("water is rising help us");
  await dialog.getByRole("button", { name: "Play SOS audio" }).click();
  const audio = dialog.locator("audio");
  await expect(audio).toBeVisible();
  expect(await audio.evaluate((a: HTMLAudioElement) => a.paused)).toBe(true); // never autoplays
  expect(await audio.evaluate((a: HTMLAudioElement) => a.src.startsWith("blob:"))).toBe(true);
  await dialog.getByRole("button", { name: "Dismiss", exact: true }).click();

  // one active SOS per citizen: a second tap resumes the same one
  await citizen.getByRole("button", { name: "Close SOS screen" }).click();
  await citizen.getByTestId("sos-button").first().click();
  await expect(citizen.getByText(/already have an active SOS/)).toBeVisible();
  await citizen.getByRole("button", { name: "I am safe / cancel SOS" }).first().click();
  await expect(citizen.getByText("Marked safe.")).toBeVisible();
  await coord.close(); await citizen.close();
});
