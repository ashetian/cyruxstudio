# Milestone 2 Challenge Report: Animation Performance & Media Rendering

**Reviewer**: Challenger 2 (`teamwork_preview_challenger`)  
**Target Milestone**: M2 (Brutalist Storefront UI & Animations)  
**Date**: 2026-11-14  
**Verdict**: **APPROVE** (with non-blocking advisory findings)

---

## 1. Executive Summary

An adversarial empirical verification of Milestone 2 (Brutalist Storefront UI & Smooth Animations) was performed across five primary vectors:
1. Video playback controller & poster fallback in `src/components/storefront/campaign-block.tsx`
2. Lenis smooth scroll provider & GSAP split character reveal under `prefers-reduced-motion: reduce`
3. Custom brutalist cursor suppression on touch devices (`hover: none` / `pointer: coarse`)
4. Compilation, production build, and test suite execution (`npm test`, `npx tsc --noEmit`, `npm run build`)
5. Empirical test harness execution (`tests/verification_empirical_m2.ts`, 69 assertions)

**Overall Risk Assessment**: **LOW**  
All mandatory contracts, animations, fallbacks, and mobile guards are implemented cleanly and verified empirically.

---

## 2. Empirical Verification Results

| Dimension | Scope | Expected Behavior | Actual Empirical Result | Status |
|-----------|-------|-------------------|-------------------------|--------|
| **Video Playback** | `campaign-block.tsx` | Resolves valid MP4, falls back on null/empty URL; muted autoplay compliance | `resolveVideoPoster` handles null, empty, whitespace; `cyrux-campaign-1080.mp4` (1.7MB) verified on disk; `isMuted: true` default | **PASS** |
| **Reduced Motion** | `smooth-scroll.tsx`, `hero-section.tsx` | Disables Lenis and zeroes animation duration; reveals text immediately | `resolveMotionPreference(true)` returns `smoothScrollEnabled: false, duration: 0`; Lenis unmounted; GSAP set `.char-split` at `y:0, opacity:1` | **PASS** |
| **Cursor Suppression** | `custom-cursor.tsx` | Completely suppresses custom cursor on touch/mobile devices | `shouldMountCustomCursor(true, true)` returns `false`; component returns `null`; `pointerEvents: "none"` preserved | **PASS** |
| **TypeScript Check** | Entire workspace | `npx tsc --noEmit` exits with code 0 | Code 0, 0 type errors | **PASS** |
| **E2E Test Runner** | Master suite (Tiers 1-4) | `npm test` passes all tests | 130 / 130 tests passed (100% success rate, 4923ms) | **PASS** |
| **Empirical Harness** | `tests/verification_empirical_m2.ts` | 69 targeted stress assertions | 69 / 69 passed cleanly | **PASS** |
| **Production Build** | Next.js App Router | `npm run build` succeeds | Production build compiled cleanly, static & dynamic routes generated | **PASS** |

---

## 3. Adversarial Challenges & Findings

### [Low/Medium] Challenge 1: Unconditional Play Button Overlay on Fallback Poster
- **Assumption Challenged**: When `videoUrl` is null/missing, `<CampaignBlock />` gracefully renders a static campaign fallback poster.
- **Attack Scenario**: If `videoUrl` is omitted or empty, `videoMeta.hasVideo` is `false`. However, lines 185-201 render the circular Play/Pause button regardless of `hasVideo`, and the container maintains `data-cursor="PLAY"`. Clicking the play button triggers `togglePlayback()` which silently early-returns (`if (!videoRef.current || !videoMeta.hasVideo) return;`). Furthermore, the audio mute button in lines 204-217 remains visible and clickable over the static image.
- **Blast Radius**: Cosmetic / interactive dead-end for users when video assets fail or are unconfigured. In standard configuration with the bundled `cyrux-campaign-1080.mp4`, this does not manifest because the video is present.
- **Recommended Mitigation**: Conditionally render the play button overlay, audio toggle, and `data-cursor="PLAY"` only when `videoMeta.hasVideo` is true:
  ```tsx
  {videoMeta.hasVideo && (
    <button aria-label="Toggle Campaign Video Playback" ... />
  )}
  ```

### [Low] Challenge 2: Native CSS `scroll-behavior: smooth` in `globals.css` Under Reduced Motion
- **Assumption Challenged**: Setting `prefers-reduced-motion: reduce` halts all smooth scrolling across the entire page.
- **Attack Scenario**: `SmoothScrollProvider` successfully unmounts `<ReactLenis>` and ceases JS inertial scroll ticker loops when `prefers-reduced-motion` is active. However, `src/app/globals.css` line 16 specifies `html { scroll-behavior: smooth; }` without an overriding `@media (prefers-reduced-motion: reduce)` rule. Consequently, native browser anchor clicks (`#shop`, `#hero`, etc.) will still trigger CSS smooth scrolling transitions.
- **Blast Radius**: Minor WCAG 2.3.3 edge case during in-page anchor navigation on browsers that do not automatically neutralize CSS `scroll-behavior` at the user-agent level.
- **Recommended Mitigation**: Add to `globals.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto !important;
    }
  }
  ```

### [Informational] Challenge 3: Touchscreen Laptops Suppress Custom Cursor
- **Assumption Challenged**: Custom cursor displays on all desktop computers.
- **Attack Scenario**: Laptops with touchscreens (e.g. Surface Pro, Lenovo Yoga) report `navigator.maxTouchPoints > 0`. Because `CustomCursor` guards with `isTouch || hasCoarse`, the custom cursor is suppressed even when the user is operating with a precision trackpad or external mouse.
- **Blast Radius**: None — this is an intentional, defensive UX choice that guarantees touch gestures are never impeded. Native OS cursors function normally.

---

## 4. Empirical Stress Test Evidence

Executed via `npx tsx tests/verification_empirical_m2.ts`:
- **Video Fallback & Mute Policy**:
  - `resolveVideoPoster` tested against null, undefined, `""`, and `"   "`. All returned `{ hasVideo: false, poster: ... }`.
  - Disk verification confirmed `cyrux-campaign-1080.mp4` (1,715,608 bytes) and `cyrux-campaign-poster.webp` exist with valid headers.
  - Initial `isMuted: true` conforms to browser autoplay restrictions.
- **Motion Preference**:
  - `resolveMotionPreference(true)` returns `{ smoothScrollEnabled: false, animationDuration: 0, fadeTransitionsOnly: true }`.
  - GSAP `.char-split` correctly receives immediate transform reset `{ y: 0, opacity: 1 }`.
  - Lenis easing formula tested at boundaries: `t=0` yields `~0.001`, `t=0.5` yields `0.97`, `t=1.0` yields `1.0`.
- **Cursor Touch Matrix**:
  - `shouldMountCustomCursor(false, false)` -> `true` (Desktop)
  - `shouldMountCustomCursor(true, true)` -> `false` (Mobile)
  - `shouldMountCustomCursor(false, true)` -> `false` (Coarse pointer)
  - `shouldMountCustomCursor(true, false)` -> `false` (Touchscreen laptop)
  - `clampToViewport` verified under extreme coordinates (`1e9`, `-1e9`) safely bounding to `(1920, 1080)` and `(0, 0)`.
  - RAF Lerp loop tested over 60 iterations converging from `0` to `999.998` towards target `1000`.

---

## 5. Final Verdict

**VERDICT: APPROVE**

Milestone 2 implementation is robust, complete, strictly adheres to all interface contracts and tokens, and passes 100% of the 130 tests and 69 empirical verification checks. The identified findings are minor advisory enhancements that do not block milestone acceptance.
