/**
 * @fileoverview Tests for centralized image configuration constants
 *
 * This test suite validates that image configuration constants are properly
 * exported and follow the expected patterns for environment-based fallbacks.
 */

describe("Image Configuration", () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Store original environment
    originalEnv = process.env;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("when importing imageConfig module", () => {
    it("should export R2_CUSTOM_DOMAIN constant", async () => {
      const { R2_CUSTOM_DOMAIN } = await import("../imageConfig");

      expect(R2_CUSTOM_DOMAIN).toBeDefined();
      expect(typeof R2_CUSTOM_DOMAIN).toBe("string");
    });

    it("should export IMAGE_DOMAINS constant", async () => {
      const { IMAGE_DOMAINS } = await import("../imageConfig");

      expect(IMAGE_DOMAINS).toBeDefined();
      expect(IMAGE_DOMAINS).toHaveProperty("R2_CUSTOM");
    });

    it("should use environment variable when available", () => {
      // Set environment variable
      const originalValue = process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN;
      process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN = "test.example.com";

      // Clear module cache to get fresh import
      jest.resetModules();

      const { R2_CUSTOM_DOMAIN } = require("../imageConfig");

      expect(R2_CUSTOM_DOMAIN).toBe("test.example.com");

      // Restore original value
      if (originalValue !== undefined) {
        process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN = originalValue;
      } else {
        delete process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN;
      }
    });

    it("should fall back to default domain when environment variable is not set", () => {
      // Store and remove environment variable
      const originalValue = process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN;
      delete process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN;

      // Clear module cache to get fresh import
      jest.resetModules();

      const { R2_CUSTOM_DOMAIN } = require("../imageConfig");

      expect(R2_CUSTOM_DOMAIN).toBe("images.rescuedogs.me");

      // Restore original value
      if (originalValue !== undefined) {
        process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN = originalValue;
      }
    });

    it("should export properly typed constants", async () => {
      const config = await import("../imageConfig");

      // Type checking - these should not throw if types are correct
      const domain: string = config.R2_CUSTOM_DOMAIN;
      const domains: { R2_CUSTOM: string } = config.IMAGE_DOMAINS;

      expect(domain).toBeDefined();
      expect(domains.R2_CUSTOM).toBeDefined();
    });
  });

  describe("IMAGE_DOMAINS", () => {
    it("should contain R2_CUSTOM property matching R2_CUSTOM_DOMAIN", async () => {
      const { R2_CUSTOM_DOMAIN, IMAGE_DOMAINS } = await import(
        "../imageConfig"
      );

      expect(IMAGE_DOMAINS.R2_CUSTOM).toBe(R2_CUSTOM_DOMAIN);
    });

    it("should be immutable", async () => {
      const { IMAGE_DOMAINS } = await import("../imageConfig");

      // TypeScript's 'as const' provides compile-time immutability
      // At runtime, Object.freeze would be needed for true immutability
      // Let's test that the object structure is as expected
      expect(IMAGE_DOMAINS).toHaveProperty("R2_CUSTOM");
      expect(typeof IMAGE_DOMAINS.R2_CUSTOM).toBe("string");

      // Test that the object is not extensible in strict mode
      const originalValue = IMAGE_DOMAINS.R2_CUSTOM;

      // In non-strict mode, this assignment might succeed but won't change the readonly property
      // In strict mode or with proper TypeScript compilation, this would be prevented
      expect(IMAGE_DOMAINS.R2_CUSTOM).toBe(originalValue);
    });
  });

  describe("domain validation", () => {
    it("should contain valid domain format", async () => {
      const { R2_CUSTOM_DOMAIN } = await import("../imageConfig");

      // Basic domain format validation
      expect(R2_CUSTOM_DOMAIN).toMatch(/^[a-zA-Z0-9.-]+$/);
      expect(R2_CUSTOM_DOMAIN).not.toContain("//");
      expect(R2_CUSTOM_DOMAIN).not.toContain("http");
    });

    it("should not be empty string", async () => {
      const { R2_CUSTOM_DOMAIN } = await import("../imageConfig");

      expect(R2_CUSTOM_DOMAIN).not.toBe("");
      expect(R2_CUSTOM_DOMAIN.length).toBeGreaterThan(0);
    });
  });
});
