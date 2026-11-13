"""Pre-generated WebP variants of every image stored on R2 (#761).

Each original gets one WebP file per width in VARIANT_WIDTHS, stored next to
it, so the site serves fixed files instead of paying Cloudflare to resize on
demand. The frontend loader (frontend/src/utils/r2ImageLoader.ts) and the MCP
server build the same key, so the widths and naming must stay in step with
them.
"""

from io import BytesIO
from pathlib import PurePosixPath

from PIL import Image as PILImage
from PIL import ImageOps

VARIANT_WIDTHS: tuple[int, ...] = (320, 640, 1200)
WEBP_QUALITY = 75
VARIANT_CONTENT_TYPE = "image/webp"
# Variants never change once written (a new photo gets a new key)
VARIANT_CACHE_CONTROL = "public, max-age=31536000, immutable"


def variant_key(original_key: str, width: int) -> str:
    """rescue_dogs/org/rex_ab12cd34.jpg -> rescue_dogs/org/rex_ab12cd34_w640.webp"""
    path = PurePosixPath(original_key)
    return str(path.with_name(f"{path.stem}_w{width}.webp"))


def nearest_variant_width(requested: int) -> int:
    """The smallest variant at least as wide as requested, else the widest."""
    return next((w for w in VARIANT_WIDTHS if w >= requested), VARIANT_WIDTHS[-1])


def make_variants(image_bytes: bytes) -> dict[int, bytes]:
    """Encode one WebP per variant width. Never upscales: a narrower original
    is stored at its own size under every larger width's key, so every key
    the frontend can ask for exists."""
    with PILImage.open(BytesIO(image_bytes)) as source:
        img = ImageOps.exif_transpose(source)
        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        img = img.convert("RGBA" if has_alpha else "RGB")

        variants: dict[int, bytes] = {}
        for width in VARIANT_WIDTHS:
            resized = img
            if img.width > width:
                height = max(1, round(img.height * width / img.width))
                resized = img.resize((width, height), PILImage.Resampling.LANCZOS)
            out = BytesIO()
            resized.save(out, format="WEBP", quality=WEBP_QUALITY, method=4)
            variants[width] = out.getvalue()
        return variants
