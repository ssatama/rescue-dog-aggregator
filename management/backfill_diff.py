"""Compare what a scrape would write with what is stored. Pure; no I/O.

Used by `backfill_commands.py plan`. The scraped side comes from
services.database_service.update_columns, the same values update_animal
writes, so the diff shows what a forced re-scrape would change.
"""

import json
from decimal import Decimal
from typing import Any

EXAMPLES_PER_FIELD = 5

# Columns compared directly: the ones update_animal checks for a change, so a
# listed difference is one a re-scrape writes. It never checks size or
# breed_group, which change only alongside another column (noted on #568).
# Images are left out: a dry run does not upload,
# so primary_image_url would always differ. The scraped image source is
# compared with the stored original_image_url instead ("image_source").
COLUMNS = (
    "name",
    "breed",
    "breed_raw",
    "standardized_breed",
    "age_text",
    "age_min_months",
    "age_max_months",
    "sex",
    "status",
    "standardized_size",
    "breed_type",
    "primary_breed",
    "secondary_breed",
    "breed_slug",
    "breed_confidence",
)
NUMERIC_COLUMNS = {"age_min_months", "age_max_months", "breed_confidence"}

# properties keys that carry the rescue's free text. The profile prompt reads
# all properties, but these are what a scraper fix changes and what the
# profile is built from. #568 collapses them into one key.
PROFILE_TEXT_KEYS = (
    "description",
    "raw_description",
    "german_description",
    "Beschreibung",
    "page_text_excerpt",
    "raw_bullet_points",
    "raw_text",
    "raw_qa_data",
    "diary_entries",
)


def _properties(value: Any) -> dict[str, Any]:
    if not value:
        return {}
    if isinstance(value, str):
        return json.loads(value)
    return dict(value)


def _norm(column: str, value: Any) -> Any:
    """Make a stored value and a scraped value comparable (the API returns numbers as text)."""
    if value is None or value == "":
        return None
    if column in NUMERIC_COLUMNS or isinstance(value, Decimal):
        try:
            return float(value)
        except (TypeError, ValueError):
            return value
    return value


def dog_changes(scraped: dict[str, Any], stored: dict[str, Any]) -> dict[str, tuple[Any, Any]]:
    """Fields that differ, as {field: (stored, scraped)}. properties are compared per key."""
    changes: dict[str, tuple[Any, Any]] = {}
    for column in COLUMNS:
        was, now = _norm(column, stored.get(column)), _norm(column, scraped.get(column))
        if was != now:
            changes[column] = (stored.get(column), scraped.get(column))

    if _norm("", stored.get("original_image_url")) != _norm("", scraped.get("image_source")):
        changes["image_source"] = (stored.get("original_image_url"), scraped.get("image_source"))

    was_props, now_props = _properties(stored.get("properties")), _properties(scraped.get("properties"))
    for key in sorted(set(was_props) | set(now_props)):
        if was_props.get(key) != now_props.get(key):
            changes[f"properties.{key}"] = (was_props.get(key), now_props.get(key))
    return changes


def needs_reprofile(changes: dict[str, tuple[Any, Any]]) -> bool:
    return any(f"properties.{key}" in changes for key in PROFILE_TEXT_KEYS)


def build_plan(org: str, scraped: list[dict[str, Any]], rejected: list[dict[str, str]], stored: list[dict[str, Any]]) -> dict[str, Any]:
    """The diff for one organization.

    scraped: dicts from update_columns plus external_id and image_source.
    rejected: {"external_id", "reason"} for dogs the validator refused.
    stored: production rows for the org's available dogs and every scraped external_id.
    """
    by_id = {row["external_id"]: row for row in stored}
    scraped_ids = {dog["external_id"] for dog in scraped}
    rejected_ids = {dog["external_id"] for dog in rejected}

    fields: dict[str, dict[str, Any]] = {}
    per_dog: dict[str, dict[str, list[Any]]] = {}
    reprofile: list[int] = []
    matched = 0
    for dog in scraped:
        row = by_id.get(dog["external_id"])
        if row is None:
            continue
        matched += 1
        changes = dog_changes(dog, row)
        if not changes:
            continue
        per_dog[dog["external_id"]] = {field: [was, now] for field, (was, now) in changes.items()}
        if needs_reprofile(changes):
            reprofile.append(row["id"])
        for field, (was, now) in changes.items():
            entry = fields.setdefault(field, {"changed": 0, "examples": []})
            entry["changed"] += 1
            if len(entry["examples"]) < EXAMPLES_PER_FIELD:
                entry["examples"].append({"external_id": dog["external_id"], "was": was, "now": now})

    stored_available = [row for row in stored if row.get("status") == "available" and row.get("active")]
    return {
        "organization": org,
        "scraped": len(scraped),
        "matched": matched,
        "stored_available": len(stored_available),
        "rejected": rejected,
        "new_on_site": sorted(scraped_ids - set(by_id)),
        "missing_from_site": sorted(row["external_id"] for row in stored_available if row["external_id"] not in scraped_ids | rejected_ids),
        "fields": dict(sorted(fields.items(), key=lambda item: -item[1]["changed"])),
        "reprofile_ids": sorted(reprofile),
        "changes": per_dog,
    }


def _short(value: Any, width: int = 60) -> str:
    text = json.dumps(value, ensure_ascii=False, default=str) if not isinstance(value, str) else value
    text = text.replace("\n", " ").replace("|", "\\|")
    return text if len(text) <= width else text[: width - 1] + "…"


def render_markdown(plan: dict[str, Any], step_changes: dict[str, list[Any]] | None = None) -> str:
    """The plan as markdown, for pasting into a PR."""
    lines = [f"### Backfill plan: `{plan['organization']}`", ""]
    lines.append(f"Scraped **{plan['scraped']}** (matched {plan['matched']} stored rows); **{plan['stored_available']}** available in production.")
    lines.append("")
    if plan["rejected"]:
        rejected = ", ".join(f"`{dog['external_id']}` ({dog['reason']})" for dog in plan["rejected"])
        lines.append(f"- Rejected by validation: {len(plan['rejected'])}: {rejected}")
    lines.append(f"- On the site, not stored: {len(plan['new_on_site'])}" + (f": {', '.join(plan['new_on_site'][:20])}" if plan["new_on_site"] else ""))
    lines.append(f"- Available in production, not on the site: {len(plan['missing_from_site'])}" + (f": {', '.join(plan['missing_from_site'][:20])}" if plan["missing_from_site"] else ""))
    lines.append(f"- Profile text would change (re-profile): {len(plan['reprofile_ids'])}")
    lines.append("")

    if not plan["fields"]:
        lines.append("No stored field would change.")
    else:
        lines += ["| field | changed | example (was → now) |", "| --- | ---: | --- |"]
        for field, entry in plan["fields"].items():
            first = entry["examples"][0]
            lines.append(f"| `{field}` | {entry['changed']} / {plan['matched']} | `{first['external_id']}`: {_short(first['was'])} → {_short(first['now'])} |")
        lines.append("")
        lines.append("<details><summary>Examples</summary>")
        lines.append("")
        for field, entry in plan["fields"].items():
            lines.append(f"**{field}**")
            for example in entry["examples"]:
                lines.append(f"- `{example['external_id']}`: {_short(example['was'], 120)} → {_short(example['now'], 120)}")
            lines.append("")
        lines.append("</details>")

    for name, changes in (step_changes or {}).items():
        lines += ["", f"#### Step `{name}`: {len(changes)} rows"]
        for change in changes[:EXAMPLES_PER_FIELD]:
            lines.append(f"- animal {change.animal_id} `{change.column}`: {_short(change.was)} → {_short(change.now)}")
    return "\n".join(lines) + "\n"
