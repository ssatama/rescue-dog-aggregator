#!/usr/bin/env node

import { validateAndReport, ValidationConfig, DEFAULT_VALIDATION_CONFIG } from './testIdValidator';

// =============================================================================
// CLI WRAPPER FOR TEST ID VALIDATION
// Provides command-line interface for validating test ID consistency
// =============================================================================

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<ValidationConfig> & { help?: boolean; strict?: boolean } {
  const args = process.argv.slice(2);
  const config: Partial<ValidationConfig> & { help?: boolean; strict?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        config.help = true;
        break;
        
      case '--strict':
      case '-s':
        config.strict = true;
        break;
        
      case '--page-objects-path':
        config.pageObjectsPath = args[++i];
        break;
        
      case '--components-path':
        config.componentsPath = args[++i];
        break;
        
      case '--extensions':
        config.fileExtensions = args[++i].split(',');
        break;
    }
  }

  return config;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Test ID Validator CLI

USAGE:
  npm run e2e:validate              # Run validation with default settings
  npm run e2e:validate --strict     # Run with strict mode (100% coverage required)

OPTIONS:
  --help, -h                       Show this help message
  --strict, -s                     Require 100% test ID coverage (default: 80%)
  --page-objects-path <path>       Path to page object files
  --components-path <path>         Path to component files  
  --extensions <ext1,ext2>         File extensions to check (comma-separated)

EXAMPLES:
  npm run e2e:validate --strict
  npm run e2e:validate --page-objects-path ./e2e/pages --components-path ./src

VALIDATION RULES:
  - Every test ID used in page objects must exist in component files
  - Test IDs should use kebab-case naming (e.g., 'dog-card', 'search-input')
  - Components should have data-testid attributes for interactive elements

EXIT CODES:
  0 - Validation passed (meets coverage threshold)
  1 - Validation failed (below coverage threshold or errors)

For more information, see: e2e-tests/README.md
`);
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🔍 Starting Test ID Validation...\n');

  try {
    const { success, coverage } = await validateAndReport(args);
    
    const threshold = args.strict ? 100 : 80;
    
    if (success && coverage >= threshold) {
      console.log(`\n✅ Test ID validation passed! Coverage: ${coverage}% (threshold: ${threshold}%)`);
      process.exit(0);
    } else {
      console.log(`\n❌ Test ID validation failed! Coverage: ${coverage}% (threshold: ${threshold}%)`);
      console.log('\n💡 To fix:');
      console.log('  1. Add missing data-testid attributes to components');
      console.log('  2. Ensure test IDs match exactly between page objects and components');
      console.log('  3. Use kebab-case naming for consistency');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test ID validation encountered an error:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as validateTestIdsCli };