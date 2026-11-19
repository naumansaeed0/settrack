import lighthouse from "lighthouse";
import { existsSync } from "node:fs";
import { launch } from "chrome-launcher";
import { mkdir, writeFile } from "node:fs/promises";
const chrome = await launch({
  chromePath:
    process.env.SETTRACK_CHROME || (existsSync("/tmp/settrack-browsers/chromium-1187/chrome-linux/chrome") ? "/tmp/settrack-browsers/chromium-1187/chrome-linux/chrome" : undefined),
  chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
});
try {
  const result = await lighthouse(
    process.argv[2] || "http://127.0.0.1:4173/settrack/",
    {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility"],
      formFactor: "mobile",
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        disabled: false,
      },
    },
  );
  await mkdir(".notes", { recursive: true });
  await writeFile(".notes/lighthouse-mobile.json", result.report);
  const summary = {
    performance: Math.round(result.lhr.categories.performance.score * 100),
    accessibility: Math.round(result.lhr.categories.accessibility.score * 100),
    lcpMs: result.lhr.audits["largest-contentful-paint"].numericValue,
    cls: result.lhr.audits["cumulative-layout-shift"].numericValue,
  };
  console.log(JSON.stringify(summary, null, 2));
  await writeFile(
    ".notes/lighthouse-summary.json",
    JSON.stringify(summary, null, 2),
  );
  if (summary.performance < 90 || summary.accessibility < 90)
    process.exitCode = 1;
} finally {
  await chrome.kill();
}
