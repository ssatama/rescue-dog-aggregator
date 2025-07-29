import { EnhancedDog } from './testData';

export interface SearchScenario {
  name: string;
  query: string;
  expectedResults: EnhancedDog[];
  expectedCount: number;
  description: string;
}

export interface FilterScenario {
  name: string;
  filters: Record<string, string>;
  expectedResults: EnhancedDog[];
  expectedCount: number;
  description: string;
}

export interface ErrorScenario {
  name: string;
  setup: () => Promise<void>;
  expectedErrorMessage: string;
  description: string;
}

export interface PerformanceScenario {
  name: string;
  action: () => Promise<void>;
  maxDuration: number;
  description: string;
}

export interface ResponsiveScenario {
  name: string;
  viewport: { width: number, height: number };
  validations: () => Promise<void>;
  description: string;
}

export interface AccessibilityScenario {
  name: string;
  action: () => Promise<void>;
  description: string;
}

export interface UserJourneyStep {
  action: () => Promise<void>;
  validation: () => Promise<void>;
}

export interface UserJourneyScenario {
  name: string;
  steps: UserJourneyStep[];
  description: string;
}

export const searchScenarios: SearchScenario[] = [];
export const filterScenarios: FilterScenario[] = [];
export const errorScenarios: ErrorScenario[] = [];
export const performanceScenarios: PerformanceScenario[] = [];
export const responsiveScenarios: ResponsiveScenario[] = [];
export const accessibilityScenarios: AccessibilityScenario[] = [];
export const userJourneyScenarios: UserJourneyScenario[] = [];

export const getSearchScenarioByName = (name: string) => searchScenarios.find(s => s.name === name);
export const getFilterScenarioByName = (name: string) => filterScenarios.find(s => s.name === name);
export const getErrorScenarioByName = (name: string) => errorScenarios.find(s => s.name === name);
export const getPerformanceScenarioByName = (name: string) => performanceScenarios.find(s => s.name === name);
export const getResponsiveScenarioByName = (name: string) => responsiveScenarios.find(s => s.name === name);
export const getAccessibilityScenarioByName = (name: string) => accessibilityScenarios.find(s => s.name === name);
export const getUserJourneyScenarioByName = (name: string) => userJourneyScenarios.find(s => s.name === name);

export const generateParameterizedScenarios = () => { /* ... */ };
