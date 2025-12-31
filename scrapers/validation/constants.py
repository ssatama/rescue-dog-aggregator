"""Constants for animal data validation."""

import re

ERROR_PATTERNS = [
    "this site cant be reached",
    "site cant be reached",
    "site can t be reached",
    "connection failed",
    "page not found",
    "error 404",
    "error 500",
    "dns_probe_finished",
    "err_name_not_resolved",
    "err_connection",
    "timeout",
    "unavailable",
    "access denied",
]

GIFT_CARD_PATTERNS = [
    "gift card",
    "giftcard",
    "gift certificate",
    "voucher",
    "coupon",
    "promo code",
    "discount",
]

KNOWN_ORG_PREFIXES = [
    "arb-",
    "spbr-",
    "gds-",
    "mar-",
    "tud-",
    "wp-",
    "fri-",
    "pit-",
    "rean-",
    "hund-",
    "dt-",
    "mtr-",
    "tve-",
]

PRICE_PATTERN = re.compile(r"[$€£¥₹]\s*\d+|\d+\s*[$€£¥₹]")

SKU_PATTERN = re.compile(r"^[A-Z]{2,4}-?\d{3,}-?[A-Z]{2,4}$", re.IGNORECASE)

PROMO_KEYWORDS_PATTERN = re.compile(
    r"^(SAVE|GET|CODE|FREE|SALE|DEAL|BUY|WIN|DISCOUNT|OFF)\d+", re.IGNORECASE
)

MAX_DIGIT_RATIO = 0.6
MIN_NAME_LENGTH = 2
