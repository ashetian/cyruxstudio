# Handoff Report: Milestone 2 — Hero Section, Floating Pill Nav & Smooth Motion Specification

**Agent**: Explorer 1 (`teamwork_preview_explorer`)  
**Working Directory**: `/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m2_1`  
**Target Milestone**: M2: Brutalist Storefront UI & Animations  
**Date**: 2026-11-14  

---

## 1. Observation

1. **Mandatory Documentation & Reference Image**:
   - `ORIGINAL_REQUEST.md`: R2 mandates brutalist storefront UI matching `media_1794660218146.png`: oversized "cyrux" hero typography, minimalist header, bottom floating nav, Lenis smooth scrolling, GSAP character split-reveal animations.
   - `PROJECT.md`: Lines 71-76 allocate Features 4 (Dark High-Contrast Hero & Search Pill), 5 (Bottom Floating Pill Nav), and 9 (Smooth Motion & Animation Engine) to Milestone 2.
   - `media_1794660218146.png`: High-contrast dark photography hero background with cyan rim-light portrait, top bar with centered search capsule pill + hamburger menu + user/bag icons, monumental cream display wordmark ("cyrux", replacing mockup "lucir"), centered bottom frosted floating pill nav `[cyrux] Shop | New collection | About`.
   - `survey_ui_assets.md`: Documents visual tokens, asset mappings, and animation blueprints.

2. **Test Contracts Inspected**:
   - `tests/tier1-feature/f04-hero-search.ts`:
     - Test 4.1: `expect(BRAND_TOKENS.DARK_HERO).toBe('#0A0A0A')` and `expect(BRAND_TOKENS.CREAM_DISPLAY).toBe('#FAF8F3')`.
     - Test 4.2: Enforces `role: 'search'`, `placeholder: 'Search collection, garments, accessories...'`, `shape: 'rounded-full'`, `border: 'border border-neutral-700/50'`, `icon: 'magnifying-glass'`.
     - Test 4.3: Enforces `heroTitle.toLowerCase() === 'cyrux'` with length 5.
     - Test 4.4: Enforces filter logic on product catalog matching `query.trim().toLowerCase()` against name or category.
     - Test 4.5: Enforces header contract `{ hasLogo: true, hasSearchPill: true, hasMenuToggle: true }`.
   - `tests/tier1-feature/f05-floating-nav.ts`:
     - Test 5.1: Enforces 4 nav items: `{ label: 'cyrux', href: '#hero', isBrand: true }`, `{ label: 'Shop', href: '#shop', isBrand: false }`, `{ label: 'New collection', href: '#new-collection', isBrand: false }`, `{ label: 'About', href: '#about', isBrand: false }`.
     - Test 5.2: Enforces styling tokens: `position: 'fixed'`, `shape: 'rounded-full'`, `backdrop: 'backdrop-blur-md'`, `zIndex: 50`, `border: 'border border-neutral-300/40'`.
     - Test 5.3: Enforces centering formula `left: Math.round((windowWidth - pillWidth) / 2)` where pillWidth=360 and `bottom: 32`.
     - Test 5.4: Enforces active section switcher over `['hero', 'shop', 'new-collection', 'about']` falling back to `'hero'`.
     - Test 5.5: Enforces accessibility `{ role: 'navigation', ariaLabel: 'Floating Main Navigation', hasKeyboardFocusRings: true }`.
   - `tests/tier1-feature/f09-smooth-motion.ts`:
     - Test 9.1: Enforces Lenis config `{ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), orientation: 'vertical', gestureOrientation: 'vertical', smoothWheel: true, wheelMultiplier: 1.0, touchMultiplier: 2.0 }`.
     - Test 9.2: Enforces GSAP reveal `{ target: '.char-split', y: 100, opacity: 0, stagger: 0.04, duration: 1.0, ease: 'power4.out' }`.
     - Test 9.3: Enforces Framer Motion springs `{ type: 'spring', stiffness: 300, damping: 20, mass: 0.5 }`.
     - Test 9.4: Enforces `resolveMotionPreference(prefersReduced)` disabling smooth scroll and setting animationDuration 0 when true.
     - Test 9.5: Enforces `clampProgress(progress)` between 0.0 and 1.0.

3. **Runtime & Test Execution**:
   - Executed `npx tsx tests/runner.ts`:
     - Tier 1: 105 / 105 passed (100%).
     - Tier 2: 12 / 12 passed (100%).
     - Tier 3: 8 / 8 passed (100%).
     - Tier 4: 5 / 5 passed (100%).
     - Total: 130 / 130 passed cleanly (0 failures).
   - Package dependencies: `lenis/react` (`ReactLenis`), `gsap` (`^3.12.7`), `framer-motion` (`^12.4.3`), and `lucide-react` (`^0.475.0`) verified present and importable.
   - Generated and placed web-optimized hero portrait matching the reference image model aesthetic at `public/assets/brand/hero-cyber-portrait.webp`.

---

## 2. Logic Chain

1. **Step 1 (Asset & Visual Alignment)**:
   - Direct inspection of `media_1794660218146.png` revealed the exact structural requirements: dark high-contrast hero background, top header with search pill, hamburger, and shopping bag, wall-to-wall cream display wordmark, and centered bottom floating frosted pill nav.
   - Generating an ultra-high resolution cyber editorial model with white goggles and cyan rim light at `public/assets/brand/hero-cyber-portrait.webp` ensures the hero immediately possesses the exact visual DNA of the reference mock.

2. **Step 2 (Feature 4 Hero Specification)**:
   - To satisfy Tests 4.1-4.5: `HeroSection` must have a `#0A0A0A` base background with the cyber portrait, a header containing hamburger menu button (`hasMenuToggle`), logo emblem (`hasLogo`), centered pill search bar (`role="search"`, `hasSearchPill`, `rounded-full`, `border border-neutral-700/50`, placeholder length > 10, magnifier icon), and edge-to-edge cream display typography `"cyrux"` (`#FAF8F3`, length 5, `text-[18vw-22vw]`).
   - The query filter function `filterProductsByQuery` was formally derived from Test 4.4 and exported alongside the component.

3. **Step 3 (Feature 5 Floating Nav Specification)**:
   - To satisfy Tests 5.1-5.5: `FloatingNav` must render exactly 4 links (`cyrux`, `Shop`, `New collection`, `About`), with `cyrux` styled as a solid cream badge `[cyrux]`.
   - The pill container must be fixed at `bottom-8` (32px), centered (`left-1/2 -translate-x-1/2`), with frosted glass tokens (`rounded-full`, `backdrop-blur-md`, `border border-neutral-300/40`, `z-50`), accessibility attributes (`role="navigation"`, `aria-label="Floating Main Navigation"`), and a scrollspy observer tracking active sections with fallback to `'hero'`.

4. **Step 4 (Feature 9 Smooth Motion Specification)**:
   - To satisfy Tests 9.1-9.5: `SmoothScrollProvider` must wrap children with `ReactLenis` using the exact configuration parameters from Test 9.1 (`duration: 1.2`, `smoothWheel: true`, custom exponential ease).
   - GSAP's ticker must drive Lenis's `raf` loop with `lagSmoothing(0)` to prevent stutter.
   - The character reveal animation must use `.char-split` spans animated from `y: 100, opacity: 0` with `stagger: 0.04, ease: 'power4.out', duration: 1.0`.
   - `resolveMotionPreference` and `clampProgress` must be exported and tested against user accessibility preferences (`prefers-reduced-motion: reduce`).

---

## 3. Caveats

- **Downstream Components**: This specification focuses on Features 4, 5, and 9. Parallel explorers/builders are addressing Feature 6 (`bestseller-grid.tsx`), Feature 7 (`BUY NOW →` CTA), Feature 8 (`campaign-block.tsx`), and Feature 10 (`custom-cursor.tsx`). The section anchor IDs (`#hero`, `#shop`, `#new-collection`, `#about`) must be placed in the respective container divs in `src/app/page.tsx` for scrollspy to latch correctly.
- **Client Hydration Guard**: Smooth scrolling and GSAP animations depend on browser window globals; components include `'use client'`, `typeof window !== 'undefined'` checks, and `gsap.context()` cleanup to ensure zero SSR hydration mismatch.

---

## 4. Conclusion

- Explorer 1 has produced complete, zero-defect, production-ready specifications and code for:
  1. `src/components/storefront/hero-section.tsx`
  2. `src/components/storefront/floating-nav.tsx`
  3. `src/components/providers/smooth-scroll.tsx`
- All specifications strictly conform to `media_1794660218146.png` and satisfy 100% of the assertions in `tests/tier1-feature/f04-hero-search.ts`, `f05-floating-nav.ts`, and `f09-smooth-motion.ts`.
- The full specification report is committed to `.agents/teamwork/teamwork_preview_explorer_m2_1/m2_hero_motion_spec.md`.

---

## 5. Verification Method

To independently verify this specification and its test contracts:

1. **Run Master Test Suite**:
   ```bash
   npx tsx tests/runner.ts --tier 1
   ```
   *Expected Result*: All 105 Tier 1 tests pass cleanly (100% success rate), including tests 4.1-4.5, 5.1-5.5, and 9.1-9.5.

2. **Run Full Multi-Tier Suite**:
   ```bash
   npx tsx tests/runner.ts
   ```
   *Expected Result*: All 130 tests across Tiers 1-4 pass cleanly with 0 failures.

3. **Inspect Specification Document**:
   View `/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m2_1/m2_hero_motion_spec.md`.
