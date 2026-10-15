'use client';

import { useEffect } from 'react';

/** One eased glide between screens. fullPage.js sits around 700ms; so do we. */
const DURATION = 720;

/**
 * A trackpad swipe arrives as dozens of decaying wheel events. Anything closer
 * together than this is the tail of the gesture that already moved a screen, so
 * it is absorbed — one swipe, one screen.
 */
const GESTURE_GAP = 160;

/** Below these, the deck is an ordinary scrolling page — see `home.css`. */
const DECK_QUERY = '(min-width: 721px) and (min-height: 661px)';
const CALM_QUERY = '(prefers-reduced-motion: reduce)';

const SECTION_SELECTOR = '.ds-hero, .ds-home .ds-section';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * The motion half of the full-page homepage.
 *
 * Snapping stays in CSS — it is what touch, the keyboard and a JavaScript-less
 * page get. What this adds is the *timing*: Chrome animates a mandatory snap in
 * roughly 300ms of its own curve, and layering `scroll-behavior: smooth` on top
 * makes the two animations fight (the browser glides, re-targets, then snaps
 * again), which is exactly the stutter this replaces. So a wheel gesture is
 * animated here on one 720ms ease, with CSS snapping switched off for the
 * duration so nothing competes with it, and switched straight back on after.
 *
 * Everything degrades: no JavaScript, a short viewport, a narrow viewport or
 * `prefers-reduced-motion` and the page is CSS-only again.
 */
export function SlideDeck() {
  useEffect(() => {
    const root = document.documentElement;
    const deck = window.matchMedia(DECK_QUERY);
    const calm = window.matchMedia(CALM_QUERY);

    const sections = () =>
      Array.from(document.querySelectorAll<HTMLElement>(SECTION_SELECTOR));

    const active = () => deck.matches && !calm.matches;

    /** Where the top of a section rests once it is the current screen. */
    const restOf = (section: HTMLElement) => {
      const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
      return Math.round(section.offsetTop - pad);
    };

    const indexAt = (y: number) => {
      const all = sections();
      let index = 0;
      for (let i = 0; i < all.length; i += 1) {
        if (restOf(all[i]) <= y + 4) index = i;
      }
      return index;
    };

    let frame = 0;
    let animating = false;
    let lastWheel = 0;

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      animating = false;
      root.style.scrollSnapType = '';
    };

    const glideTo = (target: number) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const to = Math.max(0, Math.min(Math.round(target), max));
      const from = window.scrollY;
      if (Math.abs(to - from) < 2) return;

      if (frame) cancelAnimationFrame(frame);
      // The browser must not re-snap while we are driving the scroll ourselves.
      root.style.scrollSnapType = 'none';
      animating = true;

      const started = performance.now();
      const step = (now: number) => {
        // A tab hidden mid-glide stops receiving frames; when it comes back the
        // elapsed time finishes the move in one step rather than crawling.
        const t = Math.min(1, (now - started) / DURATION);
        window.scrollTo(0, from + (to - from) * easeInOutCubic(t));

        if (t < 1) {
          frame = requestAnimationFrame(step);
          return;
        }

        frame = 0;
        animating = false;
        // one frame of grace: restoring snap on the same tick can re-trigger it
        requestAnimationFrame(() => {
          root.style.scrollSnapType = '';
        });
      };

      frame = requestAnimationFrame(step);
    };

    const goTo = (index: number) => {
      const all = sections();
      const clamped = Math.max(0, Math.min(index, all.length - 1));
      glideTo(restOf(all[clamped]));
    };

    // --- wheel ---------------------------------------------------------------
    // A section taller than the screen keeps native scrolling until its edge is
    // reached; only then does a gesture move to the next screen.
    const onWheel = (event: WheelEvent) => {
      if (!active() || event.ctrlKey) return;

      if (animating) {
        event.preventDefault();
        lastWheel = performance.now();
        return;
      }

      const delta = event.deltaY;
      if (Math.abs(delta) < 4) return;

      const all = sections();
      const index = indexAt(window.scrollY);
      const section = all[index];
      if (!section) return;

      const top = restOf(section);
      const bottom = top + section.offsetHeight;
      const viewportBottom = window.scrollY + window.innerHeight;

      if (delta > 0 && viewportBottom < bottom - 2) return; // room left below
      if (delta < 0 && window.scrollY > top + 2) return; // room left above

      event.preventDefault();

      const now = performance.now();
      const gap = now - lastWheel;
      lastWheel = now;

      if (gap < GESTURE_GAP) return; // the momentum tail of the last swipe

      goTo(index + (delta > 0 ? 1 : -1));
    };

    // --- keyboard ------------------------------------------------------------
    const onKeyDown = (event: KeyboardEvent) => {
      if (!active() || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      const index = indexAt(window.scrollY);

      if (event.key === 'PageDown') {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(sections().length - 1);
      }
    };

    // --- in-page anchors (the dot rail, the scroll cue) ----------------------
    const onClick = (event: MouseEvent) => {
      if (!active() || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const id = decodeURIComponent(anchor.hash.slice(1));
      const section = id ? document.getElementById(id) : null;
      if (!section || !section.matches(SECTION_SELECTOR)) return;

      event.preventDefault();
      glideTo(restOf(section));
      // keep the address bar in step without letting it jump the scroll
      history.replaceState(null, '', anchor.hash);
    };

    // A real user scroll (touch, scrollbar drag, trackpad on a section that is
    // still scrolling internally) cancels ours rather than fighting it.
    const onPointerDown = () => {
      if (animating) stop();
    };

    // A hidden tab stops firing frames. Leaving snapping switched off behind us
    // would strand the page between two screens, so hand it back immediately.
    const onVisibility = () => {
      if (document.hidden && animating) stop();
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // --- current screen --------------------------------------------------------
  // `documentElement[data-screen]` is what the backdrop's lights key off, so the
  // background re-places itself as the deck advances.
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(SECTION_SELECTOR),
    );
    if (sections.length === 0) return;

    const root = document.documentElement;

    const observer = new IntersectionObserver(
      (entries) => {
        const front = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (front) root.dataset.screen = front.target.id;
      },
      { threshold: [0.3, 0.55, 0.8] },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      delete root.dataset.screen;
    };
  }, []);

  // --- reveals ---------------------------------------------------------------
  // Sections already on screen at hydration are marked instantly, so nothing
  // that the reader can see ever flashes; the rest animate as they arrive.
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(SECTION_SELECTOR),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.state = 'in';
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    );

    sections.forEach((section) => {
      const box = section.getBoundingClientRect();
      const onScreen = box.top < window.innerHeight && box.bottom > 0;

      if (onScreen) {
        section.dataset.state = 'in';
        return;
      }

      section.dataset.state = 'out';
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
