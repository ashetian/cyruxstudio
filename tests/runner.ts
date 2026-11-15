#!/usr/bin/env node
/**
 * cyrux studio - Autonomous Master E2E Test Runner
 *
 * Usage:
 *   npx tsx tests/runner.ts
 *   npx tsx tests/runner.ts --tier 1
 *   npx tsx tests/runner.ts --tier 2
 *   npx tsx tests/runner.ts --tier 3
 *   npx tsx tests/runner.ts --tier 4
 *   npx tsx tests/runner.ts --filter "whatsapp"
 */

import { executeSuites, RunnerOptions, RunnerSummary } from './framework.ts';

// -------------------------------------------------------------
// 1. Import All Test Suites Across Tiers 1-4
// -------------------------------------------------------------

// Tier 1: Feature Coverage (Features 1 to 21)
import './tier1-feature/f01-app-skeleton.ts';
import './tier1-feature/f02-database-schema.ts';
import './tier1-feature/f03-seed-assets.ts';
import './tier1-feature/f04-hero-search.ts';
import './tier1-feature/f05-floating-nav.ts';
import './tier1-feature/f06-bestseller-grid.ts';
import './tier1-feature/f07-brutalist-cta.ts';
import './tier1-feature/f08-campaign-block.ts';
import './tier1-feature/f09-smooth-motion.ts';
import './tier1-feature/f10-custom-cursor.ts';
import './tier1-feature/f11-whatsapp-validation.ts';
import './tier1-feature/f12-whatsapp-url.ts';
import './tier1-feature/f13-jwt-auth.ts';
import './tier1-feature/f14-admin-crud.ts';
import './tier1-feature/f15-store-settings.ts';
import './tier1-feature/f16-vercel-blob.ts';
import './tier1-feature/f17-elevenlabs-generation.ts';
import './tier1-feature/f18-credit-guard.ts';
import './tier1-feature/f19-prompt-dedup.ts';
import './tier1-feature/f20-admin-confirmation.ts';
import './tier1-feature/f21-elevenlabs-cli.ts';
import './tier1-feature/f22-dynamic-search.ts';
import './tier1-feature/f23-drop-system.ts';

// Tier 2: Boundary & Corner Cases
import './tier2-boundary/boundary-corner-cases.ts';

// Tier 3: Cross-Feature Combinations
import './tier3-combination/cross-feature-combinations.ts';

// Tier 4: Real-World Workloads
import './tier4-scenario/real-world-workloads.ts';

// -------------------------------------------------------------
// 2. Parse CLI Arguments
// -------------------------------------------------------------
function parseArgs(): RunnerOptions {
  const args = process.argv.slice(2);
  const options: RunnerOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tier' && args[i + 1]) {
      options.tier = parseInt(args[i + 1], 10);
      i++;
    } else if (arg.startsWith('--tier=')) {
      options.tier = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--filter' && args[i + 1]) {
      options.filter = args[i + 1];
      i++;
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

// -------------------------------------------------------------
// 3. Formatted Table Reporter
// -------------------------------------------------------------
function printBanner() {
  console.log(`\n================================================================`);
  console.log(`      CYRUX STUDIO - COMPREHENSIVE OPAQUE-BOX E2E TEST RUNNER   `);
  console.log(`================================================================`);
  console.log(`Target: Next.js (App Router), Prisma, ElevenLabs, WhatsApp Flow`);
  console.log(`Time  : ${new Date().toISOString()}`);
  console.log(`Node  : ${process.version}`);
  console.log(`================================================================`);
}

function printSummaryTable(summary: RunnerSummary) {
  console.log(`\n================================================================`);
  console.log(`                       E2E TEST SUMMARY REPORT                  `);
  console.log(`================================================================`);

  // Group by tier
  const tierStats: Record<number, { name: string; total: number; passed: number; failed: number }> = {
    1: { name: 'Tier 1: Feature Coverage (>=5/feat)', total: 0, passed: 0, failed: 0 },
    2: { name: 'Tier 2: Boundary & Corner Cases', total: 0, passed: 0, failed: 0 },
    3: { name: 'Tier 3: Cross-Feature Combinations', total: 0, passed: 0, failed: 0 },
    4: { name: 'Tier 4: Real-World Workloads', total: 0, passed: 0, failed: 0 },
  };

  for (const suite of summary.suites) {
    const stats = tierStats[suite.tier] || { name: `Tier ${suite.tier}`, total: 0, passed: 0, failed: 0 };
    tierStats[suite.tier] = stats;
    for (const t of suite.tests) {
      stats.total++;
      if (t.passed) stats.passed++;
      else stats.failed++;
    }
  }

  console.log(`| Tier   | Description                         | Total | Passed | Failed |`);
  console.log(`|--------|-------------------------------------|-------|--------|--------|`);
  for (const [tier, stats] of Object.entries(tierStats)) {
    if (stats.total === 0) continue;
    const tierLabel = `Tier ${tier}`.padEnd(6);
    const desc = stats.name.padEnd(35);
    const tot = String(stats.total).padStart(5);
    const pass = String(stats.passed).padStart(6);
    const fail = String(stats.failed).padStart(6);
    console.log(`| ${tierLabel} | ${desc} | ${tot} | ${pass} | ${fail} |`);
  }
  console.log(`|--------|-------------------------------------|-------|--------|--------|`);
  const totalStr = String(summary.total).padStart(5);
  const passStr = String(summary.passed).padStart(6);
  const failStr = String(summary.failed).padStart(6);
  console.log(`| TOTAL  | All Tiers Combined                  | ${totalStr} | ${passStr} | ${failStr} |`);
  console.log(`================================================================`);
  console.log(`Total Duration: ${summary.durationMs}ms`);

  if (summary.failed === 0) {
    console.log(`\n\x1b[32m\x1b[1m✔ ALL ${summary.total} TESTS PASSED CLEANLY (100% SUCCESS RATE)\x1b[0m\n`);
  } else {
    console.log(`\n\x1b[31m\x1b[1m✖ ${summary.failed} TEST(S) FAILED OUT OF ${summary.total}\x1b[0m\n`);
  }
}

// -------------------------------------------------------------
// 4. Main Entry Point
// -------------------------------------------------------------
async function main() {
  printBanner();
  const options = parseArgs();

  if (options.tier) {
    console.log(`\x1b[33mFiltering by Tier: ${options.tier}\x1b[0m`);
  }
  if (options.filter) {
    console.log(`\x1b[33mFiltering by Pattern: "${options.filter}"\x1b[0m`);
  }

  try {
    const summary = await executeSuites(options);
    printSummaryTable(summary);

    if (summary.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error(`\x1b[31mFatal test runner error: ${err.message}\x1b[0m`);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
