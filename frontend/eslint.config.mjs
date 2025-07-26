// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [...compat.extends("next/core-web-vitals"), {
  rules: {
    // Custom rule to prevent invalid OpenGraph types
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Property[key.name="type"][value.value="organization"]',
        message: 'Invalid OpenGraph type "organization". Use valid types like "website", "article", "profile", etc.'
      },
      {
        selector: 'Property[key.name="type"][value.value="company"]',
        message: 'Invalid OpenGraph type "company". Use valid types like "website", "article", "profile", etc.'
      },
      {
        selector: 'Property[key.name="type"][value.value="business"]',
        message: 'Invalid OpenGraph type "business". Use valid types like "website", "article", "profile", etc.'
      },
      {
        selector: 'Property[key.name="type"][value.value="nonprofit"]',
        message: 'Invalid OpenGraph type "nonprofit". Use valid types like "website", "article", "profile", etc.'
      },
      {
        selector: 'Property[key.name="type"][value.value="charity"]',
        message: 'Invalid OpenGraph type "charity". Use valid types like "website", "article", "profile", etc.'
      }
    ]
  }
}, ...storybook.configs["flat/recommended"]];