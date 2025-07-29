// =============================================================================
// E2E TESTING UTILITIES EXPORTS
// Centralized exports for all testing utilities
// =============================================================================

// Core test helpers
export * from './testHelpers';

// Selector utilities
export * from './SelectorUtils';

// Test ID validation utilities
export {
  validateTestIdConsistency,
  extractTestIdsFromPageObjects,
  extractTestIdsFromComponents,
  generateValidationSummary,
  formatValidationReport,
  runTestIdValidation,
  checkTestIdExists,
  suggestMissingTestIds,
  validateAndReport,
  TestIdValidationResult,
  ValidationSummary,
  ValidationConfig,
  DEFAULT_VALIDATION_CONFIG
} from './testIdValidator';

// Component test ID checking
export {
  checkComponentTestIds,
  runBuildTimeValidation,
  formatBuildTimeReport,
  getBuildExitCode,
  validateForBuild,
  ComponentTestIdCheckResult,
  BuildTimeValidationResult
} from './componentTestIdChecker';

// CLI utilities
export { validateTestIdsCli } from './testIdValidatorCli';