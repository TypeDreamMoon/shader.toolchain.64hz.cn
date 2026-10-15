/**
 * The DreamShader mascot, as the hero's art column.
 *
 * The source PNG (`Plugins/DreamShader/Images/character.png`) is a green-screen cutout
 * with an alpha channel, so the figure and the DreamShader pillar she leans on stand
 * on their own. The halo and the floor glow below are the page's own, so she sits in
 * the site's light rather than in the render's.
 *
 * `scripts/prepare-art.py` writes the two WebP widths this points at, with the
 * screen's green taken out of the edges.
 */
export function Character({ alt, caption }: { alt: string; caption: string }) {
  return (
    <div className="ds-art">
      <div className="ds-art-stage">
        <span className="ds-art-halo" aria-hidden="true" />
        <span className="ds-art-ring" aria-hidden="true" />

        <img
          alt={alt}
          className="ds-art-figure"
          decoding="async"
          fetchPriority="high"
          height={1249}
          sizes="(max-width: 960px) 52vw, 28vw"
          src="/art/character-753.webp"
          srcSet="/art/character-480.webp 480w, /art/character-753.webp 753w"
          width={753}
        />

        <span className="ds-art-plinth" aria-hidden="true" />
      </div>

      <p className="ds-art-plaque">{caption}</p>
    </div>
  );
}
