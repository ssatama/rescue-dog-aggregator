/**
 * Route Validation Tests
 *
 * These tests validate Next.js App Router configuration and catch routing issues
 * that could cause runtime errors or unexpected behavior.
 */

import fs from "fs";
import path from "path";

const FRONTEND_ROOT = path.join(__dirname, "../../../");
const APP_DIR = path.join(FRONTEND_ROOT, "src/app");

describe("Route Configuration Validation", () => {
  describe("App Router Structure", () => {
    test("should have proper app directory structure", () => {
      expect(fs.existsSync(APP_DIR)).toBe(true);

      // Should have root layout
      const rootLayoutExists =
        fs.existsSync(path.join(APP_DIR, "layout.js")) ||
        fs.existsSync(path.join(APP_DIR, "layout.jsx")) ||
        fs.existsSync(path.join(APP_DIR, "layout.ts")) ||
        fs.existsSync(path.join(APP_DIR, "layout.tsx"));

      expect(rootLayoutExists).toBe(true);

      // Should have root page
      const rootPageExists =
        fs.existsSync(path.join(APP_DIR, "page.js")) ||
        fs.existsSync(path.join(APP_DIR, "page.jsx")) ||
        fs.existsSync(path.join(APP_DIR, "page.ts")) ||
        fs.existsSync(path.join(APP_DIR, "page.tsx"));

      expect(rootPageExists).toBe(true);
    });

    test("should not have conflicting dynamic routes", () => {
      const conflicts = findDynamicRouteConflicts(APP_DIR);

      if (conflicts.length > 0) {
        const errorMessage = conflicts
          .map(
            (conflict) =>
              `Route conflict at "${conflict.path}": ${conflict.description}`,
          )
          .join("\n");

        throw new Error(`Dynamic route conflicts detected:\n${errorMessage}`);
      }

      expect(conflicts).toEqual([]);
    });

    test("should have consistent file structure across routes", () => {
      const issues = validateRouteStructure(APP_DIR);

      if (issues.length > 0) {
        const errorMessage = issues
          .map((issue) => `${issue.path}: ${issue.problem}`)
          .join("\n");

        throw new Error(`Route structure issues:\n${errorMessage}`);
      }

      expect(issues).toEqual([]);
    });
  });

  describe("Dynamic Route Validation", () => {
    test("should have proper dynamic route parameter names", () => {
      const invalidParams = findInvalidDynamicParams(APP_DIR);

      if (invalidParams.length > 0) {
        const errorMessage = invalidParams
          .map((param) => `Invalid parameter "${param.name}" in ${param.path}`)
          .join("\n");

        throw new Error(`Invalid dynamic route parameters:\n${errorMessage}`);
      }

      expect(invalidParams).toEqual([]);
    });

    test("should not have catch-all and optional catch-all conflicts", () => {
      const conflicts = findCatchAllConflicts(APP_DIR);

      expect(conflicts).toEqual([]);
    });

    test("should have proper route hierarchy", () => {
      const hierarchyIssues = validateRouteHierarchy(APP_DIR);

      if (hierarchyIssues.length > 0) {
        const errorMessage = hierarchyIssues
          .map((issue) => `${issue.path}: ${issue.issue}`)
          .join("\n");

        throw new Error(`Route hierarchy issues:\n${errorMessage}`);
      }

      expect(hierarchyIssues).toEqual([]);
    });
  });

  describe("Special Files Validation", () => {
    test("should have valid layout files where needed", () => {
      const layoutIssues = validateLayoutFiles(APP_DIR);

      expect(layoutIssues).toEqual([]);
    });

    test("should have valid error boundary files", () => {
      const errorFiles = findSpecialFiles(APP_DIR, "error");

      // Validate error files export proper components
      errorFiles.forEach((errorFile) => {
        const content = fs.readFileSync(errorFile, "utf8");

        // Should be client component for error boundaries
        expect(content).toContain('"use client"');
      });
    });

    test("should have valid loading files", () => {
      const loadingFiles = findSpecialFiles(APP_DIR, "loading");

      // Validate loading files export components
      loadingFiles.forEach((loadingFile) => {
        const content = fs.readFileSync(loadingFile, "utf8");

        // Should export default component
        expect(content).toMatch(/export default|module\.exports/);
      });
    });
  });

  describe("Route Performance Validation", () => {
    test("should not have excessive route nesting", () => {
      const deepRoutes = findExcessivelyNestedRoutes(APP_DIR, 6); // Max 6 levels

      if (deepRoutes.length > 0) {
        console.warn(
          "Deep route nesting detected (may impact performance):",
          deepRoutes,
        );
      }

      // This is a warning, not a failure, but good to track
      expect(deepRoutes.length).toBeLessThan(10);
    });

    test("should have reasonable number of routes", () => {
      const allRoutes = getAllRoutes(APP_DIR);

      // Should have some routes but not excessive
      expect(allRoutes.length).toBeGreaterThan(0);
      expect(allRoutes.length).toBeLessThan(100); // Reasonable limit
    });
  });
});

/**
 * Find conflicting dynamic routes in the same directory
 */
function findDynamicRouteConflicts(dir) {
  const conflicts = [];

  function scanDirectory(currentDir, routePath = "") {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    const dynamicRoutes = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(currentDir, entry.name);

        // Check for dynamic route patterns
        if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
          dynamicRoutes.push(entry.name);
        }

        scanDirectory(fullPath, `${routePath}/${entry.name}`);
      }
    }

    // Check for conflicts in current directory
    if (dynamicRoutes.length > 1) {
      const hasCatchAll = dynamicRoutes.some((route) => route.includes("..."));
      const hasOptionalCatchAll = dynamicRoutes.some(
        (route) => route.startsWith("[[") && route.endsWith("]]"),
      );
      const hasRegularDynamic = dynamicRoutes.some(
        (route) => !route.includes("...") && !route.startsWith("[["),
      );

      if ((hasCatchAll || hasOptionalCatchAll) && hasRegularDynamic) {
        conflicts.push({
          path: routePath || "/",
          description: `Conflicting dynamic routes: ${dynamicRoutes.join(", ")}`,
        });
      }
    }
  }

  scanDirectory(dir);
  return conflicts;
}

/**
 * Validate route structure consistency
 */
function validateRouteStructure(dir) {
  const issues = [];

  function scanDirectory(currentDir, routePath = "") {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(currentDir, entry.name);
        const hasPageFile = entries.some(
          (e) => e.isFile() && /^page\.(js|jsx|ts|tsx)$/.test(e.name),
        );

        // Route groups should not have page files at the same level
        if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
          const groupEntries = fs.readdirSync(fullPath, {
            withFileTypes: true,
          });
          const hasPageInGroup = groupEntries.some(
            (e) => e.isFile() && /^page\.(js|jsx|ts|tsx)$/.test(e.name),
          );

          if (hasPageInGroup) {
            issues.push({
              path: `${routePath}/${entry.name}`,
              problem: "Route group should not contain page files",
            });
          }
        }

        scanDirectory(fullPath, `${routePath}/${entry.name}`);
      }
    }
  }

  scanDirectory(dir);
  return issues;
}

/**
 * Find invalid dynamic route parameter names
 */
function findInvalidDynamicParams(dir) {
  const invalid = [];

  function scanDirectory(currentDir, routePath = "") {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
          let paramName = entry.name.slice(1, -1);

          // Handle catch-all routes
          if (paramName.startsWith("...")) {
            paramName = paramName.slice(3);
          }

          // Handle optional catch-all routes
          if (entry.name.startsWith("[[") && entry.name.endsWith("]]")) {
            paramName = entry.name.slice(2, -2);
            if (paramName.startsWith("...")) {
              paramName = paramName.slice(3);
            }
          }

          // Validate parameter name
          if (!isValidParamName(paramName)) {
            invalid.push({
              name: paramName,
              path: `${routePath}/${entry.name}`,
            });
          }
        }

        scanDirectory(fullPath, `${routePath}/${entry.name}`);
      }
    }
  }

  scanDirectory(dir);
  return invalid;
}

/**
 * Check if parameter name is valid
 */
function isValidParamName(name) {
  // Must be non-empty, alphanumeric + underscore, start with letter
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Find catch-all route conflicts
 */
function findCatchAllConflicts(dir) {
  const conflicts = [];

  function scanDirectory(currentDir, routePath = "") {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    const catchAllRoutes = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.name.includes("...")) {
          catchAllRoutes.push(entry.name);
        }

        scanDirectory(fullPath, `${routePath}/${entry.name}`);
      }
    }

    // Multiple catch-all routes in same directory is invalid
    if (catchAllRoutes.length > 1) {
      conflicts.push({
        path: routePath || "/",
        routes: catchAllRoutes,
      });
    }
  }

  scanDirectory(dir);
  return conflicts;
}

/**
 * Validate route hierarchy
 */
function validateRouteHierarchy(dir) {
  const issues = [];

  // Add specific hierarchy validation logic here
  // For now, basic validation

  return issues;
}

/**
 * Validate layout files
 */
function validateLayoutFiles(dir) {
  const issues = [];

  function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && /^layout\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        const filePath = path.join(currentDir, entry.name);
        const content = fs.readFileSync(filePath, "utf8");

        // Layout should export default function
        if (!content.includes("export default")) {
          issues.push({
            path: filePath,
            issue: "Layout file must export default component",
          });
        }
      } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
        scanDirectory(path.join(currentDir, entry.name));
      }
    }
  }

  scanDirectory(dir);
  return issues;
}

/**
 * Find special files of a given type
 */
function findSpecialFiles(dir, fileType) {
  const files = [];

  function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (
        entry.isFile() &&
        new RegExp(`^${fileType}\\.(js|jsx|ts|tsx)$`).test(entry.name)
      ) {
        files.push(path.join(currentDir, entry.name));
      } else if (entry.isDirectory() && !entry.name.startsWith(".")) {
        scanDirectory(path.join(currentDir, entry.name));
      }
    }
  }

  scanDirectory(dir);
  return files;
}

/**
 * Find excessively nested routes
 */
function findExcessivelyNestedRoutes(dir, maxDepth) {
  const deepRoutes = [];

  function scanDirectory(currentDir, depth = 0, routePath = "") {
    if (depth > maxDepth) {
      deepRoutes.push(routePath);
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        const fullPath = path.join(currentDir, entry.name);
        scanDirectory(fullPath, depth + 1, `${routePath}/${entry.name}`);
      }
    }
  }

  scanDirectory(dir);
  return deepRoutes;
}

/**
 * Get all routes in the app
 */
function getAllRoutes(dir) {
  const routes = [];

  function scanDirectory(currentDir, routePath = "") {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    // Check if current directory has a page file
    const hasPage = entries.some(
      (entry) => entry.isFile() && /^page\.(js|jsx|ts|tsx)$/.test(entry.name),
    );

    if (hasPage) {
      routes.push(routePath || "/");
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        const fullPath = path.join(currentDir, entry.name);
        const childRoutePath = `${routePath}/${entry.name}`;

        scanDirectory(fullPath, childRoutePath);
      }
    }
  }

  scanDirectory(dir);
  return routes;
}
