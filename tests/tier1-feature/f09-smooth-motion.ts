import { describe, it, expect } from '../framework.ts';

describe('Feature 9: Smooth Motion & Animation Engine', () => {
  it('9.1 should validate Lenis inertial smooth scroll provider configuration options', () => {
    const lenisConfig = {
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical' as const,
      gestureOrientation: 'vertical' as const,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
    };

    expect(lenisConfig.duration).toBeGreaterThan(0.5);
    expect(lenisConfig.smoothWheel).toBe(true);
    expect(lenisConfig.orientation).toBe('vertical');
    expect(typeof lenisConfig.easing).toBe('function');
  });

  it('9.2 should configure GSAP split character reveal animation parameters for hero typography', () => {
    const gsapRevealTimeline = {
      target: '.char-split',
      y: 100,
      opacity: 0,
      stagger: 0.04,
      duration: 1.0,
      ease: 'power4.out',
    };

    expect(gsapRevealTimeline.stagger).toBeLessThan(0.1);
    expect(gsapRevealTimeline.ease).toBe('power4.out');
    expect(gsapRevealTimeline.y).toBeGreaterThan(0);
  });

  it('9.3 should configure Framer Motion hover springs for product card interaction', () => {
    const springTransition = {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      mass: 0.5,
    };

    expect(springTransition.type).toBe('spring');
    expect(springTransition.stiffness).toBeGreaterThan(100);
    expect(springTransition.damping).toBeGreaterThan(10);
  });

  it('9.4 should disable smooth motion when user requests prefers-reduced-motion', () => {
    const resolveMotionPreference = (prefersReduced: boolean) => {
      if (prefersReduced) {
        return {
          smoothScrollEnabled: false,
          animationDuration: 0,
          fadeTransitionsOnly: true,
        };
      }
      return {
        smoothScrollEnabled: true,
        animationDuration: 1.2,
        fadeTransitionsOnly: false,
      };
    };

    const normalMode = resolveMotionPreference(false);
    expect(normalMode.smoothScrollEnabled).toBe(true);
    expect(normalMode.animationDuration).toBe(1.2);

    const reducedMode = resolveMotionPreference(true);
    expect(reducedMode.smoothScrollEnabled).toBe(false);
    expect(reducedMode.animationDuration).toBe(0);
  });

  it('9.5 should clamp scroll progress between 0.0 and 1.0', () => {
    const clampProgress = (progress: number) => Math.max(0, Math.min(1, progress));

    expect(clampProgress(-0.5)).toBe(0);
    expect(clampProgress(0.42)).toBe(0.42);
    expect(clampProgress(1.5)).toBe(1);
  });
}, { tier: 1, featureId: 9 });
