import { Page, Route } from 'playwright/test';
import { Dog } from './testData';

export interface EdgeCaseConfig {
  allowEmptyStrings?: boolean;
  allowNullValues?: boolean;
  allowSpecialCharacters?: boolean;
  allowMalformedParams?: boolean;
  maxStringLength?: number;
  validationMode?: 'strict' | 'lenient' | 'none';
}

export interface ErrorScenario {
  type: 'network' | 'server' | 'validation' | 'rateLimit' | 'corruption' | 'partial' | 'timeout';
  status?: number;
  message?: string;
  details?: Record<string, any>;
  retryAfter?: number;
  affectedFields?: string[];
}

/**
 * Advanced API mocking utilities for edge case testing
 * Use this for SQL injection, XSS, rate limiting, and other specialized scenarios
 */
export class AdvancedApiMocker {
  private requestCount: Map<string, number> = new Map();
  private rateLimitThreshold: number = 10;
  private edgeConfig: EdgeCaseConfig = {
    allowEmptyStrings: false,
    allowNullValues: false,
    allowSpecialCharacters: true,
    allowMalformedParams: false,
    maxStringLength: 255,
    validationMode: 'strict'
  };

  constructor(private page: Page, edgeConfig?: Partial<EdgeCaseConfig>) {
    if (edgeConfig) {
      this.edgeConfig = { ...this.edgeConfig, ...edgeConfig };
    }
  }

  async setupSQLInjectionTesting(endpoint: string) {
    await this.page.route(endpoint, async (route: Route) => {
      const url = new URL(route.request().url());
      const params = Object.fromEntries(url.searchParams);
      
      for (const [key, value] of Object.entries(params)) {
        if (this.containsSQLInjection(value)) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid parameter',
              message: `Parameter '${key}' contains potentially malicious content`,
              timestamp: new Date().toISOString()
            })
          });
          return;
        }
      }
      
      await route.continue();
    });
  }

  async setupXSSProtectionTesting(endpoint: string) {
    await this.page.route(endpoint, async (route: Route) => {
      const url = new URL(route.request().url());
      const params = Object.fromEntries(url.searchParams);
      
      for (const [key, value] of Object.entries(params)) {
        if (this.containsXSS(value)) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid parameter',
              message: `Parameter '${key}' contains potentially unsafe content`,
              timestamp: new Date().toISOString()
            })
          });
          return;
        }
      }
      
      await route.continue();
    });
  }

  async setupRateLimitTesting(endpoint: string, threshold: number = 5) {
    this.rateLimitThreshold = threshold;
    
    await this.page.route(endpoint, async (route: Route) => {
      if (this.isRateLimited(route.request().url())) {
        await this.handleRateLimitError(route);
        return;
      }
      
      await route.continue();
    });
  }

  async setupDataCorruptionTesting(endpoint: string, corruptionRate: number = 0.3) {
    await this.page.route(endpoint, async (route: Route) => {
      if (Math.random() < corruptionRate) {
        const response = await route.fetch();
        const data = await response.json();
        const corruptedData = this.corruptData(data);
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(corruptedData)
        });
      } else {
        await route.continue();
      }
    });
  }

  async setupPartialFailureTesting(endpoint: string, failureRate: number = 0.3) {
    await this.page.route(endpoint, async (route: Route) => {
      const response = await route.fetch();
      const data = await response.json();
      
      if (Array.isArray(data) && Math.random() < failureRate) {
        const partialData = data.map((item, index) => {
          if (index % 3 === 0) {
            return {
              error: 'Failed to load this item',
              originalId: item.id
            };
          }
          return item;
        });
        
        await route.fulfill({
          status: 207, // Multi-Status
          contentType: 'application/json',
          headers: {
            'X-Partial-Failure': 'true',
            'X-Failed-Items': Math.floor(data.length / 3).toString()
          },
          body: JSON.stringify(partialData)
        });
      } else {
        await route.continue();
      }
    });
  }

  async setupCascadingFailures(endpoints: string[]) {
    let failureCount = 0;
    
    for (const endpoint of endpoints) {
      await this.page.route(endpoint, async (route: Route) => {
        failureCount++;
        
        // First few requests succeed
        if (failureCount <= 3) {
          await route.continue();
          return;
        }
        
        // Then start introducing failures
        if (failureCount <= 6) {
          await route.fulfill({
            status: 503,
            body: JSON.stringify({ error: 'Service degraded' })
          });
          return;
        }
        
        // Complete failure
        await route.abort('failed');
      });
    }
  }

  async setupIntermittentFailures(endpoints: string[], failureRate: number = 0.3) {
    for (const endpoint of endpoints) {
      await this.page.route(endpoint, async (route: Route) => {
        if (Math.random() < failureRate) {
          const errors = [
            { status: 500, message: 'Internal Server Error' },
            { status: 503, message: 'Service Unavailable' },
            { status: 504, message: 'Gateway Timeout' },
            { status: 502, message: 'Bad Gateway' }
          ];
          
          const error = errors[Math.floor(Math.random() * errors.length)];
          
          await route.fulfill({
            status: error.status,
            body: JSON.stringify({ error: error.message })
          });
        } else {
          await route.continue();
        }
      });
    }
  }

  private containsSQLInjection(value: string): boolean {
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\|\|)|(\*)|(%))/, // Basic SQL injection patterns
      /(union.*select)/i,
      /(insert.*into)/i,
      /(delete.*from)/i,
      /(drop.*table)/i,
      /(update.*set)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(value));
  }
  
  private containsXSS(value: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // Event handlers like onclick=
      /<img[^>]*onerror=/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(value));
  }

  private isRateLimited(url: string): boolean {
    const count = this.requestCount.get(url) || 0;
    this.requestCount.set(url, count + 1);
    
    return count >= this.rateLimitThreshold;
  }
  
  private async handleRateLimitError(route: Route): Promise<void> {
    await route.fulfill({
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
        'X-RateLimit-Limit': this.rateLimitThreshold.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
      },
      body: JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 60
      })
    });
  }

  private corruptData(data: unknown): unknown {
    if (Array.isArray(data)) {
      return data.map(item => this.corruptObject(item));
    }
    return this.corruptObject(data);
  }

  private corruptObject(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;

    const objRecord = obj as Record<string, unknown>;
    const corrupted: Record<string, unknown> = { ...objRecord };
    const keys = Object.keys(corrupted);

    // Randomly corrupt some fields
    keys.forEach(key => {
      const corruption = Math.random();

      if (corruption < 0.2) {
        // Delete field
        delete corrupted[key];
      } else if (corruption < 0.4) {
        // Set to null
        corrupted[key] = null;
      } else if (corruption < 0.6 && typeof corrupted[key] === 'string') {
        // Corrupt string
        corrupted[key] = this.corruptString(corrupted[key] as string);
      } else if (corruption < 0.8 && typeof corrupted[key] === 'number') {
        // Corrupt number
        corrupted[key] = NaN;
      }
    });

    return corrupted;
  }
  
  private corruptString(str: string): string {
    const corruptions = [
      () => str + '\x00', // Add null byte
      () => str.replace(/./g, '�'), // Replace with replacement characters
      () => btoa(str), // Base64 encode unexpectedly
      () => str.substring(0, Math.floor(str.length / 2)), // Truncate
      () => '', // Empty string
    ];
    
    const corruption = corruptions[Math.floor(Math.random() * corruptions.length)];
    return corruption();
  }

  resetRateLimits(): void {
    this.requestCount.clear();
  }
  
  setRateLimitThreshold(threshold: number): void {
    this.rateLimitThreshold = threshold;
  }
}

// Specialized error scenario generators
export class ErrorScenarioGenerator {
  static generateTimeoutError(): ErrorScenario {
    return {
      type: 'timeout',
      status: 504,
      message: 'Gateway Timeout',
      details: {
        timeout: 30000,
        upstream: 'backend-service'
      }
    };
  }
  
  static generateDatabaseError(): ErrorScenario {
    return {
      type: 'server',
      status: 500,
      message: 'Database connection failed',
      details: {
        code: 'DB_CONNECTION_ERROR',
        database: 'rescue_dogs',
        retries: 3
      }
    };
  }
  
  static generateValidationErrors(fields: string[]): ErrorScenario {
    return {
      type: 'validation',
      status: 422,
      message: 'Validation failed',
      details: {
        errors: fields.map(field => ({
          field,
          message: `Invalid value for ${field}`,
          code: `INVALID_${field.toUpperCase()}`
        }))
      },
      affectedFields: fields
    };
  }
  
  static generateCORSError(): ErrorScenario {
    return {
      type: 'network',
      status: 0,
      message: 'CORS policy blocked the request',
      details: {
        origin: 'http://localhost:3000',
        allowedOrigins: ['https://api.rescuedogs.org']
      }
    };
  }
  
  static generateMaintenanceError(): ErrorScenario {
    return {
      type: 'server',
      status: 503,
      message: 'Service temporarily unavailable for maintenance',
      details: {
        maintenanceWindow: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 3600000).toISOString()
        },
        contactEmail: 'support@rescuedogs.org'
      }
    };
  }
  
  static generateQuotaExceededError(): ErrorScenario {
    return {
      type: 'rateLimit',
      status: 429,
      message: 'API quota exceeded',
      details: {
        quotaLimit: 1000,
        quotaUsed: 1000,
        quotaReset: new Date(Date.now() + 86400000).toISOString(),
        upgradeUrl: 'https://api.rescuedogs.org/pricing'
      },
      retryAfter: 86400
    };
  }
}

// Test data for edge cases
export const EdgeCaseTestData = {
  malformedInputs: {
    sqlInjection: [
      "'; DROP TABLE animals; --",
      "1' OR '1'='1",
      "admin'--",
      "1; DELETE FROM animals WHERE 1=1"
    ],
    xssAttacks: [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "javascript:alert('XSS')",
      "<iframe src='javascript:alert(\"XSS\")'></iframe>"
    ],
    specialCharacters: [
      "test\x00null",
      "test\r\ninjection",
      "test\u0000unicode",
      "test\uFFFDreplacement",
      String.fromCharCode(0x00, 0x01, 0x02, 0x03)
    ],
    emptyValues: [
      "",
      " ",
      "   ",
      "\t",
      "\n",
      "\r\n"
    ],
    oversizedInputs: [
      "a".repeat(1000),
      "very-long-slug-" + "x".repeat(200),
      "search-" + "term".repeat(100)
    ],
    numericEdgeCases: [
      "-1",
      "0",
      "999999999",
      "1.5",
      "NaN",
      "Infinity",
      "-Infinity",
      "1e10",
      "0x10",
      "010" // Octal
    ],
    encodedInputs: [
      "%3Cscript%3E",
      "&#60;script&#62;",
      "\\x3cscript\\x3e",
      btoa("<script>alert('XSS')</script>"),
      encodeURIComponent("test & special = chars")
    ]
  },
  
  generateMalformedQueryParams(): string {
    const params = [
      "limit=-1",
      "offset=abc",
      "search=",
      "breed=null",
      "size=undefined",
      "organization_id=",
      "available_to_country=<script>",
      "sex=unknown",
      "age_category=999"
    ];
    
    return params[Math.floor(Math.random() * params.length)];
  },
  
  generateCorruptedDog(validDog: Dog): Partial<Dog> & Record<string, unknown> {
    const corruptions: Array<Partial<Dog> & Record<string, unknown>> = [
      { ...validDog, id: null as unknown as number },
      { ...validDog, name: "" },
      { ...validDog, slug: undefined },
      { ...validDog, primary_image_url: "not-a-url" },
      { ...validDog, organization_id: "not-a-number" as unknown as number },
      { ...validDog, created_at: "invalid-date" },
      { ...validDog, age_min_months: -5 },
      { ...validDog, standardized_size: "XXXL" },
      { ...validDog, status: "deleted" },
      { name: validDog.name } // Missing most required fields
    ];

    return corruptions[Math.floor(Math.random() * corruptions.length)];
  }
};

// Helper class for testing error recovery
export class ErrorRecoveryTester {
  constructor(private page: Page, private mocker: AdvancedApiMocker) {}
  
  async testRetryMechanism(endpoint: string, maxRetries: number = 3): Promise<boolean> {
    let attempts = 0;
    
    await this.page.route(endpoint, async (route) => {
      attempts++;
      
      if (attempts < maxRetries) {
        // Fail first attempts
        await route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Service temporarily unavailable' })
        });
      } else {
        // Succeed on final attempt
        await route.continue();
      }
    });
    
    return attempts === maxRetries;
  }
  
  async testCircuitBreaker(endpoint: string, threshold: number = 5): Promise<void> {
    let failureCount = 0;
    let circuitOpen = false;
    
    await this.page.route(endpoint, async (route) => {
      if (circuitOpen) {
        await route.fulfill({
          status: 503,
          body: JSON.stringify({ 
            error: 'Circuit breaker open',
            retryAfter: 60 
          })
        });
        return;
      }
      
      failureCount++;
      
      if (failureCount >= threshold) {
        circuitOpen = true;
      }
      
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
  }
  
  async testGracefulDegradation(primaryEndpoint: string, fallbackEndpoint: string): Promise<void> {
    // Primary endpoint fails
    await this.page.route(primaryEndpoint, async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Primary service unavailable' })
      });
    });
    
    // Fallback endpoint succeeds with limited data
    await this.page.route(fallbackEndpoint, async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: [],
          degraded: true,
          message: 'Using cached data'
        })
      });
    });
  }
}

// Chaos testing utilities
export class ChaosTestingUtility {
  static async injectRandomFailures(page: Page, config: {
    failureRate: number;
    delayRange: [number, number];
    errorTypes: string[];
  }): Promise<void> {
    await page.route('**/api/**', async (route) => {
      // Random delay
      const delay = Math.random() * (config.delayRange[1] - config.delayRange[0]) + config.delayRange[0];
      await page.waitForTimeout(delay);
      
      // Random failure
      if (Math.random() < config.failureRate) {
        const errorType = config.errorTypes[Math.floor(Math.random() * config.errorTypes.length)];
        
        switch (errorType) {
          case 'timeout':
            // Don't respond at all
            return;
            
          case 'network':
            await route.abort('failed');
            break;
            
          case 'server':
            await route.fulfill({
              status: 500 + Math.floor(Math.random() * 5),
              body: JSON.stringify({ error: 'Random server error' })
            });
            break;
            
          case 'corruption':
            const response = await route.fetch();
            const data = await response.json();
            await route.fulfill({
              status: 200,
              body: JSON.stringify(Array.isArray(data) ? data.slice(0, 1) : {})
            });
            break;
            
          default:
            await route.continue();
        }
      } else {
        await route.continue();
      }
    });
  }
}

// Convenience setup functions for advanced scenarios
export async function setupAdvancedSecurityTesting(page: Page): Promise<AdvancedApiMocker> {
  const mocker = new AdvancedApiMocker(page, {
    validationMode: 'strict',
    allowEmptyStrings: false,
    allowNullValues: false,
    maxStringLength: 100
  });
  
  await mocker.setupSQLInjectionTesting('**/api/**');
  await mocker.setupXSSProtectionTesting('**/api/**');
  
  return mocker;
}

export async function setupStressTestingScenarios(page: Page): Promise<AdvancedApiMocker> {
  const mocker = new AdvancedApiMocker(page);
  
  await mocker.setupRateLimitTesting('**/api/**', 5);
  await mocker.setupDataCorruptionTesting('**/api/**', 0.1);
  await mocker.setupPartialFailureTesting('**/api/**', 0.1);
  
  return mocker;
}

export async function setupChaosTestingScenarios(page: Page): Promise<void> {
  await ChaosTestingUtility.injectRandomFailures(page, {
    failureRate: 0.2,
    delayRange: [100, 2000],
    errorTypes: ['network', 'server', 'timeout', 'corruption']
  });
}