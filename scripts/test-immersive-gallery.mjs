/** Browser regression on a loopback Worker and a disposable local D1. */
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

// Generated 32×32 silent VP8 clip. The browser decodes it as video.
const clip = Buffer.from("GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAQIEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggEeTbuMU6uEHFO7a1OsggPy7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjAuMTYuMTAwV0GNTGF2ZjYwLjE2LjEwMESJiEDHcAAAAAAAFlSua8GuAQAAAAAAADjXgQFzxYh31APsIZ3oM5yBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhB3NZQDgibCBILqBIJqBAhJUw2f8c3OgY8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2MC4xNi4xMDBzc9ZjwItjxYh31APsIZ3oM2fIoUWjh0VOQ09ERVJEh5RMYXZjNjAuMzEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MTIuMDAwMDAwMDAwAB9DtnVBD+eBAKOkgQAAgDACAJ0BKiAAIAAARwiFhYiFhIgCAgAHkPPJwP7/q1CAo5WBAfQAsQEABRCsABgAGFgv9AAIcACjlYED6ACxAQAFEKwAGAAYWC/0AAhwAKOVgQXcALEBAAUQrAAYABhYL/QACHAAo5WBB9AAsQEABRCsABgAGFgv9AAIcACjlYEJxACxAQAFEKwAGAAYWC/0AAhwAKOVgQu4ALEBAAUQrAAYABhYL/QACHAAo5WBDawAsQEABRAQFGAAYWC/0AAhwACjlYEPoACxAQAFEKwAGAAYWC/0AAhwAKOVgRGUALEBAAUQrAAYABhYL/QACHAAo5WBE4gAsQEABRCsABgAGFgv9AAIcAAfQ7Z1QQHnghV8o5WBAAAAsQEABRCsABgAGFgv9AAIcACjlYEB9ACxAQAFEKwAGAAYWC/0AAhwAKOVgQPoALEBAAUQrAAYABhYL/QACHAAo5WBBdwAsQEABRCsABgAGFgv9AAIcACjlYEH0ACxAQAFEKwAGAAYWC/0AAhwAKOVgQnEALEBAAUQrAAYABhYL/QACHAAo5WBC7gAsQEABRCsABgAGFgv9AAIcACjlYENrACxAQAFEBAUYABhYL/QACHAAKOVgQ+gALEBAAUQrAAYABhYL/QACHAAo5WBEZQAsQEABRCsABgAGFgv9AAIcACjlYETiACxAQAFEKwAGAAYWC/0AAhwAB9DtnWy54Iq+KOVgQAAALEBAAUQrAAYABhYL/QACHAAo5WBAfQAsQEABRCsABgAGFgv9AAIcAAcU7trkbuPs4EAt4r3gQHxggGf8IED", "base64");
const origin = "http://localhost:8796";
const fixture = "https://ik.imagekit.io/gallery-qa/";
const temp = mkdtempSync(".qa-gallery-");
const config = `${temp}/wrangler.json`;
const wrangler = "node_modules/.bin/wrangler";
const args = ["--local", "--config", config, "--persist-to", `${temp}/d1`];

let worker;
let browser;
try {
  writeFileSync(config, JSON.stringify({
    name: "prz-gallery-local-qa", main: "../.open-next/worker.js",
    compatibility_date: "2025-04-01", compatibility_flags: ["nodejs_compat"],
    assets: { directory: "../.open-next/assets", binding: "ASSETS" },
    vars: { DISABLE_EXTERNAL_BOOKING_EFFECTS: "true", EDITORIAL_TRANSLATION_WORKERS_AI: "false" },
    d1_databases: [{ binding: "DB", database_name: "gallery-qa", database_id: "00000000-0000-4000-8000-000000000020", migrations_dir: "../migrations" }],
  }));
  execFileSync(wrangler, ["d1", "migrations", "apply", "DB", ...args], { stdio: "ignore" });
  execFileSync(wrangler, ["d1", "execute", "DB", ...args, "--command",
    `INSERT INTO gallery_images (url, alt, is_published) VALUES
      ('${fixture}portrait.svg', 'Vertical QA', 1), ('${fixture}landscape.svg', 'Horizontal QA', 1),
      ('${fixture}hidden.svg', 'Oculta QA', 0);
     INSERT INTO gallery_videos (url, poster, title, is_published) VALUES
      ('${fixture}clip.webm', '${fixture}landscape.svg', 'Vídeo QA', 1),
      ('${fixture}hidden.webm', NULL, 'Oculto QA', 0);`], { stdio: "ignore" });
  worker = spawn(wrangler, ["dev", ...args, "--port", "8796"], { stdio: "ignore" });
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await fetch(origin + "/es/gallery").catch(() => null))?.ok) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert((await fetch(origin + "/es/gallery")).ok, "Isolated Worker did not start");
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  async function fixturePage(options) {
    const page = await browser.newPage(options);
    const seen = { videoRequests: 0 };
    await page.route("https://ik.imagekit.io/gallery-qa/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith(".webm")) {
        seen.videoRequests += 1;
        if (seen.videoRequests === 1) return route.abort();
        return route.fulfill({ body: clip, contentType: "video/webm" });
      }
      const [width, height] = url.pathname.endsWith("portrait.svg") ? [120, 240] : [240, 120];
      return route.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="teal"/></svg>` });
    });
    return { page, seen };
  }

  const { page, seen } = await fixturePage({ viewport: { width: 1200, height: 750 }, reducedMotion: "no-preference" });
  await page.goto(origin + "/es/gallery");
  await page.clock.install();
  const opener = page.getByRole("button", { name: "Vertical QA", exact: true });
  assert.equal(await page.getByRole("button", { name: /Ocult[ao] QA/ }).count(), 0);
  await opener.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Galería multimedia" });
  await dialog.waitFor();
  const close = dialog.getByRole("button", { name: /Cerrar/ });
  assert(await close.evaluate((element) => document.activeElement === element));
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), "hidden");
  const position = async (index) => dialog.getByText(`${index} / 3`, { exact: true }).waitFor();
  async function imageFits(label, ratio) {
    const img = dialog.getByRole("img", { name: label, exact: true });
    await img.waitFor();
    await page.waitForFunction((alt) => [...document.querySelectorAll("dialog img")].some((i) => i.alt === alt && i.naturalHeight > 0), label);
    const size = await img.evaluate((i) => ({
      ratio: i.naturalWidth / i.naturalHeight, fit: getComputedStyle(i).objectFit,
      inside: i.getBoundingClientRect().bottom <= innerHeight,
    }));
    assert.deepEqual(size, { ratio, fit: "contain", inside: true });
  }
  await position(1);
  await imageFits("Vertical QA", 0.5);
  await page.clock.runFor(5100);
  await position(2);
  await imageFits("Horizontal QA", 2);
  await dialog.getByRole("button", { name: "Pausar carrusel" }).click();
  await page.clock.runFor(6000);
  await position(2);
  await dialog.getByRole("button", { name: "Reanudar carrusel" }).click();
  await page.clock.runFor(5100);
  await position(3);
  assert.equal(seen.videoRequests, 0, "Opening video must only load its poster");
  const play = dialog.getByRole("button", { name: "Reproducir Vídeo QA" });
  await play.click();
  await dialog.getByRole("alert").waitFor();
  await dialog.getByRole("button", { name: "Reintentar" }).click();
  await play.click();
  await page.waitForFunction(() => {
    const video = document.querySelector("dialog video");
    return video && !video.paused && video.currentTime > 0;
  });
  const media = await dialog.locator("video").elementHandle();
  assert(await media.evaluate((video) => video.playsInline && video.controls));
  await page.clock.runFor(6000);
  await position(3);
  await dialog.getByRole("button", { name: "Anterior" }).click();
  await position(2);
  assert(await media.evaluate((video) => video.paused && !video.isConnected));
  await page.keyboard.press("ArrowLeft");
  await position(1);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert(await opener.evaluate((element) => document.activeElement === element));
  assert.equal(await page.evaluate(() => window.scrollY), scroll);
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), "");

  const { page: mobile, seen: mobileSeen } = await fixturePage({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce",
  });
  await mobile.goto(origin + "/en/gallery");
  await mobile.clock.install();
  await mobile.getByRole("button", { name: "View photo", exact: true }).first().tap();
  const mobileDialog = mobile.getByRole("dialog", { name: "Media gallery" });
  await mobileDialog.getByText("1 / 3", { exact: true }).waitFor();
  await mobile.clock.runFor(6000);
  assert(await mobileDialog.getByText("1 / 3", { exact: true }).isVisible());
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 310, y: 380 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 180, y: 380 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 80, y: 380 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await mobileDialog.getByText("2 / 3", { exact: true }).waitFor();
  await mobileDialog.getByRole("button", { name: "Next" }).tap();
  await mobileDialog.getByRole("button", { name: "Play video" }).waitFor();
  assert.equal(mobileSeen.videoRequests, 0);
  await mobileDialog.getByRole("button", { name: /Close/ }).tap();
  await mobileDialog.waitFor({ state: "hidden" });
  await mobile.goto(origin + "/en");
  assert(await mobile.getByRole("button", { name: "Play video" }).isVisible(), "Home player must remain available");
  assert.equal(mobileSeen.videoRequests, 0);
  console.log("PASS: ES/EN, mixed published media, portrait/landscape, focus/scroll, keyboard/touch, autoplay, reduced motion, lazy video, retry, playback and cleanup");
} finally {
  await browser?.close();
  if (worker) {
    worker.kill();
    await new Promise((resolve) => {
      if (worker.exitCode !== null || worker.signalCode !== null) resolve();
      else worker.once("exit", resolve);
    });
  }
  rmSync(temp, { recursive: true, force: true });
}
