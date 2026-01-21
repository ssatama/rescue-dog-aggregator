"""
Image Processing Service for Blur Placeholder Generation

Generates tiny blurred base64-encoded placeholder images (LQIP - Low Quality Image Placeholders)
for improved perceived performance and reduced CLS (Cumulative Layout Shift).

Usage:
    from services.image_processing import generate_blur_data_url

    blur_url = await generate_blur_data_url("https://example.com/dog.jpg")
    # Returns: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
"""

import asyncio
import base64
import io
import logging

import aiohttp
from PIL import Image, ImageFilter

logger = logging.getLogger(__name__)

# Configuration
BLUR_WIDTH = 20
BLUR_HEIGHT = 15
BLUR_RADIUS = 10
BLUR_QUALITY = 50
REQUEST_TIMEOUT = 10  # seconds


async def generate_blur_data_url(image_url: str) -> str | None:
    """
    Generate a tiny blurred base64-encoded placeholder image.

    Process:
    1. Download original image
    2. Resize to 20x15 pixels (tiny!)
    3. Apply Gaussian blur (radius=10)
    4. Convert to base64 JPEG
    5. Return as data URL

    Args:
        image_url: URL of the image to process

    Returns:
        Base64 data URL string or None if processing fails

    Example:
        >>> await generate_blur_data_url("https://example.com/dog.jpg")
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...'
    """
    if not image_url or not image_url.strip():
        logger.warning("Empty image URL provided")
        return None

    try:
        # Download image with timeout
        async with aiohttp.ClientSession() as session:
            async with session.get(
                image_url,
                timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT),
                headers={"User-Agent": "RescueDogAggregator/1.0"},
            ) as response:
                if response.status != 200:
                    logger.warning(f"Failed to download image: {image_url} (status={response.status})")
                    return None

                image_data = await response.read()

        # Process in thread pool to avoid blocking
        blur_data_url = await asyncio.to_thread(_process_image_sync, image_data)

        return blur_data_url

    except TimeoutError:
        logger.warning(f"Timeout downloading image: {image_url}")
        return None
    except aiohttp.ClientError as e:
        logger.warning(f"Network error downloading image: {image_url} - {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error generating blur URL: {image_url} - {e}")
        return None


def _process_image_sync(image_data: bytes) -> str | None:
    """
    Synchronous image processing (runs in thread pool).

    Args:
        image_data: Raw image bytes

    Returns:
        Base64 data URL or None on error
    """
    try:
        # Open image
        img = Image.open(io.BytesIO(image_data))

        # Convert to RGB if necessary (handles PNG, etc.)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Resize to tiny dimensions (20x15)
        # Using LANCZOS for high-quality downsampling
        img = img.resize((BLUR_WIDTH, BLUR_HEIGHT), Image.Resampling.LANCZOS)

        # Apply Gaussian blur
        img = img.filter(ImageFilter.GaussianBlur(radius=BLUR_RADIUS))

        # Convert to base64 JPEG
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=BLUR_QUALITY, optimize=True)
        img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

        # Return as data URL
        return f"data:image/jpeg;base64,{img_str}"

    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return None


async def batch_generate_blur_urls(image_urls: list[str], max_concurrent: int = 5) -> dict[str, str | None]:
    """
    Generate blur data URLs for multiple images concurrently.

    Args:
        image_urls: List of image URLs to process
        max_concurrent: Maximum concurrent downloads (default: 5)

    Returns:
        Dictionary mapping URLs to blur data URLs (or None on failure)

    Example:
        >>> urls = ["https://example.com/dog1.jpg", "https://example.com/dog2.jpg"]
        >>> results = await batch_generate_blur_urls(urls)
        >>> results["https://example.com/dog1.jpg"]
        'data:image/jpeg;base64,/9j/4AAQ...'
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def process_with_limit(url: str) -> tuple[str, str | None]:
        async with semaphore:
            blur_url = await generate_blur_data_url(url)
            return (url, blur_url)

    # Process all URLs concurrently (with limit)
    tasks = [process_with_limit(url) for url in image_urls]
    results = await asyncio.gather(*tasks)

    return dict(results)


# Default blur placeholder for fallback
DEFAULT_BLUR_DATA_URL = (
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYI"
    "ChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoI"
    "ChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/"
    "wAARCAAKAA4DASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUI/8QAIhAAAgEEAQQDAAAAAAAA"
    "AAAAQIDAAQFERIGBxMhFBYy/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAL/xAAcEQACAQUBAAAAAAAAAAAA"
    "AAAAAQIDERIhMUH/2gAMAwEAAhEDEQA/AKQ6u686l2P3SYvFYDGQ2Nna2sIjWCBQqKOgA2fsk9zWWgDz"
    "Dr+v/9k="
)
