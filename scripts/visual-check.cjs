#!/usr/bin/env node
// Screenshot pages at the four widths the UX refresh is checked at, in light
// and dark, and report horizontal overflow and console errors.
//
//   node scripts/visual-check.cjs / /dogs /swipe
//   BASE_URL=http://localhost:3000 OUT_DIR=/tmp/visual node scripts/visual-check.cjs /dogs
//
// Exits 1 when any page overflows horizontally or logs a console error.
// Playwright is loaded from frontend/node_modules. In cloud sessions the
// preinstalled Chromium under /opt/pw-browsers is used; set CHROMIUM_PATH to
// point elsewhere. On a laptop Playwright's own browser is used.

const fs = require("fs");
const path = require("path");

const { chromium } = require(
  require.resolve("playwright", { paths: [path.join(__dirname, "..", "frontend")] }),
);

const WIDTHS = [390, 820, 1180, 1440];
const SCHEMES = ["light", "dark"];
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT_DIR = process.env.OUT_DIR || "/tmp/visual-check";

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = "/opt/pw-browsers";
  if (!fs.existsSync(root)) return undefined;
  for (const dir of fs.readdirSync(root).filter((d) => d.startsWith("chromium")).sort().reverse()) {
    for (const rel of ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome"]) {
      const candidate = path.join(root, dir, rel);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
  }
  return undefined;
}

async function main() {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error("usage: node scripts/visual-check.cjs <path> [<path> ...]");
    process.exit(2);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ executablePath: findChromium() });
  const problems = [];

  for (const pagePath of paths) {
    for (const scheme of SCHEMES) {
      for (const width of WIDTHS) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: scheme,
        });
        const page = await context.newPage();
        const errors = [];
        page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
        page.on("pageerror", (err) => errors.push(err.message));

        const response = await page.goto(BASE_URL + pagePath, { waitUntil: "networkidle" });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        const name = `${pagePath.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home"}-${width}-${scheme}.png`;
        await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: true });

        const status = response ? response.status() : "no response";
        const flags = [];
        if (overflow > 0) flags.push(`overflow ${overflow}px`);
        if (errors.length) flags.push(`${errors.length} console error(s)`);
        console.log(`${flags.length ? "FAIL" : "ok  "} ${pagePath} ${width}px ${scheme} [${status}] ${flags.join(", ")}`);
        for (const e of errors) console.log(`       ${e.slice(0, 300)}`);
        if (flags.length) problems.push(`${pagePath} ${width}px ${scheme}`);

        await context.close();
      }
    }
  }

  await browser.close();
  console.log(`\nScreenshots in ${OUT_DIR}`);
  if (problems.length) {
    console.log(`${problems.length} view(s) with problems`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
