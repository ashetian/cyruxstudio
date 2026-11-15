## 2026-11-14T13:23:57Z
You are Explorer 1 for Milestone 2 (M2: Brutalist Storefront UI & Animations).
Your identity: teamwork_preview_explorer
Your working directory: /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m2_1
Project root: /home/ashetian/Desktop/cyruxstudio

MANDATORY FIRST STEP: Read:
1. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/ORIGINAL_REQUEST.md
2. /home/ashetian/Desktop/cyruxstudio/PROJECT.md
3. /home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_survey_2/survey_ui_assets.md

SECURITY CONSTRAINT:
NEVER open, read, print, cat, or echo .env.local! Never search for secrets or hardcode API keys.

TASK:
Explore and specify component implementations for:
1. Hero Section (`src/components/storefront/hero-section.tsx`):
   - High-contrast dark photography / cyber-aesthetic hero background.
   - Top header with centered pill search bar (search input filtering products), hamburger menu on left, user profile/bag on right.
   - Wall-to-wall edge-to-edge giant cream display typography "cyrux" (`text-[18vw-22vw]`, `#FAF8F3`).
2. Bottom Floating Pill Nav (`src/components/storefront/floating-nav.tsx`):
   - Fixed bottom-centered frosted glass floating pill navigation.
   - Solid cream `[cyrux]` badge on left, navigation links `Shop | New collection | About`.
3. Motion & Smooth Scroll Provider (`src/components/providers/smooth-scroll.tsx`):
   - Lenis smooth scroll provider setup using `lenis/react`.
   - GSAP character masking/split-reveal animation hook/component for the "cyrux" display typography and section headers.
4. Verify that these match `media_1794660218146.png` layout and satisfy tests `tests/tier1-feature/f04-hero-search.ts`, `f05-floating-nav.ts`, `f09-smooth-motion.ts`.

OUTPUT:
Write your investigation report to:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m2_1/m2_hero_motion_spec.md
And write:
/home/ashetian/Desktop/cyruxstudio/.agents/teamwork/teamwork_preview_explorer_m2_1/handoff.md
When done, call send_message to notify parent orchestrator.
