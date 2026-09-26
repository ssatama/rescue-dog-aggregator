#!/bin/bash
# Compare the dog_viewed -> adoption_link_clicked funnel between two periods,
# for epic #484's "done when" (before vs after the UX refresh).
#
#   scripts/posthog-funnel.sh 2026-09-24 2026-10-07 2026-10-08 2026-10-21
#                             <before from> <before to> <after from> <after to>
#
# Read-only: one query per period against PostHog EU, project 283494.
# Auth: in a cloud session the agent proxy adds the personal API key for
# eu.posthog.com, so nothing is needed here. Elsewhere, export
# POSTHOG_PERSONAL_API_KEY (a key scoped to this project with query:read).
# Dates are inclusive calendar days.

set -euo pipefail

if [ $# -ne 4 ]; then
  sed -n '5,6p' "$0"
  exit 2
fi

HOST=https://eu.posthog.com
PROJECT_ID=283494
AUTH=()
if [ -n "${POSTHOG_PERSONAL_API_KEY:-}" ]; then
  AUTH=(-H "Authorization: Bearer $POSTHOG_PERSONAL_API_KEY")
fi

funnel() {
  local from=$1 to=$2
  curl -sS --fail-with-body ${AUTH[@]+"${AUTH[@]}"} -H "Content-Type: application/json" \
    "$HOST/api/projects/$PROJECT_ID/query/" \
    -d @- <<EOF
{"query": {
  "kind": "FunnelsQuery",
  "series": [
    {"kind": "EventsNode", "event": "dog_viewed"},
    {"kind": "EventsNode", "event": "adoption_link_clicked"}
  ],
  "dateRange": {"date_from": "$from", "date_to": "$to"},
  "funnelsFilter": {"funnelOrderType": "ordered", "funnelWindowInterval": 1, "funnelWindowIntervalUnit": "day"},
  "filterTestAccounts": true
}}
EOF
}

report() {
  python3 -c '
import json, sys
label = sys.argv[1]
steps = json.load(sys.stdin)["results"]
viewed, clicked = steps[0]["count"], steps[1]["count"]
rate = 100 * clicked / viewed if viewed else 0
print(f"{label:<28} viewed {viewed:>6}   clicked {clicked:>6}   conversion {rate:5.1f}%")
' "$1"
}

funnel "$1" "$2" | report "before $1..$2"
funnel "$3" "$4" | report "after  $3..$4"
echo "Persons, ordered steps, 1-day conversion window, test accounts excluded."
