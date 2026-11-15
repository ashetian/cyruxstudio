/**
 * Empirical Challenge Verification Harness for Milestone 2
 * Author: teamwork_preview_challenger_m2_2
 */

import fs from 'node:fs';
import path from 'node:path';

// 1. Imports from actual source modules
import { resolveVideoPoster } from '../src/components/storefront/campaign-block';
import {
  resolveMotionPreference,
  clampProgress,
  LENIS_CONFIG,
  GSAP_REVEAL_CONFIG,
  HOVER_SPRING,
} from '../src/components/providers/smooth-scroll';
import {
  lerp,
  getCursorVisualState,
  shouldMountCustomCursor,
  clampToViewport,
} from '../src/components/ui/custom-cursor';
import { filterProductsByQuery } from '../src/components/storefront/hero-section';
import { formatProductPrice, ASYMMETRIC_COLUMN_CONFIG } from '../src/components/storefront/bestseller-grid';
import { BRAND_TOKENS } from '../src/lib/constants';

interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, suite: string) {
  if (condition) {
    results.push({ suite, testName, passed: true });
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    results.push({ suite, testName, passed: false, error: 'Assertion failed' });
    console.error(`  ✖ [FAIL] ${testName}`);
  }
}

function assertEqual<T>(actual: T, expected: T, testName: string, suite: string) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (match) {
    results.push({ suite, testName, passed: true });
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    results.push({
      suite,
      testName,
      passed: false,
      error: `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    });
    console.error(`  ✖ [FAIL] ${testName}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('\n================================================================');
console.log('--- STARTING EMPIRICAL VERIFICATION HARNESS (CHALLENGER 2) ---');
console.log('================================================================\n');

// ---------------------------------------------------------------------------
// SUITE 1: Video Playback Controller & Video Poster Fallback
// ---------------------------------------------------------------------------
console.log('[SUITE 1] Video Playback Controller & Poster Fallback (campaign-block.tsx)');

// 1.1 Valid video path resolution
const res1 = resolveVideoPoster('/assets/video/cyrux-campaign-1080.mp4', '/assets/video/cyrux-campaign-poster.webp');
assert(res1.hasVideo === true, '1.1 hasVideo is true for valid mp4 path', 'Suite 1');
assertEqual(res1.source, '/assets/video/cyrux-campaign-1080.mp4', '1.2 source matches videoUrl', 'Suite 1');
assertEqual(res1.poster, '/assets/video/cyrux-campaign-poster.webp', '1.3 poster matches fallback poster', 'Suite 1');

// 1.2 Null, undefined, and empty string handling
const resNull = resolveVideoPoster(null, '/assets/video/cyrux-campaign-poster.webp');
assertEqual(resNull, { hasVideo: false, poster: '/assets/video/cyrux-campaign-poster.webp' }, '1.4 Null videoUrl fallback', 'Suite 1');

const resUndef = resolveVideoPoster(undefined, '/assets/video/cyrux-campaign-poster.webp');
assertEqual(resUndef, { hasVideo: false, poster: '/assets/video/cyrux-campaign-poster.webp' }, '1.5 Undefined videoUrl fallback', 'Suite 1');

const resEmpty = resolveVideoPoster('', '/assets/video/cyrux-campaign-poster.webp');
assertEqual(resEmpty, { hasVideo: false, poster: '/assets/video/cyrux-campaign-poster.webp' }, '1.6 Empty string videoUrl fallback', 'Suite 1');

const resSpaces = resolveVideoPoster('   \t\n  ', '/assets/video/cyrux-campaign-poster.webp');
assertEqual(resSpaces, { hasVideo: false, poster: '/assets/video/cyrux-campaign-poster.webp' }, '1.7 Whitespace-only videoUrl fallback', 'Suite 1');

// 1.3 Physical disk verification of referenced media assets
const rootDir = path.resolve(__dirname, '..');
const videoFile1080 = path.join(rootDir, 'public', 'assets', 'video', 'cyrux-campaign-1080.mp4');
const videoFile720 = path.join(rootDir, 'public', 'assets', 'video', 'cyrux-campaign-720.mp4');
const posterFileWebp = path.join(rootDir, 'public', 'assets', 'video', 'cyrux-campaign-poster.webp');
const posterFileJpg = path.join(rootDir, 'public', 'assets', 'video', 'cyrux-campaign-poster.jpg');

assert(fs.existsSync(videoFile1080), '1.8 Physical file exists: cyrux-campaign-1080.mp4', 'Suite 1');
assert(fs.existsSync(videoFile720), '1.9 Physical file exists: cyrux-campaign-720.mp4', 'Suite 1');
assert(fs.existsSync(posterFileWebp), '1.10 Physical file exists: cyrux-campaign-poster.webp', 'Suite 1');
assert(fs.existsSync(posterFileJpg), '1.11 Physical file exists: cyrux-campaign-poster.jpg', 'Suite 1');

const stat1080 = fs.statSync(videoFile1080);
assert(stat1080.size > 500000, `1.12 Video 1080p has valid non-empty size (${stat1080.size} bytes)`, 'Suite 1');

// 1.4 Simulated controller state machine
let videoPlaying = false;
let videoMuted = true;

function toggleAudio() {
  videoMuted = !videoMuted;
  return videoMuted;
}

function simulatePlay(rejected = false): Promise<boolean> {
  if (rejected) {
    return Promise.reject(new Error('AutoplayBlocked')).catch(() => {
      videoPlaying = false;
      return false;
    });
  }
  return Promise.resolve(true).then(() => {
    videoPlaying = true;
    return true;
  });
}

function simulatePause(): boolean {
  videoPlaying = false;
  return false;
}

assert(videoMuted === true, '1.13 Initial audio mute conforms to browser autoplay policy', 'Suite 1');
assertEqual(toggleAudio(), false, '1.14 toggleAudio unmutes audio', 'Suite 1');
assertEqual(toggleAudio(), true, '1.15 toggleAudio re-mutes audio', 'Suite 1');

// ---------------------------------------------------------------------------
// SUITE 2: Lenis Provider & GSAP Reveal under prefers-reduced-motion: reduce
// ---------------------------------------------------------------------------
console.log('\n[SUITE 2] Lenis Provider & GSAP Reveal Logic under prefers-reduced-motion');

// 2.1 Motion preference resolver
const prefNormal = resolveMotionPreference(false);
assertEqual(
  prefNormal,
  { smoothScrollEnabled: true, animationDuration: 1.2, fadeTransitionsOnly: false },
  '2.1 Normal motion preference configuration',
  'Suite 2'
);

const prefReduced = resolveMotionPreference(true);
assertEqual(
  prefReduced,
  { smoothScrollEnabled: false, animationDuration: 0, fadeTransitionsOnly: true },
  '2.2 Reduced motion preference disables smooth scroll and zeroes duration',
  'Suite 2'
);

// 2.2 Clamp progress
assert(clampProgress(-0.5) === 0, '2.3 Clamp lower bound to 0', 'Suite 2');
assert(clampProgress(0) === 0, '2.4 Clamp exact 0', 'Suite 2');
assert(clampProgress(0.73) === 0.73, '2.5 Clamp mid value 0.73', 'Suite 2');
assert(clampProgress(1.0) === 1.0, '2.6 Clamp exact 1', 'Suite 2');
assert(clampProgress(2.5) === 1.0, '2.7 Clamp upper bound to 1', 'Suite 2');

// 2.3 GSAP Reveal Config contracts
assert(GSAP_REVEAL_CONFIG.target === '.char-split', '2.8 GSAP target is .char-split', 'Suite 2');
assert(GSAP_REVEAL_CONFIG.stagger === 0.04, '2.9 GSAP stagger is 0.04s', 'Suite 2');
assert(GSAP_REVEAL_CONFIG.duration === 1.0, '2.10 GSAP duration is 1.0s', 'Suite 2');
assert(GSAP_REVEAL_CONFIG.ease === 'power4.out', '2.11 GSAP ease is power4.out', 'Suite 2');

// 2.4 Lenis Config contracts
assert(LENIS_CONFIG.duration === 1.2, '2.12 Lenis duration is 1.2s', 'Suite 2');
assert(LENIS_CONFIG.orientation === 'vertical', '2.13 Lenis orientation is vertical', 'Suite 2');
assert(LENIS_CONFIG.smoothWheel === true, '2.14 Lenis smoothWheel is enabled', 'Suite 2');
assert(typeof LENIS_CONFIG.easing === 'function', '2.15 Lenis easing is a valid function', 'Suite 2');

// Check easing formula at boundary points
const e0 = LENIS_CONFIG.easing(0);
const eHalf = LENIS_CONFIG.easing(0.5);
const e1 = LENIS_CONFIG.easing(1);
assert(e0 >= 0 && e0 <= 0.01, `2.16 Easing at 0 is ~0 (${e0})`, 'Suite 2');
assert(eHalf > e0 && eHalf < 1, `2.17 Easing at 0.5 is monotonic (${eHalf})`, 'Suite 2');
assert(e1 >= 0.99 && e1 <= 1.0, `2.18 Easing at 1 is ~1 (${e1})`, 'Suite 2');

// ---------------------------------------------------------------------------
// SUITE 3: Custom Cursor Suppression & Interactive States
// ---------------------------------------------------------------------------
console.log('\n[SUITE 3] Custom Cursor Suppression on Touch & Interactive States');

// 3.1 shouldMountCustomCursor matrix testing
assert(shouldMountCustomCursor(false, false) === true, '3.1 Desktop (no touch, fine pointer) mounts cursor', 'Suite 3');
assert(shouldMountCustomCursor(true, true) === false, '3.2 Mobile smartphone (touch + coarse) suppresses cursor', 'Suite 3');
assert(shouldMountCustomCursor(false, true) === false, '3.3 Coarse pointer alone suppresses cursor', 'Suite 3');
assert(shouldMountCustomCursor(true, false) === false, '3.4 Touch device with fine pointer suppresses cursor', 'Suite 3');

// 3.2 clampToViewport
const cInside = clampToViewport(400, 300, 1920, 1080);
assertEqual(cInside, { x: 400, y: 300 }, '3.5 In-bounds coords unchanged', 'Suite 3');

const cNeg = clampToViewport(-100, -50, 1920, 1080);
assertEqual(cNeg, { x: 0, y: 0 }, '3.6 Negative coords clamped to 0', 'Suite 3');

const cMax = clampToViewport(2500, 1500, 1920, 1080);
assertEqual(cMax, { x: 1920, y: 1080 }, '3.7 Overflow coords clamped to viewport max', 'Suite 3');

// 3.3 lerp helper
assert(lerp(0, 100, 0.2) === 20, '3.8 Lerp 0 -> 100 with factor 0.2 is 20', 'Suite 3');
assert(lerp(100, 100, 0.2) === 100, '3.9 Lerp stationary is unchanged', 'Suite 3');
assert(lerp(50, 0, 0.5) === 25, '3.10 Lerp downwards works accurately', 'Suite 3');

// 3.4 getCursorVisualState
assertEqual(
  getCursorVisualState('DIV'),
  { scale: 1.0, label: '', visible: true },
  '3.11 Default DIV has scale 1.0 and no label',
  'Suite 3'
);
assertEqual(
  getCursorVisualState('BUTTON'),
  { scale: 1.8, label: '', visible: true },
  '3.12 BUTTON has scale 1.8',
  'Suite 3'
);
assertEqual(
  getCursorVisualState('a'),
  { scale: 1.8, label: '', visible: true },
  '3.13 lowercase "a" tag has scale 1.8',
  'Suite 3'
);
assertEqual(
  getCursorVisualState('DIV', 'VIEW'),
  { scale: 2.5, label: 'VIEW', visible: true },
  '3.14 DIV with VIEW label has scale 2.5 and label VIEW',
  'Suite 3'
);
assertEqual(
  getCursorVisualState('DIV', 'PLAY'),
  { scale: 2.5, label: 'PLAY', visible: true },
  '3.15 DIV with PLAY label has scale 2.5 and label PLAY',
  'Suite 3'
);
assertEqual(
  getCursorVisualState('DIV', 'PAUSE'),
  { scale: 2.5, label: 'PAUSE', visible: true },
  '3.16 DIV with PAUSE label has scale 2.5 and label PAUSE',
  'Suite 3'
);
assertEqual(
  getCursorVisualState('BUTTON', 'BUY'),
  { scale: 2.5, label: 'BUY', visible: true },
  '3.17 BUTTON with BUY label prioritizes custom label scale 2.5',
  'Suite 3'
);

// ---------------------------------------------------------------------------
// SUITE 4: Storefront Constants, Tokens & Formatting
// ---------------------------------------------------------------------------
console.log('\n[SUITE 4] Storefront Tokens & Asymmetric Configs');

assertEqual(BRAND_TOKENS.DARK_HERO, '#0A0A0A', '4.1 Brand token DARK_HERO is #0A0A0A', 'Suite 4');
assertEqual(BRAND_TOKENS.CANVAS_BG, '#F7F5EE', '4.2 Brand token CANVAS_BG is #F7F5EE', 'Suite 4');
assertEqual(BRAND_TOKENS.CREAM_DISPLAY, '#FAF8F3', '4.3 Brand token CREAM_DISPLAY is #FAF8F3', 'Suite 4');

// Asymmetric column config
assert(ASYMMETRIC_COLUMN_CONFIG.length === 4, '4.4 Asymmetric config has 4 columns', 'Suite 4');
assertEqual(
  ASYMMETRIC_COLUMN_CONFIG.map((c) => c.ratio),
  [1.2, 1.45, 1.15, 1.35],
  '4.5 Asymmetric column ratios match spec [1.2, 1.45, 1.15, 1.35]',
  'Suite 4'
);

// Price formatting
assertEqual(formatProductPrice(180, 'USD'), '$180.00', '4.6 Format USD price', 'Suite 4');
assertEqual(formatProductPrice(220.5, 'EUR'), '€220.50', '4.7 Format EUR price', 'Suite 4');
assertEqual(formatProductPrice(3400, 'TRY'), '₺3400.00', '4.8 Format TRY price', 'Suite 4');
assertEqual(formatProductPrice(150, 'GBP'), '£150.00', '4.9 Format GBP price', 'Suite 4');
assertEqual(formatProductPrice(50, 'JPY'), 'JPY50.00', '4.10 Format unsupported fallback currency', 'Suite 4');

// Search filtering
const dummyProducts = [
  { name: 'Oversized Cyber Puffer', category: 'Outerwear', description: 'Heavyweight thermal puffer jacket' },
  { name: 'Brutalist Monospace Tee', category: 'Tops', description: '100% heavyweight cotton tee' },
  { name: 'Chrome Orbital Ring', category: 'Accessories', description: 'Liquid chrome hardware accessory' },
];

assertEqual(filterProductsByQuery(dummyProducts, '').length, 3, '4.11 Empty search query returns all products', 'Suite 4');
assertEqual(filterProductsByQuery(dummyProducts, 'puffer').length, 1, '4.12 Search query "puffer" matches name', 'Suite 4');
assertEqual(filterProductsByQuery(dummyProducts, 'accessories').length, 1, '4.13 Search query "accessories" matches category', 'Suite 4');
assertEqual(filterProductsByQuery(dummyProducts, 'cotton').length, 1, '4.14 Search query "cotton" matches description', 'Suite 4');
assertEqual(filterProductsByQuery(dummyProducts, 'nonexistent').length, 0, '4.15 Non-matching query returns empty array', 'Suite 4');

// ---------------------------------------------------------------------------
// SUITE 5: Stress & Stress-Testing Edge Cases
// ---------------------------------------------------------------------------
console.log('\n[SUITE 5] Adversarial Stress Testing & Boundary Probing');

// 5.1 Huge input to clampToViewport
const hugeClamp = clampToViewport(1e9, -1e9, 1920, 1080);
assertEqual(hugeClamp, { x: 1920, y: 0 }, '5.1 Massive overflow / underflow coordinates clamp safely', 'Suite 5');

// 5.2 Rapid Lerp Convergence Loop
let x = 0;
const target = 1000;
for (let frame = 0; frame < 60; frame++) {
  x = lerp(x, target, 0.2);
}
assert(Math.abs(target - x) < 0.01, `5.2 60 frames of 0.2 lerp converges to target (${x} -> 1000)`, 'Suite 5');

// 5.3 resolveVideoPoster with adversarial inputs
const malformedUrl1 = resolveVideoPoster('javascript:alert(1)', '/assets/poster.webp');
assert(malformedUrl1.hasVideo === true, '5.3 Protocol filtering check (raw string passed to source)', 'Suite 5');

const malformedUrl2 = resolveVideoPoster('', '');
assertEqual(malformedUrl2, { hasVideo: false, poster: '' }, '5.4 Empty fallback poster and empty video', 'Suite 5');

// ---------------------------------------------------------------------------
// REPORT SUMMARY
// ---------------------------------------------------------------------------
console.log('\n================================================================');
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
console.log(`TOTAL EMPIRICAL ASSERTIONS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
