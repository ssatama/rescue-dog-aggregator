"""Vercel usage against the Hobby limits: the last 7 days scaled to 30 (#763).

rescuedogs.me and Berlin Sun Seeker share one Hobby account. Going over a limit
pauses the projects instead of billing them, so the weekly run flags anything
projected above 60% of a limit. Observability keeps only about 10 days, so a
month-to-date total isn't available; a 7-day rate is.

    uv run python scripts/vercel_hobby_usage.py            # table, exit 1 if any >60%
    uv run python scripts/vercel_hobby_usage.py --threshold 0.8

Needs the Vercel CLI, logged in to the team; a CLI error ends in a traceback.
The billing-cycle total is on the team dashboard's Usage tab. Limits are the Hobby included
usage as of November 2026; check https://vercel.com/docs/plans/hobby if Vercel
changes them.
"""

import argparse
import json
import subprocess
import sys

TEAM = "sampos-projects-3759789d"
PROJECTS = ("rescue-dog-aggregator", "berlin-sun-seeker", "berlin-classical")

# (label, metric, aggregation, divisor to the limit's unit, Hobby limit)
METRICS = (
    ("ISR writes (units)", "vercel.isr_operation.write_units", "sum", 1, 200_000),
    ("ISR reads (units)", "vercel.isr_operation.read_units", "sum", 1, 1_000_000),
    ("Active CPU (hours)", "vercel.function_invocation.function_cpu_time_ms", "sum", 3_600_000, 4),
    ("Fast Origin Transfer (GB)", "vercel.function_invocation.fot_total_bytes", "sum", 1e9, 10),
    ("Function invocations", "vercel.function_invocation.count", "count", 1, 1_000_000),
    ("CDN requests", "vercel.request.count", "count", 1, 1_000_000),
)


WINDOW_DAYS = 7
MONTH_DAYS = 30


def last_week(metric: str, aggregation: str, project: str) -> float:
    out = subprocess.run(
        ["vercel", "--scope", TEAM, "metrics", metric, "-p", project, "-s", f"{WINDOW_DAYS}d", "--granularity", "1d", "--aggregation", aggregation, "--json"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    data = json.loads(out)
    key = next(k for k in data["summary"][0] if k.startswith("vercel_")) if data.get("summary") else None
    return float(data["summary"][0][key]) if key else 0.0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--threshold", type=float, default=0.6, help="Flag projections above this share of a limit")
    args = parser.parse_args()

    flagged = []
    print(f"Vercel Hobby usage: last {WINDOW_DAYS} days, projected to {MONTH_DAYS}")
    print(f"{'metric':28} {'7 days':>12} {'projected':>12} {'limit':>12} {'share':>7}  by project")
    for label, metric, aggregation, divisor, limit in METRICS:
        per_project = {p: last_week(metric, aggregation, p) / divisor for p in PROJECTS}
        so_far = sum(per_project.values())
        projected = so_far * MONTH_DAYS / WINDOW_DAYS
        share = projected / limit
        mark = "  <-- over threshold" if share > args.threshold else ""
        split = ", ".join(f"{p} {v / so_far:.0%}" for p, v in per_project.items() if so_far and v >= so_far * 0.005)
        print(f"{label:28} {so_far:12,.1f} {projected:12,.1f} {limit:12,} {share:7.0%}  {split}{mark}")
        if share > args.threshold:
            flagged.append(label)

    if flagged:
        print(f"\nProjected above {args.threshold:.0%} of the Hobby limit: {', '.join(flagged)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
