import nextConfig from "eslint-config-next";

export default [
  {
    ignores: ["**/*.skip"],
  },
  ...nextConfig,
  {
    rules: {
      // Custom rule to prevent invalid OpenGraph types
      "no-restricted-syntax": [
        "error",
        {
          selector: 'Property[key.name="type"][value.value="organization"]',
          message:
            'Invalid OpenGraph type "organization". Use valid types like "website", "article", "profile", etc.',
        },
        {
          selector: 'Property[key.name="type"][value.value="company"]',
          message:
            'Invalid OpenGraph type "company". Use valid types like "website", "article", "profile", etc.',
        },
        {
          selector: 'Property[key.name="type"][value.value="business"]',
          message:
            'Invalid OpenGraph type "business". Use valid types like "website", "article", "profile", etc.',
        },
        {
          selector: 'Property[key.name="type"][value.value="nonprofit"]',
          message:
            'Invalid OpenGraph type "nonprofit". Use valid types like "website", "article", "profile", etc.',
        },
        {
          selector: 'Property[key.name="type"][value.value="charity"]',
          message:
            'Invalid OpenGraph type "charity". Use valid types like "website", "article", "profile", etc.',
        },
      ],
    },
  },
  // Progressive image components use native <img> for fine-grained loading control
  {
    files: [
      "src/components/ui/ProgressiveImage.tsx",
      "src/components/ui/LazyImage.tsx",
      "src/components/ui/HeroImageWithBlurredBackground.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Test files may use native <img> for testing purposes
  {
    files: ["**/__tests__/**", "**/*.test.*", "**/*.spec.*", "e2e-tests/**"],
    rules: {
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
    },
  },
];
