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

from utils.standardization import parse_age_text

# A birth date further back than this is a typo, not an old dog
MAX_AGE_YEARS = 25

# Spelled out: calendar.month_name follows the locale
_ENGLISH_MONTHS = "january february march april may june july august september october november december".split()
_MONTHS = {
    **{name: number for number, name in enumerate(_ENGLISH_MONTHS, 1)},
    **{name[:3]: number for number, name in enumerate(_ENGLISH_MONTHS, 1)},
    "sept": 9,
    # German, for Tierschutzverein and Daisy
    "januar": 1,
    "februar": 2,
    "märz": 3,
    "mär": 3,
    "mai": 5,
    "juni": 6,
    "juli": 7,
    "oktober": 10,
    "okt": 10,
    "dezember": 12,
    "dez": 12,
}
_MONTH_WORD = r"\b([a-zä]+)"

# In order of precedence when two start at the same place
_DAY_MONTH_YEAR = re.compile(r"(?<!\d)(\d{1,2})[./](\d{1,2})[./](\d{4})(?!\d)")
_MONTH_TO_MONTH_YEAR = re.compile(_MONTH_WORD + r"\s*/\s*" + _MONTH_WORD + r"\s+(\d{4})(?!\d)")
_MONTH_YEAR = re.compile(r"(?<![\d./])(\d{1,2})[./-](\d{4})(?!\d)")
_MONTH_NAME_YEAR = re.compile(_MONTH_WORD + r"\.?\s+(\d{4})(?!\d)")
_YEAR_TO_YEAR = re.compile(r"(?<![\d./])(\d{4})\s*[-–/]\s*(\d{4})(?!\d|[./]\d)")
# A full stop may end the sentence ("DOB 2022."), but not start a date ("2022.05")
_YEAR = re.compile(r"(?<![\d./])(\d{4})(?!\d|[./]\d)")

# Age text that is a birth date: it says so, or it is nothing but a date
_AGE_TEXT_DOB_LABEL = re.compile(r"\b(dob|born|birth\w*|geburt\w*)\b", re.IGNORECASE)
_DATE_ONLY = re.compile(r"[\d\s./-]+")

BirthRange = tuple[date, date]


def today_utc() -> date:
    return datetime.now(UTC).date()


def _month_number(word: str) -> int | None:
    return _MONTHS.get(word.lower())


def _month_end(year: int, month: int) -> date:
    return date(year, month, calendar.monthrange(year, month)[1])


def _checked(earliest: date, latest: date, today: date) -> BirthRange | None:
    """The range, or None when it can't be a living dog's birth date."""
    if earliest > today or earliest.year < today.year - MAX_AGE_YEARS or earliest > latest:
        return None
    # A birth month that isn't over yet keeps its month end: capping at today
    # would store a different range every day
    return earliest, latest


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

    # Every date-like match; the one written first is the birth date
    # ("DOB 2019, arrived March 2023" is 2019).
    candidates = []
    for rank, pattern in enumerate((_DAY_MONTH_YEAR, _MONTH_TO_MONTH_YEAR, _MONTH_YEAR, _YEAR_TO_YEAR, _MONTH_NAME_YEAR, _YEAR)):
        for match in pattern.finditer(text):
            if pattern in (_MONTH_TO_MONTH_YEAR, _MONTH_NAME_YEAR) and not all(_month_number(word) for word in match.groups()[:-1]):
                continue
            candidates.append((match.start(), rank, pattern, match))
    if not candidates:
        return None
    _, _, pattern, match = min(candidates, key=lambda candidate: candidate[:2])

    try:
        if pattern is _DAY_MONTH_YEAR:
            day, month, year = (int(group) for group in match.groups())
            return _checked(date(year, month, day), date(year, month, day), today)
        if pattern is _MONTH_TO_MONTH_YEAR:
            first, last, year = _month_number(match.group(1)), _month_number(match.group(2)), int(match.group(3))
            if first <= last:
                return _checked(date(year, first, 1), _month_end(year, last), today)
            # "Dec/Jan 2024" wraps the year: December 2023 or January 2024. A long
            # wrap ("June/April") is more likely a typo than an 11-month guess.
            if 12 - first + last > 2:
                return None
            return _checked(date(year - 1, first, 1), _month_end(year, last), today)
        if pattern is _MONTH_YEAR:
            month, year = int(match.group(1)), int(match.group(2))
            return _checked(date(year, month, 1), _month_end(year, month), today)
        if pattern is _YEAR_TO_YEAR:
            first, last = int(match.group(1)), int(match.group(2))
            return _checked(date(first, 1, 1), date(last, 12, 31), today)
        if pattern is _MONTH_NAME_YEAR:
            month, year = _month_number(match.group(1)), int(match.group(2))
            return _checked(date(year, month, 1), _month_end(year, month), today)
        year = int(match.group(1))
        return _checked(date(year, 1, 1), date(year, 12, 31), today)
    except ValueError:
        # 31/02/2024, month 13
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


def as_date(value: Any) -> date | None:
    """A DATE column as read back: a date, a datetime, or ISO text from the admin query API."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def as_int(value: Any) -> int | None:
    return None if value is None or value == "" else int(value)


def _is_date_only(text: str | None) -> bool:
    return bool(text and _DATE_ONLY.fullmatch(text.strip()))


def age_text_is_a_birth_date(age_text: str | None) -> bool:
    """Some rescues write the date of birth as the age: "02/2024", "Puppy (estimated DOB 01.03.2026)".

    Other dates in age text ("2 years, arrived 03/2024") are not birth dates.
    """
    return _is_date_only(age_text) or bool(age_text and _AGE_TEXT_DOB_LABEL.search(age_text))


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
    stored: the saved row (age_text, birth_date_min, birth_date_max,
        age_observed_at, created_at) when the dog is already in the database.

    A date of birth wins, from date_of_birth or else age_text. Otherwise a new or changed age is read as of today.
    An unchanged age_text keeps the day it was first read: a site that still
    says "3 months" a year later hasn't re-aged the dog. The months are parsed
    afresh either way, so a parser fix still lands. Rows stored before #561
    have no age_observed_at, and their age was read when the dog was first
    seen (every org skips existing dogs), so created_at stands in.
    """
    stored = stored or {}
    stored_range = (as_date(stored.get("birth_date_min")), as_date(stored.get("birth_date_max")))
    stored_observed = as_date(stored.get("age_observed_at"))

    # Some rescues write the date of birth as the age ("02/2024", "Puppy
    # (estimated DOB 01.03.2026)"). parse_age_text turns those into months as of
    # today, which must not be anchored to an older day.
    born = parse_birth_date(date_of_birth, today) or (parse_birth_date(age_text, today) if age_text_is_a_birth_date(age_text) else None)
    if born:
        observed = stored_observed if born == stored_range and stored_observed else today
        return Age(born[0], born[1], observed, *ages_at(born[0], born[1], today))

    if min_months is None and max_months is None or _is_date_only(age_text):
        # A bare date that isn't a valid birth date ("07/20218") is no age, not
        # months parse_age_text counts from today
        return Age(None, None, None, None, None)

    observed = today
    if stored and stored.get("age_text") == age_text:
        observed = stored_observed or as_date(stored.get("created_at")) or today
    earliest, latest = birth_range_from_age(min_months, max_months, observed)
    return Age(earliest, latest, observed, *ages_at(earliest, latest, today))


def age_columns(animal_data: dict[str, Any], today: date | None = None, stored: dict[str, Any] | None = None) -> Age:
    """The age a save writes for a scraped dog: its months (precalculated or parsed from age_text), anchored."""
    if "age_min_months" in animal_data and "age_max_months" in animal_data:
        min_months, max_months = animal_data.get("age_min_months"), animal_data.get("age_max_months")
    else:
        _, min_months, max_months = parse_age_text(animal_data.get("age_text", ""))
    return resolve_age(
        date_of_birth=animal_data.get("date_of_birth"),
        age_text=animal_data.get("age_text"),
        min_months=as_int(min_months),
        max_months=as_int(max_months),
        today=today or today_utc(),
        stored=stored,
    )


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
