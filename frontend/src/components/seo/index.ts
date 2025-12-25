/**
 * SEO Components - Schema.org structured data components
 * Exports all Schema.org components for search engine optimization
 */

export { DogSchema } from "./DogSchema";
export { OrganizationSchema } from "./OrganizationSchema";
export { BreadcrumbSchema } from "./BreadcrumbSchema";
export { PersonSchema } from "./PersonSchema";

// Re-export types for convenience
export type { default as DogSchemaProps } from "./DogSchema";
export type { default as OrganizationSchemaProps } from "./OrganizationSchema";
export type { default as BreadcrumbSchemaProps } from "./BreadcrumbSchema";
export type { default as PersonSchemaProps } from "./PersonSchema";
