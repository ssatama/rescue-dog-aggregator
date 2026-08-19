# Features

Documentation for the platform's user-facing capabilities. See
[../README.md](../README.md) for the full documentation index.

| Doc | Covers |
| --- | --- |
| [llm-data-enrichment.md](llm-data-enrichment.md) | LLM profiling: prompts, normalization, quality scoring, cost |
| [swipe.md](swipe.md) | Swipe discovery interface and its quality gate |
| [adoption-detection.md](adoption-detection.md) | Detecting adopted dogs and preserving their SEO value |
| [country-hub-pages.md](country-hub-pages.md) | Country landing pages |
| [railway-database-sync.md](railway-database-sync.md) | Syncing data between local and Railway |
| [analytics-self-exclusion.md](analytics-self-exclusion.md) | Excluding own traffic from analytics |

## Platform summary

- 1,500+ active dogs aggregated from 13 configured organizations, 12 of them
  LLM-enriched
- Scrapers run on Railway cron, Mon/Thu/Sat at 15:00 UTC
- Frontend on Vercel, backend and PostgreSQL on Railway
- Accessibility target: WCAG 2.1 AA
