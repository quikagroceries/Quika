"""Phone number normalization.

The same real number can arrive as local Nigerian format (0812...) or
international (+234812...), and cosmetic differences (missing '+', stray
spaces/dashes) are easy to introduce by hand. User identity is looked up by
exact phone string (see auth.service.get_or_create_user), so without
normalizing to one canonical form first, typing the "same" number slightly
differently silently forks a brand-new account instead of matching the
existing one.
"""

import re


def normalize_phone(phone: str) -> str:
    cleaned = re.sub(r"[\s\-()]", "", phone)
    if cleaned.startswith("0"):
        return "+234" + cleaned[1:]
    if not cleaned.startswith("+"):
        return "+" + cleaned
    return cleaned
