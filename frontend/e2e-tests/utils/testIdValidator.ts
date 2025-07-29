import { glob } from 'glob';
import { readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// TEST ID VALIDATION UTILITIES
// Validates test IDs used in page objects exist in referenced components
// =============================================================================

/**
 * Result of test ID validation check
 */
export interface TestIdValidationResult {
  testId: string;
  usedInPageObjects: string[];
  foundInComponents: string[];
  isValid: boolean;
  missingFromComponents: string[];
}

/**
 * Summary of validation results
 */
export interface ValidationSummary {
  totalTestIds: number;
  validTestIds: number;
  invalidTestIds: number;
  coverage: number;
  missingTestIds: TestIdValidationResult[];
  validTestIds: TestIdValidationResult[];
}

/**
 * Configuration for test ID validation
 */
export interface ValidationConfig {
  pageObjectsPath: string;
  componentsPath: string;
  fileExtensions: string[];
  excludePatterns: string[];
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  pageObjectsPath: '/Users/samposatama/Documents/rescue-dog-aggregator/frontend/e2e-tests/pages',
  componentsPath: '/Users/samposatama/Documents/rescue-dog-aggregator/frontend/src',
  fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  excludePatterns: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**', '**/*.d.ts']
};

/**
 * Extract test IDs from page object files
 */
export async function extractTestIdsFromPageObjects(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG): Promise<Map<string, string[]>> {
  const testIdMap = new Map<string, string[]>();
  
  // Find all page object files
  const pageObjectFiles = await glob(`${config.pageObjectsPath}/**/*.{${config.fileExtensions.join(',')}}`, {
    ignore: config.excludePatterns
  });

  for (const filePath of pageObjectFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const fileName = filePath.split('/').pop() || filePath;
      
      // Extract test IDs from getElement calls
      const getElementMatches = content.match(/getElement\s*\(\s*['"](.*?)['"]\s*\)/g) || [];
      const getElementsMatches = content.match(/getElements\s*\(\s*['"](.*?)['"]\s*\)/g) || [];
      
      const testIds = [
        ...getElementMatches.map(match => {
          const result = match.match(/['"](.*?)['"]/);
          return result ? result[1] : '';
        }),
        ...getElementsMatches.map(match => {
          const result = match.match(/['"](.*?)['"]/);
          return result ? result[1] : '';
        })
      ].filter(id => id.length > 0);

      if (testIds.length > 0) {
        testIdMap.set(fileName, testIds);
      }
    } catch (error) {
      console.warn(`[TestIdValidator] Could not read page object file: ${filePath}`, error);
    }
  }

  return testIdMap;
}

/**
 * Extract test IDs from component files
 */
export async function extractTestIdsFromComponents(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG): Promise<Map<string, string[]>> {
  const testIdMap = new Map<string, string[]>();
  
  // Find all component files
  const componentFiles = await glob(`${config.componentsPath}/**/*.{${config.fileExtensions.join(',')}}`, {
    ignore: config.excludePatterns
  });

  for (const filePath of componentFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const fileName = filePath.split('/').pop() || filePath;
      
      // Extract test IDs from data-testid attributes
      const dataTestIdMatches = content.match(/data-testid\s*=\s*["{`']([^"{`']+)["{`']/g) || [];
      
      const testIds = dataTestIdMatches.map(match => {
        const result = match.match(/["{`']([^"{`']+)["{`']/);
        return result ? result[1] : '';
      }).filter(id => id.length > 0 && !id.includes('${') && !id.includes('{'));

      if (testIds.length > 0) {
        testIdMap.set(fileName, testIds);
      }
    } catch (error) {
      console.warn(`[TestIdValidator] Could not read component file: ${filePath}`, error);
    }
  }

  return testIdMap;
}

/**
 * Validate test ID consistency between page objects and components
 */
export async function validateTestIdConsistency(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG): Promise<TestIdValidationResult[]> {
  console.log('[TestIdValidator] Starting test ID consistency validation...');
  
  const [pageObjectTestIds, componentTestIds] = await Promise.all([
    extractTestIdsFromPageObjects(config),
    extractTestIdsFromComponents(config)
  ]);

  // Collect all unique test IDs from page objects
  const allPageObjectTestIds = new Set<string>();
  const testIdToPageObjects = new Map<string, string[]>();
  
  for (const [fileName, testIds] of pageObjectTestIds) {
    for (const testId of testIds) {
      allPageObjectTestIds.add(testId);
      if (!testIdToPageObjects.has(testId)) {
        testIdToPageObjects.set(testId, []);
      }
      testIdToPageObjects.get(testId)!.push(fileName);
    }
  }

  // Collect all unique test IDs from components
  const allComponentTestIds = new Set<string>();
  const testIdToComponents = new Map<string, string[]>();
  
  for (const [fileName, testIds] of componentTestIds) {
    for (const testId of testIds) {
      allComponentTestIds.add(testId);
      if (!testIdToComponents.has(testId)) {
        testIdToComponents.set(testId, []);
      }
      testIdToComponents.get(testId)!.push(fileName);
    }
  }

  // Validate each test ID
  const results: TestIdValidationResult[] = [];
  
  for (const testId of allPageObjectTestIds) {
    const usedInPageObjects = testIdToPageObjects.get(testId) || [];
    const foundInComponents = testIdToComponents.get(testId) || [];
    const isValid = foundInComponents.length > 0;
    const missingFromComponents = isValid ? [] : usedInPageObjects;

    results.push({
      testId,
      usedInPageObjects,
      foundInComponents,
      isValid,
      missingFromComponents
    });
  }

  return results.sort((a, b) => a.testId.localeCompare(b.testId));
}

/**
 * Generate validation summary from results
 */
export function generateValidationSummary(results: TestIdValidationResult[]): ValidationSummary {
  const validTestIds = results.filter(r => r.isValid);
  const invalidTestIds = results.filter(r => !r.isValid);
  const coverage = results.length > 0 ? Math.round((validTestIds.length / results.length) * 100) : 0;

  return {
    totalTestIds: results.length,
    validTestIds: validTestIds.length,
    invalidTestIds: invalidTestIds.length,
    coverage,
    missingTestIds: invalidTestIds,
    validTestIds
  };
}

/**
 * Format validation report for console output
 */
export function formatValidationReport(summary: ValidationSummary): string {
  const lines: string[] = [];
  
  lines.push('=== Test ID Validation Report ===');
  lines.push('');
  lines.push(`📊 Total Test IDs: ${summary.totalTestIds}`);
  lines.push(`✅ Valid Test IDs: ${summary.validTestIds}`);
  lines.push(`❌ Invalid Test IDs: ${summary.invalidTestIds}`);
  lines.push(`📈 Coverage: ${summary.coverage}%`);
  lines.push('');

  if (summary.missingTestIds.length > 0) {
    lines.push('❌ Test IDs Used in Page Objects but Missing from Components:');
    lines.push('');
    
    for (const result of summary.missingTestIds) {
      lines.push(`  🔍 "${result.testId}"`);
      lines.push(`     Used in: ${result.usedInPageObjects.join(', ')}`);
      lines.push(`     Action: Add data-testid="${result.testId}" to relevant component(s)`);
      lines.push('');
    }
  }

  if (summary.validTestIds.length > 0 && summary.coverage < 100) {
    lines.push('✅ Valid Test IDs (Sample):');
    lines.push('');
    
    const sampleSize = Math.min(5, summary.validTestIds.length);
    for (let i = 0; i < sampleSize; i++) {
      const result = summary.validTestIds[i];
      lines.push(`  ✅ "${result.testId}"`);
      lines.push(`     Found in: ${result.foundInComponents.slice(0, 3).join(', ')}${result.foundInComponents.length > 3 ? '...' : ''}`);
      lines.push('');
    }
    
    if (summary.validTestIds.length > sampleSize) {
      lines.push(`  ... and ${summary.validTestIds.length - sampleSize} more valid test IDs`);
      lines.push('');
    }
  }

  lines.push('📝 Recommendations:');
  lines.push('');

  if (summary.coverage < 100) {
    lines.push('  1. Add missing data-testid attributes to components');
    lines.push('  2. Use consistent naming conventions (kebab-case recommended)');
    lines.push('  3. Run validation before adding new page object methods');
  } else {
    lines.push('  🎉 Excellent! All test IDs are properly implemented');
  }

  lines.push('');
  lines.push('🔧 Tools:');
  lines.push('  - Run validation: npm run e2e:validate');
  lines.push('  - Fix validation: Add data-testid attributes to components');
  lines.push('  - Automate: Add validation to pre-commit hooks');
  lines.push('');
  lines.push('================================');

  return lines.join('\n');
}

/**
 * Run full validation and return formatted report
 */
export async function runTestIdValidation(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG): Promise<{ results: TestIdValidationResult[], summary: ValidationSummary, report: string }> {
  const results = await validateTestIdConsistency(config);
  const summary = generateValidationSummary(results);
  const report = formatValidationReport(summary);

  return { results, summary, report };
}

/**
 * Check if specific test ID exists in components
 */
export async function checkTestIdExists(testId: string, config: ValidationConfig = DEFAULT_VALIDATION_CONFIG): Promise<{ exists: boolean, foundInFiles: string[] }> {
  const componentTestIds = await extractTestIdsFromComponents(config);
  const foundInFiles: string[] = [];

  for (const [fileName, testIds] of componentTestIds) {
    if (testIds.includes(testId)) {
      foundInFiles.push(fileName);
    }
  }

  return {
    exists: foundInFiles.length > 0,
    foundInFiles
  };
}

/**
 * Suggest test IDs that might be missing based on common patterns
 */
export function suggestMissingTestIds(results: TestIdValidationResult[]): string[] {
  const suggestions: string[] = [];
  const missingTestIds = results.filter(r => !r.isValid).map(r => r.testId);

  // Common patterns to suggest
  const commonPatterns = [
    'page-container',
    'page-title', 
    'search-input',
    'dogs-grid',
    'dog-card',
    'empty-state',
    'error-alert',
    'loading-skeleton',
    'mobile-filter-button',
    'load-more-button'
  ];

  for (const pattern of commonPatterns) {
    if (missingTestIds.includes(pattern)) {
      suggestions.push(`Add data-testid="${pattern}" to main ${pattern.replace('-', ' ')} element`);
    }
  }

  return suggestions;
}

// =============================================================================
// COMMAND LINE UTILITIES
// =============================================================================

/**
 * CLI-friendly validation runner
 */
export async function validateAndReport(config?: Partial<ValidationConfig>): Promise<{ success: boolean, coverage: number }> {
  const finalConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  
  try {
    const { summary, report } = await runTestIdValidation(finalConfig);
    
    console.log(report);
    
    const suggestions = suggestMissingTestIds(await validateTestIdConsistency(finalConfig));
    if (suggestions.length > 0) {
      console.log('\n💡 Quick Fix Suggestions:');
      suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
      console.log('');
    }

    return {
      success: summary.coverage >= 80, // 80% threshold for success
      coverage: summary.coverage
    };
  } catch (error) {
    console.error('[TestIdValidator] Validation failed:', error);
    return { success: false, coverage: 0 };
  }
}