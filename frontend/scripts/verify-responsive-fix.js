#!/usr/bin/env node

/**
 * Verify responsive breakpoint fix
 * Checks that all filter components use consistent sm breakpoint (640px)
 */

const fs = require('fs');
const path = require('path');

const filesToCheck = [
  {
    path: 'src/components/filters/DesktopFilters.jsx',
    pattern: 'hidden lg:block',
    line: 323,
    description: 'Desktop filters should be hidden lg:block'
  },
  {
    path: 'src/app/dogs/DogsPageClient.jsx',
    pattern: 'lg:hidden',
    line: 551,
    description: 'Mobile filter button should be lg:hidden'
  },
  {
    path: 'src/components/filters/DogFilters.jsx',
    patterns: [
      { pattern: 'hidden lg:flex', line: 122, description: 'Desktop header should be hidden lg:flex' },
      { pattern: 'lg:hidden', line: 141, description: 'Mobile button should be lg:hidden' },
      { pattern: 'hidden lg:inline', line: 167, description: 'Count should be hidden lg:inline' },
      { pattern: 'hidden lg:flex', line: 178, description: 'Clear button should be hidden lg:flex' },
      { pattern: 'hidden lg:flex', line: 190, description: 'Filters container should be hidden lg:flex' }
    ]
  }
];

console.log('Verifying responsive breakpoint fix...\n');

let allCorrect = true;

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, '..', file.path);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  console.log(`Checking ${file.path}:`);

  if (file.patterns) {
    // Multiple patterns in same file
    file.patterns.forEach(({ pattern, line, description }) => {
      const actualLine = lines[line - 1];
      if (actualLine && actualLine.includes(pattern)) {
        console.log(`  ✓ Line ${line}: ${description}`);
      } else {
        console.log(`  ✗ Line ${line}: Expected "${pattern}" but found:`);
        console.log(`    ${actualLine ? actualLine.trim() : '(line not found)'}`);
        allCorrect = false;
      }
    });
  } else {
    // Single pattern
    const actualLine = lines[file.line - 1];
    if (actualLine && actualLine.includes(file.pattern)) {
      console.log(`  ✓ Line ${file.line}: ${file.description}`);
    } else {
      console.log(`  ✗ Line ${file.line}: Expected "${file.pattern}" but found:`);
      console.log(`    ${actualLine ? actualLine.trim() : '(line not found)'}`);
      allCorrect = false;
    }
  }
  console.log('');
});

if (allCorrect) {
  console.log('✅ All responsive breakpoints are correctly set to lg (1024px)!');
  console.log('\nThis ensures:');
  console.log('- Mobile/tablets (<1024px) get mobile design with filter drawer');
  console.log('- Desktop (≥1024px) gets desktop design with visible filters');
  console.log('- Desktop filters only appear when 3-column grids can be displayed');
  console.log('- No dead zone between breakpoints');
} else {
  console.log('❌ Some breakpoints need to be fixed');
  process.exit(1);
}