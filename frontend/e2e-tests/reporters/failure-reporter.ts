import type { Reporter, TestCase, TestError, TestResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface FailureInfo {
  test: string;
  file: string;
  line: number;
  device: string;
  error: string;
  stack: string;
}

export default class FailureReporter implements Reporter {
  private failures: FailureInfo[] = [];
  private outputPath: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputPath = options.outputFile || 'e2e-failures.txt';
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed' || result.status === 'timedOut') {
      const error = result.errors[0];
      if (error) {
        const failure: FailureInfo = {
          test: test.title,
          file: test.location.file,
          line: test.location.line,
          device: test.parent.title || 'Unknown',
          error: this.formatError(error),
          stack: this.formatStack(error)
        };
        this.failures.push(failure);
      }
    }
  }

  onEnd() {
    if (this.failures.length === 0) {
      console.log('\n✅ All tests passed!\n');
      return;
    }

    const report = this.generateReport();
    fs.writeFileSync(this.outputPath, report);
    
    console.log('\n' + '='.repeat(80));
    console.log('E2E TEST FAILURES - COPY/PASTE FRIENDLY FORMAT');
    console.log('='.repeat(80));
    console.log(report);
    console.log('='.repeat(80));
    console.log(`\n❌ ${this.failures.length} test(s) failed`);
    console.log(`📋 Full report saved to: ${this.outputPath}\n`);
  }

  private formatError(error: TestError): string {
    if (error.message) {
      // Clean up ANSI color codes and excessive whitespace
      return error.message
        .replace(/\u001b\[\d+m/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return 'Unknown error';
  }

  private formatStack(error: TestError): string {
    if (error.stack) {
      // Extract just the relevant file:line info
      const match = error.stack.match(/at\s+(.+?):(\d+):(\d+)/);
      if (match) {
        return `${match[1]}:${match[2]}:${match[3]}`;
      }
    }
    return '';
  }

  private generateReport(): string {
    const grouped = this.groupFailuresByError();
    let report = '';

    for (const [errorKey, failures] of Object.entries(grouped)) {
      report += `\n## ERROR: ${failures[0].error}\n\n`;
      report += `Failing tests (${failures.length}):\n`;
      
      for (const failure of failures) {
        report += `- ${failure.test} [${failure.device}]\n`;
        report += `  File: ${failure.file}:${failure.line}\n`;
        if (failure.stack) {
          report += `  Stack: ${failure.stack}\n`;
        }
      }
      report += '\n';
    }

    return report;
  }

  private groupFailuresByError(): Record<string, FailureInfo[]> {
    const grouped: Record<string, FailureInfo[]> = {};
    
    for (const failure of this.failures) {
      const key = failure.error.substring(0, 100); // Group by first 100 chars of error
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(failure);
    }

    return grouped;
  }
}