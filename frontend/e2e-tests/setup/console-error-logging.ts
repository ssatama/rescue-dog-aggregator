import { Page } from 'playwright/test';

export interface ConsoleErrorOptions {
  throwOnError?: boolean;
  ignorePatterns?: RegExp[];
  logLevel?: 'error' | 'warn' | 'all';
}

export class ConsoleErrorLogger {
  private consoleErrors: string[] = [];
  private consoleWarnings: string[] = [];
  private pageErrors: string[] = [];
  private options: ConsoleErrorOptions;

  constructor(private page: Page, options: ConsoleErrorOptions = {}) {
    this.options = {
      throwOnError: true,
      ignorePatterns: [],
      logLevel: 'error',
      ...options
    };
    this.setupErrorListeners();
  }

  private setupErrorListeners(): void {
    // Listen for uncaught exceptions on the page
    this.page.on('pageerror', exception => {
      const errorMessage = `Uncaught exception in page: ${exception.message}`;
      this.pageErrors.push(errorMessage);
      
      if (this.options.throwOnError && !this.shouldIgnoreError(errorMessage)) {
        throw new Error(errorMessage);
      }
    });

    // Listen for console messages
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        this.consoleErrors.push(text);
        
        if (this.options.throwOnError && !this.shouldIgnoreError(text)) {
          throw new Error(`Console error: ${text}`);
        }
      } else if (type === 'warning' && this.options.logLevel !== 'error') {
        this.consoleWarnings.push(text);
      }
    });

    // Listen for request failures
    this.page.on('requestfailed', request => {
      const errorMessage = `Request failed: ${request.url()} - ${request.failure()?.errorText}`;
      this.pageErrors.push(errorMessage);
      
      if (this.options.throwOnError && !this.shouldIgnoreError(errorMessage)) {
        throw new Error(errorMessage);
      }
    });
  }

  private shouldIgnoreError(errorMessage: string): boolean {
    return this.options.ignorePatterns?.some(pattern => pattern.test(errorMessage)) || false;
  }

  getConsoleErrors(): string[] {
    return [...this.consoleErrors];
  }

  getConsoleWarnings(): string[] {
    return [...this.consoleWarnings];
  }

  getPageErrors(): string[] {
    return [...this.pageErrors];
  }

  getAllErrors(): { consoleErrors: string[]; consoleWarnings: string[]; pageErrors: string[] } {
    return {
      consoleErrors: this.getConsoleErrors(),
      consoleWarnings: this.getConsoleWarnings(),
      pageErrors: this.getPageErrors()
    };
  }

  hasErrors(): boolean {
    return this.consoleErrors.length > 0 || this.pageErrors.length > 0;
  }

  hasWarnings(): boolean {
    return this.consoleWarnings.length > 0;
  }

  clearErrors(): void {
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this.pageErrors = [];
  }

  getErrorReport(): string {
    const errors = this.getAllErrors();
    let report = '';

    if (errors.consoleErrors.length > 0) {
      report += `Console Errors (${errors.consoleErrors.length}):\n`;
      errors.consoleErrors.forEach((error, index) => {
        report += `  ${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    if (errors.pageErrors.length > 0) {
      report += `Page Errors (${errors.pageErrors.length}):\n`;
      errors.pageErrors.forEach((error, index) => {
        report += `  ${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    if (errors.consoleWarnings.length > 0 && this.options.logLevel !== 'error') {
      report += `Console Warnings (${errors.consoleWarnings.length}):\n`;
      errors.consoleWarnings.forEach((warning, index) => {
        report += `  ${index + 1}. ${warning}\n`;
      });
    }

    return report.trim() || 'No errors or warnings detected.';
  }
}

// Helper function to create console error logger with common ignore patterns
export function createConsoleErrorLogger(page: Page, options: ConsoleErrorOptions = {}): ConsoleErrorLogger {
  const defaultIgnorePatterns = [
    /favicon\.ico.*404/,  // Ignore favicon 404s
    /Download the React DevTools/,  // Ignore React DevTools message
    /React Router Future Flag Warning/,  // Ignore React Router warnings
    /Non-serializable values were found in the navigation state/,  // Ignore Next.js navigation warnings
    /broken-image-url-that-will-404\.com/,  // Ignore expected broken image errors for testing
    /Server.*API request failed.*broken-image-dog.*Animal not found/,  // Ignore expected API errors for broken-image-dog
    /%c%s%c.*Server.*API request failed.*broken-image-dog.*Animal not found/,  // Ignore formatted console errors for broken-image-dog
    /%c%s%c.*Server.*API request failed.*non-existent-dog-slug.*Animal not found/,  // Ignore expected API errors for not-found tests
    /Error: API request failed Context: \{endpoint: \/api\/animals\/non-existent-dog-slug, error: API error: 404 Not Found\}/,  // Ignore expected API errors for not-found tests (new format)
    /Error: Error fetching dog data Context: \{message: API error: 404 Not Found, name: Error, dogSlug: non-existent-dog-slug, retryCount: \d+, fetchDuration: \d+\}/,  // Ignore expected dog fetching errors for not-found tests
    /Failed to load resource.*404.*Not Found/,  // Ignore expected image loading failures for error state testing
    /Failed to load resource.*ERR_NAME_NOT_RESOLVED/,  // Ignore expected DNS resolution failures for broken image testing
    /Request failed.*ERR_ABORTED/,  // Ignore expected request aborts during navigation transitions
    /Request failed.*net::ERR_BLOCKED_BY_ORB/,  // Ignore ORB (Origin-Resource-Blocking) errors for test images
    /All image loading attempts failed, using placeholder/,  // Ignore expected image fallback messages
    /%c%s%c.*Server.*API request failed.*bella-labrador-mix.*Animal not found/,  // Ignore expected API errors for related dog navigation tests
    /Encountered two children with the same key.*Keys should be unique/,  // Ignore React key warnings in test environment
    /Failed to load resource.*500.*Internal Server Error/,  // Ignore expected 500 errors for error state testing
    /Dogs service temporarily unavailable/,  // Ignore expected dogs service errors for error state testing
    /Error: API request failed Context:.*curation_type=.*error: API error: 500 Internal Server Error/,  // Ignore expected API errors for dogs error state testing with any curation type
    /Error: Error fetching.*dogs Context:.*error: API error: 500 Internal Server Error/,  // Ignore expected dogs fetching errors for error state testing
    /Error: API request failed Context:.*\/api\/animals\/statistics.*error: API error: 500 Internal Server Error/,  // Ignore expected statistics API errors for trust section error state testing
    /Error: Error fetching.*statistics Context:.*error: API error: 500 Internal Server Error/,  // Ignore expected statistics fetching errors from reportError function for trust section error state testing
    /%c%s%c.*Server.*API request failed.*endpoint: \/api\/organizations\/.*error: Organization not found/,  // Ignore expected organization not found errors for navigation tests
    
    // Firefox-specific patterns - Firefox represents complex objects as JSHandle@object in console logs
    /Error: API request failed Context: JSHandle@object/,  // Firefox version of API request failed errors
    /.*Server.*Error: API request failed Context: JSHandle@object/,  // Firefox version with Server prefix
    /Error: Error fetching.*Context: JSHandle@object/,  // Firefox version of fetch errors
    /.*Server.*Error: Error fetching.*Context: JSHandle@object/,  // Firefox version of fetch errors with Server prefix
    
    // Firefox NS_BINDING_ABORTED errors for external images during navigation
    /Request failed:.*flagcdn\.com.*NS_BINDING_ABORTED/,  // Flag images cancelled during navigation
    /Request failed:.*logos.*NS_BINDING_ABORTED/,  // Logo images cancelled during navigation  
    /Request failed:.*example\.com.*NS_BINDING_ABORTED/,  // Mock images cancelled during navigation
    /Request failed:.*example\.com.*cancelled/,  // Cross-browser cancelled requests for mock images
    /Request failed:.*logos.*cancelled/,  // Cross-browser cancelled requests for logos
  ];

  return new ConsoleErrorLogger(page, {
    ...options,
    ignorePatterns: [...defaultIgnorePatterns, ...(options.ignorePatterns || [])]
  });
}