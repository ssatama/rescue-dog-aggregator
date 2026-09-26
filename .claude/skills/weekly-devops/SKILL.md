---
name: weekly-devops
description: Weekly DevOps run - baseline health checks, Sentry triage, security alerts, Dependabot merges with a merge gate and post-merge production verification. Use only when the user invokes /weekly-devops.
disable-model-invocation: true
---

# Weekly DevOps Run

Follow AGENTS.md (branches, TDD, conventional commits, pre-commit checks). Every merge to main deploys to production on Vercel and Railway.

1. **Baseline**: on an up-to-date main, run ruff check/format, `uv run pytest -m "not browser"`, and in frontend/ run tsc, lint and jest. Check https://api.rescuedogs.me/health, active dog counts per org (Postgres MCP, flag any org at 0), and 5 random dog pages for real content. Check the last 3 scraper cron runs on the Railway service `thriving-appreciation`.
2. **Sentry** (org sampo-cr, EU region, projects python-fastapi and javascript-nextjs): issues new or regressed in the last 7 days. For each actionable one, open a GitHub issue and a fix PR (failing test first).
3. **Search visibility (Bing)**: query the Bing Webmaster API, `https://ssl.bing.com/webmaster/api.svc/json/<Method>?siteUrl=https%3A%2F%2Frescuedogs.me%2F&apikey=$BING_WEBMASTER_API_KEY` (key from `.env`, never print it; the site is registered as the apex, not www). Report:
   - `GetFeeds`: `sitemap_index.xml` status is Success and was crawled within the last week.
   - `GetCrawlStats` and `GetCrawlIssues`: pages in index, plus any rise in 4xx/5xx, robots-blocked or soft-404 URLs. Spot-check a few flagged URLs with curl; a real page returning 404, or a dead one returning 200, is a bug.
   - `GetRankAndTrafficStats`: Bing clicks and impressions this week vs last week.
   - `GetQueryStats`: top queries by impressions, and anything new or dropping.
   - IndexNow: the last 3 cron runs on `thriving-appreciation` should log `IndexNow submitted N URL(s): HTTP 200/202`. `IndexNow hook unavailable` means the cron import quirk (the module didn't load); a 403 or 422 means the key file `/<key>.txt` no longer matches `INDEXNOW_KEY`.

   Open a GitHub issue for anything actionable. Don't submit URLs or sitemaps without asking.
4. **Security**: check `gh api repos/ssatama/rescue-dog-aggregator/dependabot/alerts?state=open`, `pnpm audit` and `uvx pip-audit`. Open a fix PR for anything not covered by an open Dependabot PR.
5. **Dependabot**: merge minor/patch PRs one at a time once CI is green (fix CI on the branch if needed). Do the migration work for majors.
6. **Merge gate** for my fix PRs and majors: CI green, a clean /code-review in a fresh subagent (max 2 rounds), about 150 lines or less excluding tests and lockfiles, nothing touching migrations/, railway*.json, .github/, configs/*.yaml or vercel.json, and a regression test. If it fails, label the PR `needs-human`.
7. **After each merge**: wait for CI on main and the deploy, then re-run the step-1 site checks.
   - **Vercel deploy status:** use the Vercel MCP first: `list_deployments` with `projectId: prj_mahHvwW7dv0mWDMh0OkTKW8zY3kG` and `target: production`. Omit `teamId`, because the MCP returns `[]` with it. If the MCP fails or returns nothing, use the CLI: `vercel ls rescue-dog-aggregator --prod` and `vercel inspect <deployment-url>`. Always name the project: `frontend/` isn't linked, so a bare `vercel ls` shows another project.
   - Several merges in a row queue their deploys and cancel the superseded ones; wait for the newest READY deploy.
   - **Railway:** check with `railway deployment list --service rescue-dog-aggregator`. A brief HTTP 502 right after deploy means the API container is mid-swap; retry before concluding. If anything regressed, revert immediately and stop merging.
8. **Summary**: short list of merged, reverted, needs-human, and anything odd, plus the Bing numbers (index size, clicks/impressions vs last week, crawl issues, IndexNow status).
