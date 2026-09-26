"""Ages that keep up with time (#561). Pure; no I/O.

A dog's age is stored as the range of birth dates that fits what the rescue
said: its date of birth when it publishes one, otherwise the stated age taken
back from the day it was read (`age_observed_at`). `age_min_months` and
`age_max_months` are derived from that range, at save time here and after
every cron batch by REFRESH_AGES_SQL, so a "3 months" puppy first seen a year
ago is 15 months old now.

Month arithmetic matches PostgreSQL's age(): whole months, one fewer when the
later date's day is before the earlier date's day. REFRESH_AGES_SQL must give
the same numbers as ages_at (a database test checks it).
"""

import calendar
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any

# A birth date further back than this is a typo, not an old dog
MAX_AGE_YEARS = 25

_MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "mär": 3,
    "apr": 4,
    "may": 5,
    "mai": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "okt": 10,
    "nov": 11,
    "dec": 12,
    "dez": 12,
}
_MONTH_WORD = r"\b([a-zä]{3,9})"

_DAY_MONTH_YEAR = re.compile(r"(?<!\d)(\d{1,2})[./](\d{1,2})[./](\d{4})(?!\d)")
_MONTH_YEAR = re.compile(r"(?<![\d./])(\d{1,2})[./-](\d{4})(?!\d)")
_MONTH_TO_MONTH_YEAR = re.compile(_MONTH_WORD + r"\s*/\s*" + _MONTH_WORD + r"\s+(\d{4})(?!\d)")
_MONTH_NAME_YEAR = re.compile(_MONTH_WORD + r"\.?\s+(\d{4})(?!\d)")
_YEAR = re.compile(r"(?<![\d./])(\d{4})(?![\d./])")

BirthRange = tuple[date, date]


def today_utc() -> date:
    return datetime.now(UTC).date()


def _month_number(word: str) -> int | None:
    return _MONTHS.get(word[:3].lower())


def _month_end(year: int, month: int) -> date:
    return date(year, month, calendar.monthrange(year, month)[1])


def _checked(earliest: date, latest: date, today: date) -> BirthRange | None:
    """The range, or None when it can't be a living dog's birth date."""
    if earliest > today or earliest.year < today.year - MAX_AGE_YEARS or earliest > latest:
        return None
    return earliest, min(latest, today)


def parse_birth_date(text: str | None, today: date | None = None) -> BirthRange | None:
    """The earliest and latest birth date a rescue's date-of-birth text allows.

    Dates are day-first, as every rescue we scrape writes them: "03/10/2025"
    is 3 October. A month ("03.2025", "January 2022") spans that month, two
    months ("April/May 2024") span both, and a bare year spans the year.
    Surrounding words are ignored ("DOB: ", "(7 Jahre alt)"). Anything else,
    including an impossible or future date, is None.
    """
    if not text:
        return None
    today = today or today_utc()
    text = text.lower()

    try:
        if match := _DAY_MONTH_YEAR.search(text):
            day, month, year = (int(group) for group in match.groups())
            born = date(year, month, day)
            return _checked(born, born, today)

        if match := _MONTH_YEAR.search(text):
            month, year = int(match.group(1)), int(match.group(2))
            return _checked(date(year, month, 1), _month_end(year, month), today)

        if (match := _MONTH_TO_MONTH_YEAR.search(text)) and _month_number(match.group(1)) and _month_number(match.group(2)):
            first, last, year = _month_number(match.group(1)), _month_number(match.group(2)), int(match.group(3))
            if first <= last:
                return _checked(date(year, first, 1), _month_end(year, last), today)
            return None

        for match in _MONTH_NAME_YEAR.finditer(text):
            month = _month_number(match.group(1))
            if month:
                year = int(match.group(2))
                return _checked(date(year, month, 1), _month_end(year, month), today)

        if match := _YEAR.search(text):
            year = int(match.group(1))
            return _checked(date(year, 1, 1), date(year, 12, 31), today)
    except ValueError:
        # 31/02/2024, month 13
        return None
    return None


def months_between(earlier: date, later: date) -> int:
    """Whole months from one date to a later one, as PostgreSQL's age() counts them. Never negative."""
    months = (later.year - earlier.year) * 12 + later.month - earlier.month
    if later.day < earlier.day:
        months -= 1
    return max(months, 0)


def subtract_months(day: date, months: int) -> date:
    """The same day of the month `months` earlier, clamped to the month's last day."""
    total = day.year * 12 + day.month - 1 - months
    year, month = divmod(total, 12)
    return date(year, month + 1, min(day.day, calendar.monthrange(year, month + 1)[1]))


def birth_range_from_age(min_months: int | None, max_months: int | None, observed: date) -> tuple[date | None, date | None]:
    """The birth dates that make a dog min_months to max_months old on the day the age was read."""
    earliest = subtract_months(observed, max_months) if max_months is not None else None
    latest = subtract_months(observed, min_months) if min_months is not None else None
    return earliest, latest


def ages_at(birth_date_min: date | None, birth_date_max: date | None, today: date) -> tuple[int | None, int | None]:
    """(age_min_months, age_max_months) on `today` for a birth date in the range."""
    min_months = months_between(birth_date_max, today) if birth_date_max else None
    max_months = months_between(birth_date_min, today) if birth_date_min else None
    return min_months, max_months


@dataclass(frozen=True)
class Age:
    """The age columns a save writes."""

    birth_date_min: date | None
    birth_date_max: date | None
    age_observed_at: date | None
    age_min_months: int | None
    age_max_months: int | None


def _as_date(value: Any) -> date | None:
    """A DATE column as read back: a date, a datetime, or ISO text from the admin query API."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _as_int(value: Any) -> int | None:
    return None if value is None or value == "" else int(value)


def resolve_age(
    *,
    date_of_birth: str | None,
    age_text: str | None,
    min_months: int | None,
    max_months: int | None,
    today: date,
    stored: dict[str, Any] | None = None,
) -> Age:
    """What to store for a scraped dog's age.

    date_of_birth: the rescue's date-of-birth text, when it publishes one.
    min_months, max_months: the stated age parsed from age_text.
    stored: the saved row (age_text, age_min_months, age_max_months,
        birth_date_min, birth_date_max, age_observed_at, created_at) when the
        dog is already in the database.

    A date of birth wins. Otherwise a new or changed age is anchored to today.
    An unchanged age_text keeps its anchor: a site that still says "3 months"
    a year later hasn't re-aged the dog. Rows stored before #561 have no
    anchor, and their age was read when the dog was first seen (every org
    skips existing dogs), so created_at stands in.
    """
    stored = stored or {}
    stored_range = (_as_date(stored.get("birth_date_min")), _as_date(stored.get("birth_date_max")))
    stored_observed = _as_date(stored.get("age_observed_at"))

    born = parse_birth_date(date_of_birth, today)
    if born:
        observed = stored_observed if born == stored_range and stored_observed else today
        return Age(born[0], born[1], observed, *ages_at(born[0], born[1], today))

    if stored and stored.get("age_text") == age_text:
        if any(stored_range) and stored_observed:
            return Age(stored_range[0], stored_range[1], stored_observed, *ages_at(*stored_range, today))
        first_seen = _as_date(stored.get("created_at"))
        stored_min, stored_max = _as_int(stored.get("age_min_months")), _as_int(stored.get("age_max_months"))
        if first_seen and (stored_min is not None or stored_max is not None):
            earliest, latest = birth_range_from_age(stored_min, stored_max, first_seen)
            return Age(earliest, latest, first_seen, *ages_at(earliest, latest, today))

    if min_months is None and max_months is None:
        return Age(None, None, None, None, None)

    earliest, latest = birth_range_from_age(min_months, max_months, today)
    return Age(earliest, latest, today, *ages_at(earliest, latest, today))


TODAY_SQL = "(now() AT TIME ZONE 'UTC')::date"


def months_sql(column: str, today: str = TODAY_SQL) -> str:
    """months_between(column, today) in SQL."""
    return f"CASE WHEN {column} IS NULL THEN NULL ELSE GREATEST(0, (extract(year FROM age({today}, {column})) * 12 + extract(month FROM age({today}, {column})))::int) END"


# Brings every dog's derived months up to date. Run after each cron batch;
# touches only rows whose months changed, and never updated_at.
REFRESH_AGES_SQL = f"""
    WITH derived AS (
        SELECT id, {months_sql("birth_date_max")} AS min_months, {months_sql("birth_date_min")} AS max_months
        FROM animals
        WHERE birth_date_min IS NOT NULL OR birth_date_max IS NOT NULL
    )
    UPDATE animals a
    SET age_min_months = d.min_months, age_max_months = d.max_months
    FROM derived d
    WHERE a.id = d.id
      AND (a.age_min_months IS DISTINCT FROM d.min_months OR a.age_max_months IS DISTINCT FROM d.max_months)
"""
