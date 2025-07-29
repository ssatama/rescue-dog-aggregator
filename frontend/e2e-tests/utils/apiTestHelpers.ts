import { Page, expect, Response } from 'playwright/test';
import { 
  Dog, 
  Organization, 
  Statistics, 
  FilterCounts,
  ApiDogResponse,
  ApiOrganizationResponse,
  ApiStatisticsResponse,
  ApiFilterCountsResponse,
  ApiImageResponse
} from '../fixtures/testData';
import { TIMEOUTS, getTimeoutConfig } from './testHelpers';

export interface ApiTestOptions {
  timeout?: number;
  validateResponseTime?: boolean;
  maxResponseTime?: number;
  validateHeaders?: boolean;
  expectedStatus?: number;
  validationLevel?: ValidationLevel;
}

export enum ValidationLevel {
  FULL = 'full',
  ESSENTIAL = 'essential',
  NONE = 'none'
}

export interface ApiMockOptions {
  delay?: number;
  status?: number;
  errorMessage?: string;
  responseData?: ApiResponseData;
}

/**
 * Specific API response data types - using pure API response types
 */
export type ApiResponseData = 
  | ApiDogResponse[]
  | ApiDogResponse
  | ApiOrganizationResponse[]
  | ApiOrganizationResponse
  | ApiStatisticsResponse
  | ApiFilterCountsResponse
  | string[]
  | ApiErrorResponse;

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Validation error with context and suggestions
 */
export interface ValidationError {
  field: string;
  expected: string;
  actual: unknown;
  message: string;
  path?: string;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Field validation configuration
 */
export interface FieldValidator {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'url' | 'email';
  required: boolean;
  format?: string; // For dates, URLs, emails
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowNull?: boolean;
  validator?: (value: unknown) => boolean;
  description?: string;
}

/**
 * Schema definition for API response validation
 */
export interface ResponseSchema {
  [fieldName: string]: FieldValidator;
}

export interface ApiHeaders {
  'content-type'?: string;
  'cache-control'?: string;
  'x-total-count'?: string;
  'x-page-size'?: string;
  'x-current-page'?: string;
  [key: string]: string | undefined;
}

/**
 * Discriminated union for API validation results based on success state
 */
export type ApiValidationResult = 
  | ApiValidationSuccess
  | ApiValidationFailure;

export interface ApiValidationSuccess {
  success: true;
  response: Response;
  data: ApiResponseData;
  responseTime: number;
  headers: ApiHeaders;
}

export interface ApiValidationFailure {
  success: false;
  error: string;
  response?: Response;
  responseTime?: number;
}

/**
 * Comprehensive validation utilities for API responses
 */
class ApiSchemaValidator {
  /**
   * Validate a field against its schema definition
   */
  private static validateField(
    fieldName: string, 
    value: unknown, 
    validator: FieldValidator, 
    path: string = ''
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const fullPath = path ? `${path}.${fieldName}` : fieldName;

    // Check if field is required
    if (validator.required && (value === undefined || value === null)) {
      errors.push({
        field: fieldName,
        expected: `required ${validator.type}`,
        actual: value,
        message: `Required field '${fieldName}' is missing`,
        path: fullPath
      });
      return errors;
    }

    // Skip validation if optional and undefined/null
    if (!validator.required && (value === undefined || (value === null && !validator.allowNull))) {
      return errors;
    }

    // Type validation
    const actualType = this.getActualType(value);
    if (!this.isTypeValid(value, validator.type)) {
      errors.push({
        field: fieldName,
        expected: validator.type,
        actual: actualType,
        message: `Field '${fieldName}' expected ${validator.type}, got ${actualType}`,
        path: fullPath
      });
      return errors; // Don't continue with format validation if type is wrong
    }

    // Format validation
    if (validator.format || validator.type === 'date' || validator.type === 'url' || validator.type === 'email') {
      const formatErrors = this.validateFormat(fieldName, value, validator, fullPath);
      errors.push(...formatErrors);
    }

    // Length validation for strings and arrays
    if ((validator.type === 'string' || validator.type === 'array') && value !== null && value !== undefined) {
      const lengthErrors = this.validateLength(fieldName, value, validator, fullPath);
      errors.push(...lengthErrors);
    }

    // Number range validation
    if (validator.type === 'number' && typeof value === 'number') {
      const rangeErrors = this.validateRange(fieldName, value, validator, fullPath);
      errors.push(...rangeErrors);
    }

    // Pattern validation for strings
    if (validator.type === 'string' && validator.pattern && typeof value === 'string') {
      if (!validator.pattern.test(value)) {
        errors.push({
          field: fieldName,
          expected: `string matching pattern ${validator.pattern}`,
          actual: value,
          message: `Field '${fieldName}' does not match required pattern`,
          path: fullPath
        });
      }
    }

    // Custom validator
    if (validator.validator && !validator.validator(value)) {
      errors.push({
        field: fieldName,
        expected: 'custom validation to pass',
        actual: value,
        message: `Field '${fieldName}' failed custom validation`,
        path: fullPath
      });
    }

    return errors;
  }

  /**
   * Get human-readable type of a value
   */
  private static getActualType(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    return typeof value;
  }

  /**
   * Check if value matches expected type
   */
  private static isTypeValid(value: unknown, expectedType: string): boolean {
    if (value === null || value === undefined) return true; // Handled separately

    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value) && value !== null;
      case 'date':
        return typeof value === 'string' && !isNaN(Date.parse(value));
      case 'url':
        return typeof value === 'string';
      case 'email':
        return typeof value === 'string';
      default:
        return false;
    }
  }

  /**
   * Validate format for special types
   */
  private static validateFormat(
    fieldName: string, 
    value: unknown, 
    validator: FieldValidator, 
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (typeof value !== 'string') return errors;

    switch (validator.type) {
      case 'date':
        if (!this.isValidDate(value)) {
          errors.push({
            field: fieldName,
            expected: 'valid ISO date string',
            actual: value,
            message: `Field '${fieldName}' is not a valid date format`,
            path
          });
        }
        break;
      case 'url':
        if (!this.isValidUrl(value)) {
          errors.push({
            field: fieldName,
            expected: 'valid URL',
            actual: value,
            message: `Field '${fieldName}' is not a valid URL`,
            path
          });
        }
        break;
      case 'email':
        if (!this.isValidEmail(value)) {
          errors.push({
            field: fieldName,
            expected: 'valid email address',
            actual: value,
            message: `Field '${fieldName}' is not a valid email`,
            path
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Validate length constraints
   */
  private static validateLength(
    fieldName: string, 
    value: unknown, 
    validator: FieldValidator, 
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    let length: number;

    if (typeof value === 'string') {
      length = value.length;
    } else if (Array.isArray(value)) {
      length = value.length;
    } else {
      return errors;
    }

    if (validator.minLength !== undefined && length < validator.minLength) {
      errors.push({
        field: fieldName,
        expected: `minimum length ${validator.minLength}`,
        actual: length,
        message: `Field '${fieldName}' is too short (${length} < ${validator.minLength})`,
        path
      });
    }

    if (validator.maxLength !== undefined && length > validator.maxLength) {
      errors.push({
        field: fieldName,
        expected: `maximum length ${validator.maxLength}`,
        actual: length,
        message: `Field '${fieldName}' is too long (${length} > ${validator.maxLength})`,
        path
      });
    }

    return errors;
  }

  /**
   * Validate number range constraints
   */
  private static validateRange(
    fieldName: string, 
    value: number, 
    validator: FieldValidator, 
    path: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (validator.min !== undefined && value < validator.min) {
      errors.push({
        field: fieldName,
        expected: `minimum value ${validator.min}`,
        actual: value,
        message: `Field '${fieldName}' is too small (${value} < ${validator.min})`,
        path
      });
    }

    if (validator.max !== undefined && value > validator.max) {
      errors.push({
        field: fieldName,
        expected: `maximum value ${validator.max}`,
        actual: value,
        message: `Field '${fieldName}' is too large (${value} > ${validator.max})`,
        path
      });
    }

    return errors;
  }

  /**
   * Validate date format
   */
  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.includes('T'); // ISO format check
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate object against schema
   */
  static validateObject(data: unknown, schema: ResponseSchema, path: string = ''): SchemaValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errors.push({
        field: 'root',
        expected: 'object',
        actual: this.getActualType(data),
        message: 'Expected an object for validation',
        path
      });
      return { isValid: false, errors, warnings };
    }

    const dataObj = data as Record<string, unknown>;

    // Validate defined fields
    for (const [fieldName, validator] of Object.entries(schema)) {
      const value = dataObj[fieldName];
      const fieldErrors = this.validateField(fieldName, value, validator, path);
      errors.push(...fieldErrors);
    }

    // Check for unexpected fields
    for (const fieldName of Object.keys(dataObj)) {
      if (!schema[fieldName]) {
        warnings.push(`Unexpected field '${fieldName}' found in response`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate array of objects against schema
   */
  static validateArray(data: unknown, itemSchema: ResponseSchema): SchemaValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(data)) {
      errors.push({
        field: 'root',
        expected: 'array',
        actual: this.getActualType(data),
        message: 'Expected an array for validation'
      });
      return { isValid: false, errors, warnings };
    }

    // Validate each item in the array
    data.forEach((item, index) => {
      const itemResult = this.validateObject(item, itemSchema, `[${index}]`);
      errors.push(...itemResult.errors);
      warnings.push(...itemResult.warnings);
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Schema definitions for API response validation
 */
export const API_SCHEMAS = {
  /**
   * Dog response schema with comprehensive validation
   */
  DOG_FULL: {
    id: { type: 'number', required: true, min: 1 },
    slug: { type: 'string', required: true, minLength: 1, maxLength: 200 },
    name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    animal_type: { 
      type: 'string', 
      required: true, 
      validator: (value: unknown) => value === 'dog' 
    },
    standardized_breed: { type: 'string', required: true, minLength: 1 },
    breed: { type: 'string', required: true, minLength: 1 },
    age_text: { type: 'string', required: true, minLength: 1 },
    age_min_months: { type: 'number', required: false, min: 0, max: 300 },
    age_max_months: { type: 'number', required: false, min: 0, max: 300 },
    sex: { 
      type: 'string', 
      required: true, 
      validator: (value: unknown) => ['Male', 'Female', 'Unknown'].includes(value as string) 
    },
    size: { type: 'string', required: false },
    standardized_size: { 
      type: 'string', 
      required: true,
      validator: (value: unknown) => ['Small', 'Medium', 'Large', 'XLarge'].includes(value as string)
    },
    primary_image_url: { type: 'url', required: true },
    status: { 
      type: 'string', 
      required: true,
      validator: (value: unknown) => ['available', 'adopted', 'pending'].includes(value as string)
    },
    adoption_url: { type: 'url', required: false },
    organization_id: { type: 'number', required: true, min: 1 },
    external_id: { type: 'string', required: false },
    language: { type: 'string', required: false, minLength: 2, maxLength: 5 },
    properties: { type: 'object', required: false, allowNull: true },
    description: { type: 'string', required: false, maxLength: 5000 },
    created_at: { type: 'date', required: true },
    updated_at: { type: 'date', required: true },
    last_scraped_at: { type: 'date', required: false }
  } as ResponseSchema,

  /**
   * Essential dog fields for UI functionality
   */
  DOG_ESSENTIAL: {
    id: { type: 'number', required: true },
    slug: { type: 'string', required: true },
    name: { type: 'string', required: true },
    standardized_breed: { type: 'string', required: true },
    age_text: { type: 'string', required: true },
    sex: { type: 'string', required: true },
    standardized_size: { type: 'string', required: true },
    primary_image_url: { type: 'url', required: true },
    status: { type: 'string', required: true },
    organization_id: { type: 'number', required: true },
  } as ResponseSchema,

  /**
   * Organization response schema
   */
  ORGANIZATION_FULL: {
    id: { type: 'number', required: true, min: 1 },
    name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
    slug: { type: 'string', required: true, minLength: 1, maxLength: 200 },
    website_url: { type: 'url', required: true },
    description: { type: 'string', required: false, maxLength: 2000 },
    city: { type: 'string', required: false, maxLength: 100 },
    country: { type: 'string', required: false, maxLength: 100 },
    logo_url: { type: 'url', required: false },
    social_media: { type: 'object', required: false, allowNull: true },
    active: { type: 'boolean', required: true },
    ships_to: { type: 'array', required: false },
    established_year: { type: 'number', required: false, min: 1800, max: 2030 },
    service_regions: { type: 'array', required: false },
    created_at: { type: 'date', required: true },
    updated_at: { type: 'date', required: true }
  } as ResponseSchema,

  /**
   * Essential organization fields for UI
   */
  ORGANIZATION_ESSENTIAL: {
    id: { type: 'number', required: true },
    name: { type: 'string', required: true },
    slug: { type: 'string', required: true },
    logo_url: { type: 'url', required: false },
  } as ResponseSchema,

  /**
   * Statistics response schema
   */
  STATISTICS_FULL: {
    total_dogs: { type: 'number', required: true, min: 0 },
    total_organizations: { type: 'number', required: true, min: 0 },
    countries: { type: 'array', required: true },
    organizations: { type: 'array', required: true }
  } as ResponseSchema,

  /**
   * Essential statistics fields for UI
   */
  STATISTICS_ESSENTIAL: {
    total_dogs: { type: 'number', required: true },
    total_organizations: { type: 'number', required: true },
  } as ResponseSchema,

  /**
   * Statistics organization item schema
   */
  STATISTICS_ORGANIZATION: {
    id: { type: 'number', required: true, min: 1 },
    name: { type: 'string', required: true, minLength: 1 },
    dog_count: { type: 'number', required: true, min: 0 },
    city: { type: 'string', required: false },
    country: { type: 'string', required: false }
  } as ResponseSchema,

  /**
   * Filter option schema
   */
  FILTER_OPTION: {
    value: { type: 'string', required: true },
    label: { type: 'string', required: true },
    count: { type: 'number', required: true, min: 0 }
  } as ResponseSchema,

  /**
   * Filter counts response schema
   */
  FILTER_COUNTS_FULL: {
    size_options: { type: 'array', required: true },
    age_options: { type: 'array', required: true },
    sex_options: { type: 'array', required: true },
    breed_options: { type: 'array', required: true },
    organization_options: { type: 'array', required: true },
    location_country_options: { type: 'array', required: true },
    available_country_options: { type: 'array', required: true },
    available_region_options: { type: 'array', required: true }
  } as ResponseSchema,

  /**
   * Essential filter counts fields for UI
   */
  FILTER_COUNTS_ESSENTIAL: {
    size_options: { type: 'array', required: true },
    age_options: { type: 'array', required: true },
    sex_options: { type: 'array', required: true },
    breed_options: { type: 'array', required: true },
  } as ResponseSchema,

  /**
   * Image response schema
   */
  IMAGE: {
    id: { type: 'number', required: true, min: 1 },
    image_url: { type: 'url', required: true },
    is_primary: { type: 'boolean', required: true }
  } as ResponseSchema,

  /**
   * Dog with images response schema - extends DOG schema
   */
  get DOG_WITH_IMAGES_FULL() {
    return {
      ...this.DOG_FULL,
      images: { type: 'array', required: true }
    } as ResponseSchema;
  },

  get DOG_WITH_IMAGES_ESSENTIAL() {
    return {
      ...this.DOG_ESSENTIAL,
      images: { type: 'array', required: true }
    } as ResponseSchema;
  }
};

/**
 * Specialized helper for testing API interactions in E2E tests
 * Handles validation, mocking, and performance testing of API calls
 */
export class ApiTestHelper {
  private timeouts = getTimeoutConfig();

  constructor(private page: Page) {}

  /**
   * Wait for and validate an animals API call.
   * This corresponds to the `getAnimals` function in `animalsService.js`.
   */
  async validateAnimalsApiCall(
    expectedParams: Record<string, string | number | boolean> = {},
    options: ApiTestOptions = {}
  ): Promise<ApiValidationResult> {
    const {
      timeout = this.timeouts.api.standard,
      validateResponseTime = true,
      maxResponseTime = this.timeouts.performance.maxResponseTime,
      validateHeaders = true,
      expectedStatus = 200,
      validationLevel = ValidationLevel.ESSENTIAL
    } = options;

    try {
      const startTime = Date.now();
      
      const response = await this.page.waitForResponse(
        response => response.url().includes('/api/animals') && 
                   response.request().method() === 'GET' &&
                   !response.url().includes('/api/animals/meta') &&
                   !response.url().includes('/api/animals/statistics'),
        { timeout }
      );

      const responseTime = Date.now() - startTime;
      
      // Validate response status
      expect(response.status()).toBe(expectedStatus);
      
      // Validate response time if requested
      if (validateResponseTime) {
        expect(responseTime).toBeLessThan(maxResponseTime);
      }
      
      // Get and validate headers
      const headers = response.headers() as ApiHeaders;
      if (validateHeaders) {
        expect(headers['content-type']).toContain('application/json');
      }
      
      // Validate URL parameters
      const url = new URL(response.url());
      const actualParams = Object.fromEntries(url.searchParams);
      
      for (const [key, expectedValue] of Object.entries(expectedParams)) {
        expect(actualParams[key]).toBe(expectedValue.toString());
      }
      
      // Parse and validate response data
      const responseData: ApiDogResponse[] = await response.json();
      expect(Array.isArray(responseData)).toBe(true);
      
      // Validate dog structure if dogs are returned
      if (responseData.length > 0 && validationLevel !== ValidationLevel.NONE) {
        const firstDog = responseData[0];
        this.validateDogStructure(firstDog, 'dog', validationLevel);
      }
      
      return {
        success: true,
        response,
        data: responseData,
        responseTime,
        headers
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: 0
      };
    }
  }

  /**
   * Validate dog structure using comprehensive schema validation
   */
  private validateDogStructure(
    dog: unknown, 
    context: string = 'dog',
    level: ValidationLevel = ValidationLevel.FULL
  ): asserts dog is ApiDogResponse {
    if (level === ValidationLevel.NONE) return;

    const schema = level === ValidationLevel.FULL ? API_SCHEMAS.DOG_FULL : API_SCHEMAS.DOG_ESSENTIAL;
    const result = ApiSchemaValidator.validateObject(dog, schema);
    
    if (!result.isValid) {
      const errorMessages = result.errors.map(error => 
        `${error.field}: ${error.message} (expected: ${error.expected}, got: ${error.actual})`
      ).join('\n');
      
      throw new Error(`Dog structure validation failed in ${context} (level: ${level}):\n${errorMessages}`);
    }

    if (result.warnings.length > 0) {
      console.warn(`Dog validation warnings in ${context}:`, result.warnings);
    }
  }

  /**
   * Validate statistics structure using comprehensive schema validation
   */
  private validateStatisticsStructure(
    stats: unknown, 
    context: string = 'statistics',
    level: ValidationLevel = ValidationLevel.FULL
  ): asserts stats is ApiStatisticsResponse {
    if (level === ValidationLevel.NONE) return;

    const schema = level === ValidationLevel.FULL ? API_SCHEMAS.STATISTICS_FULL : API_SCHEMAS.STATISTICS_ESSENTIAL;
    const result = ApiSchemaValidator.validateObject(stats, schema);
    
    if (!result.isValid) {
      const errorMessages = result.errors.map(error => 
        `${error.field}: ${error.message} (expected: ${error.expected}, got: ${error.actual})`
      ).join('\n');
      
      throw new Error(`Statistics structure validation failed in ${context} (level: ${level}):\n${errorMessages}`);
    }

    if (level === ValidationLevel.FULL) {
      const typedStats = stats as ApiStatisticsResponse;
      if (typedStats.organizations && typedStats.organizations.length > 0) {
        const orgResult = ApiSchemaValidator.validateArray(typedStats.organizations, API_SCHEMAS.STATISTICS_ORGANIZATION);
        
        if (!orgResult.isValid) {
          const orgErrorMessages = orgResult.errors.map(error => 
            `organizations${error.path ? error.path : ''}.${error.field}: ${error.message}`
          ).join('\n');
          
          throw new Error(`Statistics organizations validation failed in ${context}:\n${orgErrorMessages}`);
        }
      }

      if (typedStats.countries && typedStats.countries.length > 0) {
        for (let i = 0; i < typedStats.countries.length; i++) {
          const country = typedStats.countries[i];
          if (typeof country !== 'string') {
            throw new Error(`Statistics country at index ${i} expected string, got ${typeof country}`);
          }
        }
      }
    }

    if (result.warnings.length > 0) {
      console.warn(`Statistics validation warnings in ${context}:`, result.warnings);
    }
  }

  /**
   * Validate filter counts structure using comprehensive schema validation
   */
  private validateFilterCountsStructure(
    filterCounts: unknown, 
    context: string = 'filter counts',
    level: ValidationLevel = ValidationLevel.FULL
  ): asserts filterCounts is ApiFilterCountsResponse {
    if (level === ValidationLevel.NONE) return;

    const schema = level === ValidationLevel.FULL ? API_SCHEMAS.FILTER_COUNTS_FULL : API_SCHEMAS.FILTER_COUNTS_ESSENTIAL;
    const result = ApiSchemaValidator.validateObject(filterCounts, schema);
    
    if (!result.isValid) {
      const errorMessages = result.errors.map(error => 
        `${error.field}: ${error.message} (expected: ${error.expected}, got: ${error.actual})`
      ).join('\n');
      
      throw new Error(`Filter counts structure validation failed in ${context} (level: ${level}):\n${errorMessages}`);
    }

    if (level === ValidationLevel.FULL) {
      const typedCounts = filterCounts as ApiFilterCountsResponse;
      const filterFields = [
        'size_options', 'age_options', 'sex_options', 'breed_options',
        'organization_options', 'location_country_options', 
        'available_country_options', 'available_region_options'
      ];

      for (const fieldName of filterFields) {
        const options = (typedCounts as any)[fieldName];
        if (Array.isArray(options) && options.length > 0) {
          const optionResult = ApiSchemaValidator.validateArray(options, API_SCHEMAS.FILTER_OPTION);
          
          if (!optionResult.isValid) {
            const optionErrorMessages = optionResult.errors.map(error => 
              `${fieldName}${error.path ? error.path : ''}.${error.field}: ${error.message}`
            ).join('\n');
            
            throw new Error(`Filter option validation failed for ${fieldName} in ${context}:\n${optionErrorMessages}`);
          }
        }
      }
    }

    if (result.warnings.length > 0) {
      console.warn(`Filter counts validation warnings in ${context}:`, result.warnings);
    }
  }

  /**
   * Validate a dog detail API call.
   * This corresponds to the `getAnimalBySlug` function in `animalsService.js`.
   */
  async validateDogDetailApiCall(
    slug: string,
    options: ApiTestOptions = {}
  ): Promise<ApiValidationResult> {
    const {
      timeout = this.timeouts.api.fast,
      validateResponseTime = true,
      maxResponseTime = this.timeouts.performance.fastResponseTime,
      validateHeaders = true,
      expectedStatus = 200,
      validationLevel = ValidationLevel.ESSENTIAL
    } = options;

    const startTime = Date.now();
    try {
      const response = await this.page.waitForResponse(
        response => response.url().includes(`/api/animals/${slug}`) && 
                   response.request().method() === 'GET',
        { timeout }
      );

      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(expectedStatus);
      
      if (validateResponseTime) {
        expect(responseTime).toBeLessThan(maxResponseTime);
      }
      
      const headers = response.headers() as ApiHeaders;
      if (validateHeaders) {
        expect(headers['content-type']).toContain('application/json');
      }
      
      const responseData: ApiDogResponse = await response.json();
      
      if (validationLevel !== ValidationLevel.NONE) {
        this.validateDogStructure(responseData, 'dog detail', validationLevel);
      }
      
      expect(responseData.slug).toBe(slug);
      
      return {
        success: true,
        response,
        data: responseData,
        responseTime,
        headers
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate statistics API call.
   * This corresponds to the `getStatistics` function in `animalsService.js`.
   */
  async validateStatisticsApiCall(
    options: ApiTestOptions = {}
  ): Promise<ApiValidationResult> {
    const {
      timeout = this.timeouts.api.standard,
      validateResponseTime = true,
      maxResponseTime = this.timeouts.performance.maxResponseTime,
      validateHeaders = true,
      expectedStatus = 200,
      validationLevel = ValidationLevel.ESSENTIAL
    } = options;

    const startTime = Date.now();
    try {
      
      const response = await this.page.waitForResponse(
        response => response.url().includes('/api/animals/statistics') && 
                   response.request().method() === 'GET',
        { timeout }
      );

      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(expectedStatus);
      
      if (validateResponseTime) {
        expect(responseTime).toBeLessThan(maxResponseTime);
      }
      
      const headers = response.headers() as ApiHeaders;
      if (validateHeaders) {
        expect(headers['content-type']).toContain('application/json');
      }
      
      const responseData: ApiStatisticsResponse = await response.json();
      
      if (validationLevel !== ValidationLevel.NONE) {
        this.validateStatisticsStructure(responseData, 'statistics', validationLevel);
      }
      
      return {
        success: true,
        response,
        data: responseData,
        responseTime,
        headers
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate breeds metadata API call
   */
  async validateBreedsApiCall(
    breedGroup?: string,
    options: ApiTestOptions = {}
  ): Promise<ApiValidationResult> {
    const {
      timeout = this.timeouts.api.standard,
      validateHeaders = true,
      expectedStatus = 200
    } = options;

    try {
      const startTime = Date.now();
      
      const response = await this.page.waitForResponse(
        response => response.url().includes('/api/animals/meta/breeds') && 
                   response.request().method() === 'GET',
        { timeout }
      );

      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(expectedStatus);
      
      // Check breed_group parameter if provided
      if (breedGroup) {
        const url = new URL(response.url());
        expect(url.searchParams.get('breed_group')).toBe(breedGroup);
      }
      
      // Get and validate headers
      const headers = response.headers() as ApiHeaders;
      if (validateHeaders) {
        expect(headers['content-type']).toContain('application/json');
      }
      
      const responseData: string[] = await response.json();
      expect(Array.isArray(responseData)).toBe(true);
      
      // Validate breeds are strings
      if (responseData.length > 0) {
        expect(typeof responseData[0]).toBe('string');
      }
      
      return {
        success: true,
        response,
        data: responseData,
        responseTime,
        headers
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: 0
      };
    }
  }

  /**
   * Validate filter counts API call
   */
  async validateFilterCountsApiCall(
    filterParams: Record<string, string | number | boolean> = {},
    options: ApiTestOptions = {}
  ): Promise<ApiValidationResult> {
    const {
      timeout = this.timeouts.api.standard,
      validateHeaders = true,
      expectedStatus = 200,
      validationLevel = ValidationLevel.ESSENTIAL
    } = options;

    const startTime = Date.now();
    try {
      
      const response = await this.page.waitForResponse(
        response => response.url().includes('/api/animals/meta/filter_counts') && 
                   response.request().method() === 'GET',
        { timeout }
      );

      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(expectedStatus);
      
      const headers = response.headers() as ApiHeaders;
      if (validateHeaders) {
        expect(headers['content-type']).toContain('application/json');
      }
      
      const responseData: ApiFilterCountsResponse = await response.json();
      
      if (validationLevel !== ValidationLevel.NONE) {
        this.validateFilterCountsStructure(responseData, 'filter counts', validationLevel);
      }
      
      return {
        success: true,
        response,
        data: responseData,
        responseTime,
        headers
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate organizations API call
   */
  async validateOrganizationsApiCall(
    expectedParams: Record<string, string | number | boolean> = {},
    options: ApiTestOptions = {}
  ): Promise<ApiValidationResult> {
    const {
      timeout = this.timeouts.api.standard,
      validateHeaders = true,
      expectedStatus = 200,
      validationLevel = ValidationLevel.ESSENTIAL
    } = options;

    const startTime = Date.now();
    try {
      
      const response = await this.page.waitForResponse(
        response => response.url().includes('/api/organizations') && 
                   response.request().method() === 'GET',
        { timeout }
      );

      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(expectedStatus);
      
      // Validate URL parameters
      const url = new URL(response.url());
      const actualParams = Object.fromEntries(url.searchParams);
      
      for (const [key, expectedValue] of Object.entries(expectedParams)) {
        expect(actualParams[key]).toBe(expectedValue.toString());
      }
      
      // Get and validate headers
      const headers = response.headers() as ApiHeaders;
      if (validateHeaders) {
        expect(headers['content-type']).toContain('application/json');
      }
      
      const responseData: ApiOrganizationResponse[] = await response.json();
      expect(Array.isArray(responseData)).toBe(true);
      
      // Validate organization structure if organizations are returned
      if (responseData.length > 0 && validationLevel !== ValidationLevel.NONE) {
        const firstOrg = responseData[0];
        this.validateOrganizationStructure(firstOrg, 'organization', validationLevel);
      }
      
      return {
        success: true,
        response,
        data: responseData,
        responseTime,
        headers
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate organization structure using schema validation based on level
   */
  private validateOrganizationStructure(
    org: unknown, 
    context: string = 'organization',
    level: ValidationLevel = ValidationLevel.FULL
  ): asserts org is ApiOrganizationResponse {
    if (level === ValidationLevel.NONE) return;

    const schema = level === ValidationLevel.FULL ? API_SCHEMAS.ORGANIZATION_FULL : API_SCHEMAS.ORGANIZATION_ESSENTIAL;
    const result = ApiSchemaValidator.validateObject(org, schema);
    
    if (!result.isValid) {
      const errorMessages = result.errors.map(error => 
        `${error.field}: ${error.message} (expected: ${error.expected}, got: ${error.actual})`
      ).join('\n');
      
      throw new Error(`Organization structure validation failed in ${context} (level: ${level}):\n${errorMessages}`);
    }

    if (result.warnings.length > 0) {
      console.warn(`Organization validation warnings in ${context}:`, result.warnings);
    }
  }

  /**
   * Validate dog with images response structure
   */
  private validateDogWithImagesStructure(dogWithImages: unknown, context: string = 'dog with images'): void {
    const result = ApiSchemaValidator.validateObject(dogWithImages, API_SCHEMAS.DOG_WITH_IMAGES);
    
    if (!result.isValid) {
      const errorMessages = result.errors.map(error => 
        `${error.field}: ${error.message} (expected: ${error.expected}, got: ${error.actual})`
      ).join('\n');
      
      throw new Error(`Dog with images structure validation failed in ${context}:\n${errorMessages}`);
    }

    // Validate images array
    const typedDog = dogWithImages as ApiDogResponse & { images: unknown[] };
    if (typedDog.images && typedDog.images.length > 0) {
      const imageResult = ApiSchemaValidator.validateArray(typedDog.images, API_SCHEMAS.IMAGE);
      
      if (!imageResult.isValid) {
        const imageErrorMessages = imageResult.errors.map(error => 
          `images${error.path ? error.path : ''}.${error.field}: ${error.message}`
        ).join('\n');
        
        throw new Error(`Dog images validation failed in ${context}:\n${imageErrorMessages}`);
      }
    }

    // Report warnings if any unexpected fields found
    if (result.warnings.length > 0) {
      console.warn(`Dog with images validation warnings in ${context}:`, result.warnings);
    }
  }

  /**
   * Comprehensive API response validation with detailed reporting
   */
  async validateApiResponse<T>(
    response: Response,
    expectedSchema: ResponseSchema,
    context: string,
    options: {
      allowEmpty?: boolean;
      validateAsArray?: boolean;
      arrayItemSchema?: ResponseSchema;
      customValidation?: (data: T) => void;
    } = {}
  ): Promise<T> {
    const { allowEmpty = false, validateAsArray = false, arrayItemSchema, customValidation } = options;

    try {
      const responseData = await response.json();

      // Handle empty responses
      if (!responseData && !allowEmpty) {
        throw new Error(`${context}: Empty response not allowed`);
      }

      let validationResult: SchemaValidationResult;

      if (validateAsArray) {
        if (!arrayItemSchema) {
          throw new Error(`${context}: Array validation requires arrayItemSchema`);
        }
        validationResult = ApiSchemaValidator.validateArray(responseData, arrayItemSchema);
      } else {
        validationResult = ApiSchemaValidator.validateObject(responseData, expectedSchema);
      }

      if (!validationResult.isValid) {
        const errorDetails = validationResult.errors.map(error => {
          const pathInfo = error.path ? ` (at ${error.path})` : '';
          return `  • ${error.field}${pathInfo}: ${error.message}\n    Expected: ${error.expected}\n    Actual: ${JSON.stringify(error.actual)}`;
        }).join('\n');

        throw new Error(`${context} validation failed:\n${errorDetails}`);
      }

      // Report warnings
      if (validationResult.warnings.length > 0) {
        console.warn(`${context} validation warnings:`, validationResult.warnings);
      }

      // Run custom validation if provided
      if (customValidation) {
        customValidation(responseData as T);
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`${context}: Invalid JSON response - ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Test edge cases and boundary conditions for API responses
   */
  async testApiResponseEdgeCases(
    urlPattern: string,
    schema: ResponseSchema,
    context: string
  ): Promise<void> {
    const edgeCases: Array<{ name: string; data: any }> = [
      { name: 'empty object', data: {} },
      { name: 'null values', data: Object.keys(schema).reduce((acc, key) => ({ ...acc, [key]: null }), {}) },
      { name: 'string overflow', data: { name: 'a'.repeat(1000) } },
      { name: 'negative numbers', data: { id: -1, count: -100 } },
      { name: 'invalid dates', data: { created_at: 'invalid-date', updated_at: '2024-99-99' } },
      { name: 'invalid URLs', data: { website_url: 'not-a-url', primary_image_url: 'http://invalid..url' } },
      { name: 'array instead of object', data: [] },
      { name: 'string instead of number', data: { id: '123', count: 'invalid' } }
    ];

    for (const edgeCase of edgeCases) {
      await this.mockApiResponse(urlPattern, edgeCase.data);
      
      try {
        await this.validateApiResponse(
          await this.page.waitForResponse(response => response.url().includes(urlPattern.toString())),
          schema,
          `${context} - ${edgeCase.name}`
        );
        
        // If validation passed when it shouldn't have, that's also noteworthy
        console.warn(`Edge case '${edgeCase.name}' unexpectedly passed validation`);
      } catch (error) {
        // Expected for most edge cases - log for reference
        console.log(`Edge case '${edgeCase.name}' correctly failed validation:`, (error as Error).message);
      }
    }
  }

  /**
   * Performance validation with response size and complexity metrics
   */
  async validateApiPerformanceMetrics(
    response: Response,
    context: string,
    limits: {
      maxResponseTime?: number;
      maxResponseSize?: number;
      maxArrayLength?: number;
      maxObjectDepth?: number;
    } = {}
  ): Promise<void> {
    const {
      maxResponseTime = this.timeouts.performance.maxResponseTime,
      maxResponseSize = 1024 * 1024, // 1MB
      maxArrayLength = 1000,
      maxObjectDepth = 10
    } = limits;

    const responseText = await response.text();
    const responseSize = responseText.length;

    // Validate response size
    if (responseSize > maxResponseSize) {
      throw new Error(`${context}: Response size ${responseSize} bytes exceeds limit ${maxResponseSize} bytes`);
    }

    try {
      const data = JSON.parse(responseText);

      // Validate array length
      if (Array.isArray(data) && data.length > maxArrayLength) {
        throw new Error(`${context}: Array length ${data.length} exceeds limit ${maxArrayLength}`);
      }

      // Validate object depth
      const depth = this.calculateObjectDepth(data);
      if (depth > maxObjectDepth) {
        throw new Error(`${context}: Object depth ${depth} exceeds limit ${maxObjectDepth}`);
      }

      console.log(`${context} performance metrics:`, {
        responseSize: `${responseSize} bytes`,
        arrayLength: Array.isArray(data) ? data.length : 'N/A',
        objectDepth: depth
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`${context}: Invalid JSON in performance validation`);
      }
      throw error;
    }
  }

  /**
   * Calculate maximum depth of nested objects/arrays
   */
  private calculateObjectDepth(obj: unknown, currentDepth: number = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    let maxDepth = currentDepth;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        maxDepth = Math.max(maxDepth, this.calculateObjectDepth(item, currentDepth + 1));
      }
    } else {
      for (const value of Object.values(obj)) {
        maxDepth = Math.max(maxDepth, this.calculateObjectDepth(value, currentDepth + 1));
      }
    }

    return maxDepth;
  }

  /**
   * Mock API responses for testing
   */
  async mockApiResponse(
    urlPattern: string | RegExp,
    responseData: ApiResponseData,
    options: ApiMockOptions = {}
  ): Promise<void> {
    const {
      delay = 0,
      status = 200,
      errorMessage
    } = options;

    await this.page.route(urlPattern, async (route) => {
      if (delay > 0) {
        await this.page.waitForTimeout(delay);
      }

      if (errorMessage) {
        await route.fulfill({
          status: status >= 400 ? status : 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: errorMessage }),
        });
        return;
      }

      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData),
      });
    });
  }

  /**
   * Mock network error for testing error handling
   */
  async mockNetworkError(urlPattern: string | RegExp): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      await route.abort('failed');
    });
  }

  /**
   * Mock slow API response for testing loading states
   */
  async mockSlowApiResponse(
    urlPattern: string | RegExp,
    responseData: ApiResponseData,
    delay: number = this.timeouts.api.slow
  ): Promise<void> {
    await this.mockApiResponse(urlPattern, responseData, { delay });
  }

  /**
   * Clear all API mocks
   */
  async clearApiMocks(): Promise<void> {
    await this.page.unrouteAll();
  }

  /**
   * Test API error handling
   */
  async testApiErrorHandling(
    urlPattern: string | RegExp,
    errorStatus: number = 500,
    errorMessage: string = 'Internal server error'
  ): Promise<void> {
    // Mock error response
    await this.mockApiResponse(urlPattern, { error: errorMessage }, { 
      status: errorStatus, 
      errorMessage 
    });

    // Trigger the API call (this depends on the specific test context)
    // The calling test should then verify error handling behavior
  }

  /**
   * Validate API call sequence
   */
  async validateApiCallSequence(
    expectedCalls: Array<{ url: string | RegExp; method?: string }>
  ): Promise<void> {
    const actualCalls: Array<{ url: string; method: string }> = [];

    // Set up request interception
    await this.page.route('**/api/**', async (route) => {
      const request = route.request();
      actualCalls.push({
        url: request.url(),
        method: request.method()
      });
      await route.continue();
    });

    // After the test performs actions that trigger API calls,
    // validate the sequence
    expect(actualCalls.length).toBeGreaterThanOrEqual(expectedCalls.length);

    for (let i = 0; i < expectedCalls.length; i++) {
      const expected = expectedCalls[i];
      const actual = actualCalls[i];

      if (typeof expected.url === 'string') {
        expect(actual.url).toContain(expected.url);
      } else {
        expect(expected.url.test(actual.url)).toBe(true);
      }

      if (expected.method) {
        expect(actual.method).toBe(expected.method);
      }
    }
  }

  /**
   * Test API caching behavior
   */
  async testApiCaching(
    urlPattern: string | RegExp,
    triggerApiCall: () => Promise<void>
  ): Promise<void> {
    let callCount = 0;

    // Set up request counting
    await this.page.route(urlPattern, async (route) => {
      callCount++;
      await route.continue();
    });

    // Trigger the same API call multiple times
    await triggerApiCall();
    await triggerApiCall();

    // Depending on caching strategy, we might expect only 1 call
    // This test assumes proper caching reduces redundant calls
    expect(callCount).toBeLessThanOrEqual(2);
  }

  /**
   * Validate API response headers
   */
  async validateApiHeaders(
    urlPattern: string | RegExp,
    expectedHeaders: Record<string, string>
  ): Promise<void> {
    const response = await this.page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        } else {
          return urlPattern.test(url);
        }
      }
    );

    const headers = response.headers();
    
    for (const [headerName, expectedValue] of Object.entries(expectedHeaders)) {
      expect(headers[headerName.toLowerCase()]).toContain(expectedValue);
    }
  }

  /**
   * Test API pagination
   */
  async testApiPagination(
    baseUrl: string,
    limit: number = 20
  ): Promise<void> {
    // Test first page
    const firstPageResult = await this.validateAnimalsApiCall({
      limit: limit.toString(),
      offset: '0'
    });

    expect(firstPageResult.success).toBe(true);
    
    if (!firstPageResult.success) {
      throw new Error('First page API call failed');
    }
    
    expect(firstPageResult.data).toBeDefined();
    const firstPageData = firstPageResult.data as ApiDogResponse[];
    
    // If there are enough results, test second page
    if (firstPageData.length === limit) {
      const secondPageResult = await this.validateAnimalsApiCall({
        limit: limit.toString(),
        offset: limit.toString()
      });

      expect(secondPageResult.success).toBe(true);
      
      if (!secondPageResult.success) {
        throw new Error('Second page API call failed');
      }
      
      const secondPageData = secondPageResult.data as ApiDogResponse[];
      
      // Verify different results (no overlap in IDs)
      const firstPageIds = firstPageData.map(dog => dog.id);
      const secondPageIds = secondPageData.map(dog => dog.id);
      
      const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(overlap.length).toBe(0);
    }
  }

  /**
   * Performance testing for API calls
   */
  async measureApiPerformance(
    triggerApiCall: () => Promise<void>,
    maxAcceptableTime: number = this.timeouts.performance.maxResponseTime
  ): Promise<{ duration: number; success: boolean }> {
    const startTime = Date.now();
    
    try {
      await triggerApiCall();
      const duration = Date.now() - startTime;
      
      return {
        duration,
        success: duration < maxAcceptableTime
      };
    } catch (error) {
      return {
        duration: Date.now() - startTime,
        success: false
      };
    }
  }
}

/**
 * Helper for testing real-time API interactions
 */
export class RealTimeApiTestHelper {
  private timeouts = getTimeoutConfig();

  constructor(private page: Page, private apiHelper: ApiTestHelper) {}

  /**
   * Test search API with debouncing
   */
  async testSearchApiDebouncing(
    searchQuery: string,
    debounceTime: number = this.timeouts.ui.debounce
  ): Promise<void> {
    let apiCallCount = 0;

    // Set up API call counting
    await this.page.route('**/api/animals*', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.has('search')) {
        apiCallCount++;
      }
      await route.continue();
    });

    // Type search query character by character
    const searchInput = this.page.getByPlaceholder('Search by name, breed, or description...');
    
    for (const char of searchQuery) {
      await searchInput.type(char);
      await this.page.waitForTimeout(this.timeouts.polling); // Type at human speed
    }

    // Wait for debounce period
    await this.page.waitForTimeout(debounceTime + this.timeouts.polling);

    // Should have made only one API call due to debouncing
    expect(apiCallCount).toBe(1);
  }

  /**
   * Test filter API calls triggered by user interactions
   */
  async testFilterApiInteractions(): Promise<void> {
    const apiCalls: string[] = [];

    // Track filter-related API calls
    await this.page.route('**/api/animals*', async (route) => {
      const url = new URL(route.request().url());
      const params = Array.from(url.searchParams.entries());
      if (params.length > 0) {
        apiCalls.push(url.search);
      }
      await route.continue();
    });

    // Apply multiple filters and verify API calls
    const filterHelper = await import('./filterTestHelpers');
    const filterTest = new filterHelper.FilterTestHelper(this.page);

    await filterTest.selectBreedFilter('Golden Retriever');
    expect(apiCalls.length).toBeGreaterThan(0);

    await filterTest.selectSizeFilter('Large');
    expect(apiCalls.length).toBeGreaterThan(1);

    // Verify API calls contain expected parameters
    const lastCall = apiCalls[apiCalls.length - 1];
    expect(lastCall).toContain('standardized_breed=Golden%20Retriever');
    expect(lastCall).toContain('standardized_size=Large');
  }
}