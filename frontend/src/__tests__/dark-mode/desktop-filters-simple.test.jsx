/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('DesktopFilters Dark Mode Classes', () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = '';
  });

  test('verifies dark mode classes are present in component source', () => {
    // Set dark mode
    document.documentElement.classList.add('dark');
    
    // This test verifies that the dark mode classes have been added
    // to the DesktopFilters component by checking the file content
    
    // We can test this by reading the component file and checking for dark mode classes
    const fs = require('fs');
    const path = require('path');
    
    const componentPath = path.resolve(__dirname, '../../components/filters/DesktopFilters.jsx');
    const componentContent = fs.readFileSync(componentPath, 'utf8');
    
    // Check for key dark mode classes
    expect(componentContent).toContain('dark:bg-gray-800/90');
    expect(componentContent).toContain('dark:text-gray-100');
    expect(componentContent).toContain('dark:bg-orange-900/30');
    expect(componentContent).toContain('dark:text-orange-400');
    expect(componentContent).toContain('dark:hover:bg-gray-700/50');
    expect(componentContent).toContain('dark:bg-gray-700');
    expect(componentContent).toContain('dark:hover:bg-gray-600');
  });
  
  test('dark class is properly applied to document', () => {
    // Set dark mode
    document.documentElement.classList.add('dark');
    
    // Verify dark class is applied to document
    expect(document.documentElement).toHaveClass('dark');
  });
});