'use client';

import { useEffect, useState } from 'react';

export type Slide = readonly [id: string, label: string];

/**
 * The dot rail on the right of the full-page homepage.
 *
 * Each dot is an ordinary in-page anchor, so the page still works with JavaScript
 * off and with the keyboard — the observer only decides which dot is lit. Snapping
 * itself is CSS (`scroll-snap-type`), never a wheel handler: hijacking the wheel is
 * what makes most full-page sites unusable with a trackpad or a screen reader.
 */
export function SlideNav({ slides, label }: { slides: readonly Slide[]; label: string }) {
  const [active, setActive] = useState(slides[0]?.[0] ?? '');

  useEffect(() => {
    const sections = slides
      .map(([id]) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) setActive(visible.target.id);
      },
      { threshold: [0.35, 0.6, 0.9], rootMargin: '-10% 0px -10% 0px' },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [slides]);

  return (
    <nav aria-label={label} className="ds-rail">
      <ul>
        {slides.map(([id, text]) => (
          <li key={id}>
            <a
              aria-current={active === id ? 'true' : undefined}
              className="ds-rail-dot"
              href={`#${id}`}
            >
              <span className="ds-rail-label">{text}</span>
              <span aria-hidden="true" className="ds-rail-mark" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
