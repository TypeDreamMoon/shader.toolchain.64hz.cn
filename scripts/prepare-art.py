"""Prepare the homepage art from the plugin's own images.

`Plugins/DreamShader/Images/character.png` is an RGBA source cut out of a green
screen, with an empty margin. This crops it to the alpha bounding box and writes two
WebP widths for the hero's `srcset`: 480 and the source's own width, never upscaled.

The key left the screen's green in the colour of every semi-transparent edge pixel —
three in four of them — which reads as a green rim on the site's dark surfaces.
`despill` takes it back out: it solves each edge pixel for the foreground that,
mixed with the screen at that alpha, gives the stored colour, then clamps any green
left above red and blue.

The resize happens on **premultiplied** colour. The source's transparent pixels still
carry the screen's green, and a plain RGBA downscale averages it into the edge
pixels — the classic halo. Premultiplying, scaling, then un-premultiplying keeps the
silhouette clean, and the transparent margin is re-bled with the nearest opaque
colour first, so a browser's own scaling cannot reintroduce one either.

    python scripts/prepare-art.py --plugin <path to Plugins/DreamShader>
"""

import argparse
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
DEFAULT_PLUGIN = r"I:\UnrealProject_Moon\DEV_58\DevTest\Plugins\DreamShader"
OUT = os.path.join(SITE, "public", "art")

WIDTHS = [480, None]  # None: the cropped source's own width
QUALITY = 80


def despill(image):
    """Remove the green screen from the colour of semi-transparent pixels."""
    data = np.asarray(image, dtype=np.float32)
    rgb, alpha = data[..., :3], data[..., 3] / 255.0
    clear = alpha <= 0.02

    # The screen's own colour: the median of what the fully keyed pixels still carry.
    screen = np.median(rgb[clear & (rgb[..., 1] > 120)], axis=0)

    edge = (alpha > 0.02) & (alpha < 0.98)
    a = alpha[edge][:, None]
    unmixed = (rgb[edge] - (1.0 - a) * screen) / a
    rgb[edge] = np.clip(unmixed, 0, 255)

    # Whatever green survives the unmixing (alpha is quantised) is clamped, as a keyer's
    # spill suppressor does. Opaque pixels are left alone: the hair clip is meant to be green.
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    limit = np.maximum(r, b)
    g[edge] = np.minimum(g[edge], limit[edge])

    out = np.concatenate([rgb, data[..., 3:4]], axis=-1)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def premultiplied_resize(image, size):
    """Downscale RGBA without letting transparent colour bleed into the silhouette."""
    data = np.asarray(image, dtype=np.float32)
    alpha = data[..., 3:4] / 255.0

    premultiplied = np.concatenate([data[..., :3] * alpha, data[..., 3:4]], axis=-1)
    scaled = np.asarray(
        Image.fromarray(np.clip(premultiplied, 0, 255).astype(np.uint8), "RGBA").resize(
            size, Image.LANCZOS
        ),
        dtype=np.float32,
    )

    scaled_alpha = np.maximum(scaled[..., 3:4] / 255.0, 1e-4)
    colour = np.clip(scaled[..., :3] / scaled_alpha, 0, 255)

    out = np.concatenate([colour, scaled[..., 3:4]], axis=-1)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def bleed_edges(image, passes=6):
    """Push opaque colour outward into the transparent margin."""
    r, g, b, a = image.split()
    colour = Image.merge("RGB", (r, g, b))
    mask = a.point(lambda v: 255 if v > 8 else 0)

    for _ in range(passes):
        blurred = colour.filter(ImageFilter.GaussianBlur(2))
        colour = Image.composite(colour, blurred, mask)
        mask = mask.filter(ImageFilter.MaxFilter(5))

    return Image.merge("RGBA", (*colour.split(), a))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--plugin", default=os.environ.get("DREAMGUI_PLUGIN", DEFAULT_PLUGIN)
    )
    args = parser.parse_args()

    source = os.path.join(args.plugin, "Images", "character.png")
    if not os.path.exists(source):
        raise SystemExit("no character.png under %s" % args.plugin)

    os.makedirs(OUT, exist_ok=True)

    image = Image.open(source).convert("RGBA")

    # Floor the near-transparent tail so getbbox() finds the margin and no faint ghost of
    # the screen's green reaches the exported file.
    alpha = image.getchannel("A").point(lambda v: 0 if v <= 6 else v)
    image.putalpha(alpha)

    image = despill(image)

    box = alpha.getbbox()
    image = image.crop(box)
    print("cropped to %dx%d from %s" % (image.size[0], image.size[1], box))

    image = bleed_edges(image)

    for width in WIDTHS:
        width = min(width or image.size[0], image.size[0])
        height = round(image.size[1] * width / image.size[0])
        resized = premultiplied_resize(image, (width, height))
        path = os.path.join(OUT, "character-%d.webp" % width)
        resized.save(path, "WEBP", quality=QUALITY, method=6)
        print(
            "%s  %dx%d  %.0f KB"
            % (os.path.basename(path), width, height, os.path.getsize(path) / 1024)
        )


if __name__ == "__main__":
    main()
