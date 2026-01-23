import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import fs from "fs";

const BASE_URL = process.env.AUDIT_URL || "https://www.rescuedogs.me";

const URLS_TO_AUDIT = [
  `${BASE_URL}/breeds`,
  `${BASE_URL}/breeds/labrador-retriever`,
  `${BASE_URL}/breeds/mixed`,
];

const MOBILE_CONFIG = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "mobile",
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      disabled: false,
    },
    emulatedUserAgent:
      "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36",
  },
};

const DESKTOP_CONFIG = {
  extends: "lighthouse:default",
  settings: {
    formFactor: "desktop",
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
    emulatedUserAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
  },
};

async function runAudit(url, device = "mobile") {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  const config = device === "mobile" ? MOBILE_CONFIG : DESKTOP_CONFIG;

  const options = {
    logLevel: "error",
    output: "json",
    port: chrome.port,
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  };

  const runnerResult = await lighthouse(url, options, config);
  await chrome.kill();

  const lhr = runnerResult.lhr;

  return {
    url,
    device,
    scores: {
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(lhr.categories["best-practices"].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100),
    },
    metrics: {
      LCP: Math.round(lhr.audits["largest-contentful-paint"].numericValue),
      FCP: Math.round(lhr.audits["first-contentful-paint"].numericValue),
      CLS: lhr.audits["cumulative-layout-shift"].numericValue.toFixed(3),
      TBT: Math.round(lhr.audits["total-blocking-time"].numericValue),
      SI: Math.round(lhr.audits["speed-index"].numericValue),
    },
  };
}

function formatResults(results) {
  console.log("\n" + "=".repeat(80));
  console.log("LIGHTHOUSE AUDIT RESULTS");
  console.log("=".repeat(80));

  for (const result of results) {
    console.log(`\n📍 ${result.url} (${result.device})`);
    console.log("-".repeat(60));
    console.log(
      `Performance: ${result.scores.performance} | Accessibility: ${result.scores.accessibility} | Best Practices: ${result.scores.bestPractices} | SEO: ${result.scores.seo}`
    );
    console.log(
      `LCP: ${result.metrics.LCP}ms | FCP: ${result.metrics.FCP}ms | CLS: ${result.metrics.CLS} | TBT: ${result.metrics.TBT}ms | SI: ${result.metrics.SI}ms`
    );
  }

  console.log("\n" + "=".repeat(80));
}

async function auditAllPages() {
  const results = [];

  for (const url of URLS_TO_AUDIT) {
    for (const device of ["mobile", "desktop"]) {
      console.log(`Auditing ${url} (${device})...`);
      try {
        const result = await runAudit(url, device);
        results.push(result);
        console.log(`  ✅ Performance: ${result.scores.performance}, LCP: ${result.metrics.LCP}ms`);
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`);
      }
    }
  }

  formatResults(results);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
  const filename = `lighthouse-breeds-${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${filename}`);

  return results;
}

auditAllPages().catch(console.error);
