#!/usr/bin/env node
/**
 * ✅ Automated A11y Testing with axe-core
 * Run with: npm run a11y-test
 *
 * Tests WCAG 2.1 Level AA compliance on common pages
 * Generates JSON report in build/a11y-report.json
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Pages to test (must be built first)
const PAGES_TO_TEST = [
  "/",
  "/dashboard",
  "/pricing",
];

const PORT = 3000;
const REPORT_PATH = path.join(process.cwd(), "build", "a11y-report.json");

// Ensure axe-core is installed
try {
  require.resolve("@axe-core/playwright");
} catch {
  console.error("❌ @axe-core/playwright not installed. Run: npm install --save-dev @axe-core/playwright");
  process.exit(1);
}

async function runA11yTests() {
  const { chromium } = require("playwright");
  const { injectAxe, checkA11y } = require("@axe-core/playwright");

  const browser = await chromium.launch();
  const results = [];

  console.log("🔍 Running automated A11y tests...\n");

  for (const page of PAGES_TO_TEST) {
    try {
      const ctx = await browser.newContext();
      const pageCtx = await ctx.newPage();

      const url = `http://localhost:${PORT}${page}`;
      console.log(`📄 Testing: ${url}`);

      await pageCtx.goto(url, { waitUntil: "networkidle" });
      await injectAxe(pageCtx);

      const violations = await pageCtx.evaluate(() => {
        return new Promise((resolve) => {
          // @ts-ignore axe injected globally
          window.axe.run({ runOnly: { type: "tag", values: ["wcag21aa"] } }, (results) => {
            resolve(results.violations);
          });
        });
      });

      const passed = await pageCtx.evaluate(() => {
        return new Promise((resolve) => {
          // @ts-ignore
          window.axe.run({ runOnly: { type: "tag", values: ["wcag21aa"] } }, (results) => {
            resolve(results.passes.length);
          });
        });
      });

      results.push({
        page,
        url,
        violations: violations.length,
        passed,
        details: violations.slice(0, 5), // First 5 for preview
      });

      console.log(`   ✅ ${passed} checks passed`);
      console.log(`   ❌ ${violations.length} violations found\n`);

      await ctx.close();
    } catch (err) {
      console.error(`   ⚠️  Error testing ${page}:`, err.message);
    }
  }

  await browser.close();

  // Generate report
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));

  // Summary
  const totalViolations = results.reduce((sum, r) => sum + r.violations, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);

  console.log("📊 Summary:");
  console.log(`   Total violations: ${totalViolations}`);
  console.log(`   Total checks passed: ${totalPassed}`);
  console.log(`   Report saved: ${REPORT_PATH}\n`);

  if (totalViolations > 0) {
    console.warn("⚠️  A11y violations detected. Review report for details.");
    process.exit(1);
  } else {
    console.log("✅ All A11y tests passed!");
  }
}

// Check if server is running
try {
  execSync(`curl http://localhost:${PORT}`, { stdio: "ignore" });
} catch {
  console.error(`❌ Dev server not running on port ${PORT}. Start with: npm run dev`);
  process.exit(1);
}

runA11yTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
