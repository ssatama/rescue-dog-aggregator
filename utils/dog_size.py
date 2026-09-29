"""One shoulder-height scale for every rescue that gives a dog's height (#631).

Tierschutzverein Europa split at 35/55 cm and Daisy Family Rescue at 40/60 cm
for the same question; 40/60 is the common split.
"""

SMALL_BELOW_CM = 40
LARGE_FROM_CM = 60


def size_from_height_cm(height_cm: float) -> str | None:
    """Small below 40 cm, Medium below 60 cm, Large from 60 cm; None for no height."""
    if height_cm <= 0:
        return None
    if height_cm < SMALL_BELOW_CM:
        return "Small"
    return "Medium" if height_cm < LARGE_FROM_CM else "Large"
