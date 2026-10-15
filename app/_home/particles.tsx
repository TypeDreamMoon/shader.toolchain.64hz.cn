'use client';

import { useEffect, useRef } from 'react';

const COUNT = 90;
const MAX_DPR = 2;

type Mote = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  sway: number;
  phase: number;
  alpha: number;
  tint: number;
};

/**
 * A slow drift of motes behind the hero.
 *
 * A page about a particle language should have particles on it, but they are
 * furniture, not content: `aria-hidden`, pointer-transparent, and cheap enough
 * to be invisible in a profile — 64 motes, one canvas, no per-frame allocation.
 *
 * It stops itself whenever it cannot be seen: the tab is hidden, the hero has
 * scrolled away, or the reader asked for less motion (in which case a single
 * frame is drawn and left, so the composition still reads).
 */
export function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let running = false;
    let onScreen = true;

    const motes: Mote[] = Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: 0.5 + Math.random() * 1.25,
      speed: 0.06 + Math.random() * 0.16,
      sway: 6 + Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.1 + Math.random() * 0.3,
      tint: Math.random(),
    }));

    /** Read the palette off the element so the motes follow the theme. */
    let flux = '124, 77, 255';
    let cyan = '41, 199, 232';
    let spark = '255, 138, 61';

    const toRgb = (value: string): string | null => {
      const hex = value.trim();
      if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
      return [1, 3, 5]
        .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))
        .join(', ');
    };

    const readPalette = () => {
      const style = getComputedStyle(document.documentElement);
      flux = toRgb(style.getPropertyValue('--dream-miku')) ?? flux;
      cyan = toRgb(style.getPropertyValue('--dream-cyan')) ?? cyan;
      spark = toRgb(style.getPropertyValue('--dream-spark')) ?? spark;
    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const dark = document.documentElement.classList.contains('dark');
      context.globalCompositeOperation = dark ? 'lighter' : 'source-over';

      for (const mote of motes) {
        const drift = ((time * 0.001 * mote.speed) % 1.2) - 0.1;
        const y = ((mote.y - drift) % 1.2 + 1.2) % 1.2;
        const x = mote.x * width + Math.sin(time * 0.0004 + mote.phase) * mote.sway;
        const py = y * height;

        const rgb = mote.tint < 0.62 ? flux : mote.tint < 0.9 ? cyan : spark;
        const alpha = mote.alpha * (dark ? 1 : 0.5);
        const halo = mote.radius * 3.2;

        // a soft halo with a small bright core: a mote, not a bokeh circle
        const glow = context.createRadialGradient(x, py, 0, x, py, halo);
        glow.addColorStop(0, `rgba(${rgb}, ${alpha})`);
        glow.addColorStop(1, `rgba(${rgb}, 0)`);

        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, py, halo, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `rgba(${rgb}, ${Math.min(1, alpha * 1.8)})`;
        context.beginPath();
        context.arc(x, py, mote.radius * 0.55, 0, Math.PI * 2);
        context.fill();
      }

      context.globalCompositeOperation = 'source-over';
    };

    const tick = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || calm.matches || !onScreen || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const pause = () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    readPalette();
    resize();
    draw(0);
    start();

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else pause();
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    const onResize = () => {
      resize();
      draw(performance.now());
    };

    const onVisibility = () => {
      if (document.hidden) pause();
      else start();
    };

    // next-themes swaps a class on <html>; the motes follow it.
    const themeWatcher = new MutationObserver(() => {
      readPalette();
      if (!running) draw(performance.now());
    });
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    const onCalmChange = () => {
      if (calm.matches) {
        pause();
        draw(performance.now());
      } else {
        start();
      }
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    calm.addEventListener('change', onCalmChange);

    return () => {
      pause();
      observer.disconnect();
      themeWatcher.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      calm.removeEventListener('change', onCalmChange);
    };
  }, []);

  return <canvas aria-hidden="true" className="ds-motes" ref={canvasRef} />;
}
