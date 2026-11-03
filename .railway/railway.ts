import { defineRailway, github, project, service } from "railway/iac";

// This repository manages only the two services it deploys. Postgres,
// Browserless and rescuedogs-mcp stay outside this file.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "rescue-dog-aggregator";

// Both services build the same repo; start.sh picks the API or the cron by
// the SERVICE_TYPE variable (set to "cron" on thriving-appreciation).
const source = github("ssatama/rescue-dog-aggregator", { branch: "main", checkSuites: false });

const sharedWatch = [
  "api/**",
  "configs/**",
  "database/**",
  "migrations/**",
  "monitoring/**",
  "services/**",
  "utils/**",
  "config.py",
  "nixpacks.toml",
  "Procfile",
  "pyproject.toml",
  ".railway/**",
  "start.sh",
  "uv.lock",
];

export default defineRailway(() => {
  // Scraper cron: Mon/Thu/Sat 15:00 UTC. NEVER restart, so a failed run
  // waits for the next schedule instead of re-scraping straight away (#367).
  const cron = service("thriving-appreciation", {
    source,
    build: {
      buildEnvironment: "V3",
      builder: "NIXPACKS",
      watchPatterns: [...sharedWatch, "management/**", "prompts/**", "scrapers/**"],
    },
    start: "bash start.sh",
    replicas: { "europe-west4-drams3a": 1 },
    deploy: { cronSchedule: "0 15 * * 1,4,6", restartPolicyType: "NEVER" },
  });

  const api = service("rescue-dog-aggregator", {
    source,
    build: { buildEnvironment: "V3", builder: "NIXPACKS", watchPatterns: sharedWatch },
    start: "bash start.sh",
    healthcheck: "/health",
    healthcheckTimeout: 120,
    replicas: { "europe-west4-drams3a": 1 },
    domains: ["api.rescuedogs.me"],
    deploy: { overlapSeconds: 30, restartPolicyType: "ON_FAILURE" },
  });

  return project("jubilant-serenity", {
    variables: { managed: false },
    resources: [cron, api],
  });
});
