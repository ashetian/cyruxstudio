## 2026-11-14T13:34:49Z
You are Worker 2 for Milestone 2 (M2: Brutalist Storefront UI & Smooth Animations).
Your identity: teamwork_preview_worker
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_worker_m2
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read:
1. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/ashetian/Desktop/cyruxstudio/PROJECT.md
3. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m2_1/m2_hero_motion_spec.md
4. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m2_2/m2_grid_cta_spec.md
5. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m2_3/m2_campaign_cursor_spec.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys.

FILE OWNERSHIP:
You exclusively own:
- `src/components/storefront/hero-section.tsx`
- `src/components/storefront/floating-nav.tsx`
- `src/components/storefront/bestseller-grid.tsx`
- `src/components/storefront/campaign-block.tsx`
- `src/components/storefront/variant-modal.tsx`
- `src/components/ui/custom-cursor.tsx`
- `src/components/ui/magnetic-cta.tsx`
- `src/components/providers/smooth-scroll.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `package.json` (add `"test": "tsx tests/runner.ts"` script as noted in review)

TASKS:
1. Implement `src/components/providers/smooth-scroll.tsx`:
   - ReactLenis provider with smooth wheel physics and prefers-reduced-motion fallback.
   - GSAP lagSmoothing synchronization and reusable `<SplitRevealText>` letter-masking component.
2. Implement `src/components/ui/custom-cursor.tsx`:
   - High-performance 120fps RAF lerp loop cursor tracking mouse coordinates.
   - Label morphing ("VIEW" on product cards, "PLAY" on video block).
   - Suppressed on touch/coarse devices (`@media (hover: none)`).
3. Implement `src/components/storefront/hero-section.tsx`:
   - Dark high-contrast hero background (`#0A0A0A` with cyber model portrait).
   - Centered pill search bar with real live product filtering (`role="search"`).
   - Edge-to-edge giant cream display typography "cyrux" (`text-[18vw-22vw]`, `#FAF8F3`).
   - Hamburger button and profile/bag icons.
4. Implement `src/components/storefront/floating-nav.tsx`:
   - Fixed bottom-centered frosted glass floating pill nav.
   - `[cyrux]` solid cream badge + `Shop | New collection | About`.
   - Scrollspy section tracking.
5. Implement `src/components/storefront/bestseller-grid.tsx` & `src/components/ui/magnetic-cta.tsx`:
   - Uppercase monospace `Bestseller Now` heading on ecru canvas `#F7F5EE`.
   - Asymmetric 4-column borderless grid with height multipliers (Column 2 visibly taller, ~1.45x).
   - Top-right wishlist heart toggle with interactive state.
   - Monospace title & formatted price.
   - Monospace underlined `BUY NOW →` CTA button with Framer Motion spring hover physics.
   - Out of stock disabled state (`"OUT OF STOCK"`).
   - Size variant selector modal (`variant-modal.tsx`) with customer notes.
6. Implement `src/components/storefront/campaign-block.tsx`:
   - 2 left-stacked cards (square portrait crop + chrome visual).
   - 1 large right editorial video block (`public/assets/video/cyrux-campaign-1080.mp4` with poster fallback).
   - Centered circular Play/Pause button with audio mute toggle.
7. Integrate everything cleanly into `src/app/layout.tsx` and `src/app/page.tsx`.
8. Ensure `package.json` has `"test": "tsx tests/runner.ts"`.
9. VERIFY:
   - `npx prisma generate` -> code 0
   - `npx tsc --noEmit` -> code 0
   - `npm run lint` -> code 0
   - `npm run build` -> code 0
   - `npm test` -> 130/130 tests pass!
