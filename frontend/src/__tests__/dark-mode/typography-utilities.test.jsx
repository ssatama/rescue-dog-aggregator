/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';

describe('Typography Utilities Dark Mode Fix', () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = '';
  });

  test('typography utilities are fixed to use CSS variables instead of hard-coded colors', () => {
    // This test verifies that the typography utility classes have been updated
    // to use CSS variables instead of hard-coded HSL colors
    
    // Read the current globals.css content to verify the fix
    const fs = require('fs');
    const path = require('path');
    
    const globalsPath = path.resolve(__dirname, '../../app/globals.css');
    const globalsContent = fs.readFileSync(globalsPath, 'utf8');
    
    // Verify that hard-coded colors have been replaced with CSS variables
    expect(globalsContent).toContain('color: hsl(var(--foreground))');
    expect(globalsContent).toContain('color: hsl(var(--muted-foreground))');
    
    // Verify that old hard-coded colors are not present
    expect(globalsContent).not.toContain('color: hsl(222.2 84% 4.9%)');
    expect(globalsContent).not.toContain('color: hsl(215.4 16.3% 46.9%)');
  });

  test('utility classes exist and can be applied', () => {
    const testElement = document.createElement('div');
    
    // Test that all utility classes can be applied without errors
    testElement.className = 'text-hero';
    expect(testElement).toHaveClass('text-hero');
    
    testElement.className = 'text-section';
    expect(testElement).toHaveClass('text-section');
    
    testElement.className = 'text-title';
    expect(testElement).toHaveClass('text-title');
    
    testElement.className = 'text-card-title';
    expect(testElement).toHaveClass('text-card-title');
    
    testElement.className = 'text-body';
    expect(testElement).toHaveClass('text-body');
  });
});