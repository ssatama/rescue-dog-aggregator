import { validateTestIdConsistency, ValidationConfig, DEFAULT_VALIDATION_CONFIG } from './testIdValidator';

// =============================================================================
// COMPONENT TEST ID CHECKER
// Build-time validation utilities for test ID consistency
// =============================================================================

/**
 * Test ID check result for individual components
 */
export interface ComponentTestIdCheckResult {
  componentFile: string;
  testIds: string[];
  referencedInPageObjects: string[];
  unreferencedTestIds: string[];
  isFullyCovered: boolean;
}

/**
 * Build-time validation result
 */
export interface BuildTimeValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalComponents: number;
    componentsWithTestIds: number;
    totalTestIds: number;
    referencedTestIds: number;
    unreferencedTestIds: number;
    coverage: number;
  };
}

/**
 * Check specific component for test ID usage
 */
export async function checkComponentTestIds(componentPath: string, config: ValidationConfig = DEFAULT_VALIDATION_CONFIG): Promise<ComponentTestIdCheckResult> {
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path');
  
  try {
    const content = await fs.readFile(componentPath, 'utf-8');
    const componentFile = path.basename(componentPath);
    
    // Extract test IDs from this component
    const dataTestIdMatches = content.match(/data-testid\s*=\s*["{`']([^"{`']+)["{`']/g) || [];
    const testIds = dataTestIdMatches.map(match => {
      const result = match.match(/["{`']([^"{`']+)["{`']/);
      return result ? result[1] : '';
    }).filter(id => id.length > 0 && !id.includes('${') && !id.includes('{'));

    // Get all page object test IDs to check references
    const validationResults = await validateTestIdConsistency(config);
    const pageObjectTestIds = new Set(validationResults.map(r => r.testId));
    
    const referencedInPageObjects = testIds.filter(id => pageObjectTestIds.has(id));
    const unreferencedTestIds = testIds.filter(id => !pageObjectTestIds.has(id));
    
    return {
      componentFile,
      testIds,
      referencedInPageObjects,
      unreferencedTestIds,
      isFullyCovered: unreferencedTestIds.length === 0 && testIds.length > 0
    };
  } catch (error) {
    throw new Error(`Failed to check component ${componentPath}: ${error}`);
  }
}

/**
 * Run build-time validation
 */
export async function runBuildTimeValidation(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG): Promise<BuildTimeValidationResult> {
  const glob = await import('glob').then(m => m.glob);
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Get validation results
    const validationResults = await validateTestIdConsistency(config);
    
    // Find all component files
    const componentFiles = await glob(`${config.componentsPath}/**/*.{${config.fileExtensions.join(',')}}`, {
      ignore: config.excludePatterns
    });

    let totalComponents = 0;
    let componentsWithTestIds = 0;
    let totalTestIds = 0;
    let referencedTestIds = 0;
    let unreferencedTestIds = 0;

    // Check each component
    for (const componentPath of componentFiles) {
      try {
        const result = await checkComponentTestIds(componentPath, config);
        totalComponents++;
        
        if (result.testIds.length > 0) {
          componentsWithTestIds++;
          totalTestIds += result.testIds.length;
          referencedTestIds += result.referencedInPageObjects.length;
          unreferencedTestIds += result.unreferencedTestIds.length;
        }
      } catch (error) {
        warnings.push(`Could not check component ${componentPath}: ${error}`);
      }
    }

    // Check for missing test IDs (used in page objects but not found in components)
    const missingTestIds = validationResults.filter(r => !r.isValid);
    for (const missing of missingTestIds) {
      errors.push(`Test ID "${missing.testId}" used in page objects [${missing.usedInPageObjects.join(', ')}] but not found in any component`);
    }

    // Calculate coverage
    const coverage = totalTestIds > 0 ? Math.round((referencedTestIds / totalTestIds) * 100) : 0;

    return {
      success: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalComponents,
        componentsWithTestIds,
        totalTestIds,
        referencedTestIds,
        unreferencedTestIds,
        coverage
      }
    };
  } catch (error) {
    errors.push(`Build-time validation failed: ${error}`);
    return {
      success: false,
      errors,
      warnings,
      summary: {
        totalComponents: 0,
        componentsWithTestIds: 0,
        totalTestIds: 0,
        referencedTestIds: 0,
        unreferencedTestIds: 0,
        coverage: 0
      }
    };
  }
}

/**
 * Format build-time validation report
 */
export function formatBuildTimeReport(result: BuildTimeValidationResult): string {
  const lines: string[] = [];
  
  lines.push('=== Build-Time Test ID Validation ===');
  lines.push('');
  
  if (result.success) {
    lines.push('✅ Build validation PASSED');
  } else {
    lines.push('❌ Build validation FAILED');
  }
  
  lines.push('');
  lines.push('📊 Summary:');
  lines.push(`   Components scanned: ${result.summary.totalComponents}`);
  lines.push(`   Components with test IDs: ${result.summary.componentsWithTestIds}`);
  lines.push(`   Total test IDs found: ${result.summary.totalTestIds}`);
  lines.push(`   Referenced in page objects: ${result.summary.referencedTestIds}`);
  lines.push(`   Unreferenced test IDs: ${result.summary.unreferencedTestIds}`);
  lines.push(`   Test ID usage coverage: ${result.summary.coverage}%`);
  lines.push('');

  if (result.errors.length > 0) {
    lines.push('❌ Errors:');
    result.errors.forEach(error => lines.push(`   - ${error}`));
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('⚠️  Warnings:');
    result.warnings.forEach(warning => lines.push(`   - ${warning}`));
    lines.push('');
  }

  if (!result.success) {
    lines.push('🔧 How to fix:');
    lines.push('   1. Add missing data-testid attributes to components');
    lines.push('   2. Ensure test ID names match exactly');
    lines.push('   3. Use kebab-case naming convention');
    lines.push('   4. Remove unused test IDs from page objects');
    lines.push('');
  }

  lines.push('=====================================');
  
  return lines.join('\n');
}

/**
 * Exit code for build-time validation
 */
export function getBuildExitCode(result: BuildTimeValidationResult): number {
  return result.success ? 0 : 1;
}

/**
 * Run validation suitable for CI/CD pipelines
 */
export async function validateForBuild(config?: Partial<ValidationConfig>): Promise<{ exitCode: number; report: string }> {
  const finalConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  
  try {
    const result = await runBuildTimeValidation(finalConfig);
    const report = formatBuildTimeReport(result);
    const exitCode = getBuildExitCode(result);
    
    return { exitCode, report };
  } catch (error) {
    const report = `❌ Build-time validation crashed: ${error}`;
    return { exitCode: 1, report };
  }
}