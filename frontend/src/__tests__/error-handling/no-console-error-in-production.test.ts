import { execSync } from "child_process";
import path from "path";

const SRC_DIR = path.resolve(__dirname, "../..");

const ALLOWED_FILES = new Set([
  // Logger itself - defines console.error wrappers
  "utils/logger.ts",
  // Breadcrumbs - uses console.error around Sentry.addBreadcrumb; reportError would risk loops
  "lib/monitoring/breadcrumbs.ts",
  // Security - console.warn for security events is standard practice
  "utils/security.ts",
  // Image utils - non-prod-guarded console.error/warn for config validation
  "utils/imageUtils.ts",
  // Network utils - non-prod preload warnings
  "utils/networkUtils.ts",
  // Error boundaries with Sentry.captureException - console.error is dev-only supplementary logging
  "components/swipe/SwipeErrorBoundary.tsx",
  "components/error/MobileCatalogErrorBoundary.tsx",
  // UI ErrorBoundary - dev-only componentDidCatch logging (no Sentry integration)
  "components/ui/ErrorBoundary.tsx",
  // FallbackImage - image load warnings are expected UX events
  "components/ui/FallbackImage.tsx",
  // Flag error boundary - non-prod flag loading warnings
  "components/ui/FlagErrorBoundary.tsx",
  // Sharing utils - dev-only guarded
  "utils/sharing.ts",
  // Sitemap generation - build-time server-side logging
  "utils/sitemap.ts",
  "app/sitemap-guides.xml/route.ts",
  "app/sitemap-dogs.xml/route.ts",
  "app/sitemap-organizations.xml/route.ts",
  "app/sitemap-countries.xml/route.ts",
  "app/sitemap-images.xml/route.ts",
  "app/sitemap-breeds.xml/route.ts",
  "app/sitemap_index.xml/route.ts",
  "app/sitemap.xml/route.ts",
  // ContactButton/ShareButton - user-facing clipboard/share API failures
  "components/ui/ContactButton.tsx",
  "components/ui/ShareButton.tsx",
  // Dev/test pages - not user-facing production code
  "app/test-images/page.tsx",
  // Performance metrics utility - dev-only console.log
  "utils/performanceMetrics.ts",
]);

function findConsoleUsages(): Array<{ file: string; line: number; content: string }> {
  const results: Array<{ file: string; line: number; content: string }> = [];

  try {
    const output = execSync(
      `grep -rn -E "console\\.(error|warn|log)\\(" "${SRC_DIR}" --include="*.ts" --include="*.tsx" || true`,
      { encoding: "utf-8", maxBuffer: 1024 * 1024 },
    );

    for (const line of output.trim().split("\n")) {
      if (!line) continue;

      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (!match) continue;

      const [, filePath, lineNum, content] = match;
      const relativePath = path.relative(SRC_DIR, filePath);

      // Skip test files
      if (
        relativePath.includes("__tests__") ||
        relativePath.includes(".test.") ||
        relativePath.includes(".spec.")
      ) {
        continue;
      }

      // Skip allowed files
      if (ALLOWED_FILES.has(relativePath)) continue;

      results.push({
        file: relativePath,
        line: parseInt(lineNum, 10),
        content: content.trim(),
      });
    }
  } catch {
    // grep returns exit code 1 when no matches found
  }

  return results;
}

describe("Production error reporting", () => {
  it("should not use console.error/warn/log in source files — use reportError instead", () => {
    const violations = findConsoleUsages();

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} → ${v.content}`)
        .join("\n");

      throw new Error(
        `Found ${violations.length} console.error/warn/log usage(s) in production code.\n` +
          `Use reportError() from utils/logger instead, or add file to ALLOWED_FILES with justification.\n\n` +
          `${report}`,
      );
    }
  });
});
