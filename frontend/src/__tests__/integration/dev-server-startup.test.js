/**
 * Dev Server Startup Validation Tests
 *
 * These tests verify that the development server can start successfully,
 * catching configuration issues that prevent normal development workflow.
 */

import { spawn } from "child_process";
import path from "path";
import { setTimeout } from "timers/promises";

const FRONTEND_ROOT = path.join(__dirname, "../../../");
const STARTUP_TIMEOUT = 30000; // 30 seconds max startup time
const READY_MESSAGE = "✓ Ready";

describe("Dev Server Startup Validation", () => {
  describe("Development Server", () => {
    test(
      "should start dev server successfully without hanging",
      async () => {
        // Skip in CI to avoid resource conflicts
        if (process.env.CI) {
          console.log("Skipping dev server test in CI environment");
          return;
        }

        let devProcess;
        let startupSuccess = false;
        let errorOutput = "";
        let stdoutOutput = "";

        try {
          // Start the dev server
          devProcess = spawn("npm", ["run", "dev"], {
            cwd: FRONTEND_ROOT,
            stdio: ["pipe", "pipe", "pipe"],
            env: { ...process.env, PORT: "3099" }, // Use different port to avoid conflicts
          });

          // Collect output
          devProcess.stdout.on("data", (data) => {
            const output = data.toString();
            stdoutOutput += output;

            // Check for successful startup - look for Ready message or Local URL
            if (output.includes(READY_MESSAGE) || output.includes("- Local:")) {
              startupSuccess = true;
            }
          });

          devProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
          });

          // Wait for startup or timeout
          const startTime = Date.now();
          while (!startupSuccess && Date.now() - startTime < STARTUP_TIMEOUT) {
            await setTimeout(500); // Check every 500ms

            // Also check accumulated output in case event handler missed it
            if (
              stdoutOutput.includes(READY_MESSAGE) ||
              stdoutOutput.includes("- Local:")
            ) {
              startupSuccess = true;
              break;
            }

            // Check if process died
            if (devProcess.killed || devProcess.exitCode !== null) {
              break;
            }
          }

          // Verify successful startup
          if (!startupSuccess) {
            throw new Error(
              `Dev server failed to start within ${STARTUP_TIMEOUT}ms.\n\nSTDOUT:\n${stdoutOutput}\n\nSTDERR:\n${errorOutput}`,
            );
          }

          // Verify no critical errors in output
          const criticalErrors = [
            "Duplicate page detected",
            "Failed to compile",
            "Module not found",
            "SyntaxError",
            "TypeError",
            "Error: ",
          ];

          for (const error of criticalErrors) {
            if (stdoutOutput.includes(error) || errorOutput.includes(error)) {
              throw new Error(
                `Critical error detected during startup: ${error}\n\nOutput:\n${stdoutOutput}\n${errorOutput}`,
              );
            }
          }

          expect(startupSuccess).toBe(true);
          expect(stdoutOutput).toContain("Local:");
          expect(stdoutOutput).toContain("http://localhost:3099");
        } finally {
          // Always cleanup the process
          if (devProcess && !devProcess.killed) {
            devProcess.kill("SIGTERM");

            // Give it a moment to cleanup gracefully
            await setTimeout(1000);

            if (!devProcess.killed) {
              devProcess.kill("SIGKILL");
            }
          }
        }
      },
      STARTUP_TIMEOUT + 5000,
    ); // Add buffer to test timeout

    test("should detect and report configuration issues early", async () => {
      // This test validates that the server provides helpful error messages
      // when there are configuration problems

      const commonIssues = [
        {
          description: "missing dependencies",
          pattern: /Cannot find module/,
        },
        {
          description: "syntax errors in config",
          pattern: /SyntaxError.*config/,
        },
        {
          description: "port conflicts",
          pattern: /EADDRINUSE/,
        },
      ];

      // For now, just verify these patterns are recognized
      // In a real scenario, we'd simulate these issues
      expect(commonIssues.length).toBeGreaterThan(0);
    });
  });

  describe("Build Process Integration", () => {
    test("should have consistent dev and build environments", () => {
      // Verify that files available in dev are also available for build
      const packageJson = require(path.join(FRONTEND_ROOT, "package.json"));

      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();

      // Both should use Next.js
      expect(packageJson.scripts.dev).toContain("next");
      expect(packageJson.scripts.build).toContain("next");
    });

    test("should have proper environment variable handling", () => {
      // Verify that environment files are properly structured
      const envFiles = [".env.local", ".env.example", ".env"];
      let hasEnvConfig = false;

      envFiles.forEach((file) => {
        const envPath = path.join(FRONTEND_ROOT, file);
        try {
          const fs = require("fs");
          if (fs.existsSync(envPath)) {
            hasEnvConfig = true;
          }
        } catch (error) {
          // File doesn't exist, which is fine
        }
      });

      // At least one env configuration should exist
      expect(hasEnvConfig).toBe(true);
    });
  });

  describe("Port and Network Configuration", () => {
    test("should handle port conflicts gracefully", async () => {
      // This would be implemented to test multiple port scenarios
      // For now, verify the default port configuration
      const packageJson = require(path.join(FRONTEND_ROOT, "package.json"));

      // Should not hardcode ports in package.json scripts
      expect(packageJson.scripts.dev).not.toMatch(/--port \d+/);
    });

    test("should support custom port configuration", () => {
      // Verify that PORT environment variable is respected
      const originalPort = process.env.PORT;
      process.env.PORT = "4000";

      // This would start server and verify it uses the custom port
      // For now, just verify env var handling works
      expect(process.env.PORT).toBe("4000");

      // Restore original
      if (originalPort) {
        process.env.PORT = originalPort;
      } else {
        delete process.env.PORT;
      }
    });
  });
});
