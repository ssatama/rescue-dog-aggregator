#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findDuplicates() {
  try {
    const rootDir = path.join(__dirname, '..', '..');
    const output = execSync(
      `find frontend/src -name "*.jsx" -o -name "*.tsx" | sed 's/\\.[jt]sx$//' | sort | uniq -d`,
      { encoding: 'utf8', cwd: rootDir }
    );
    
    return output.trim().split('\n').filter(line => line.length > 0).map(line => path.join(rootDir, line));
  } catch (error) {
    console.error('Error finding duplicates:', error.message);
    return [];
  }
}

function removeDuplicateJsxFiles(duplicates, interactive = false) {
  const removed = [];
  const errors = [];

  for (const basePath of duplicates) {
    const jsxPath = `${basePath}.jsx`;
    const tsxPath = `${basePath}.tsx`;
    
    try {
      // Check if both files exist
      const jsxExists = fs.existsSync(jsxPath);
      const tsxExists = fs.existsSync(tsxPath);
      
      if (jsxExists && tsxExists) {
        if (interactive) {
          console.log(`Found duplicate: ${basePath}`);
          console.log(`  JSX: ${jsxPath}`);
          console.log(`  TSX: ${tsxPath}`);
        }
        
        // Remove the .jsx file (keep .tsx)
        fs.unlinkSync(jsxPath);
        removed.push(jsxPath);
        
        if (interactive) {
          console.log(`  ✅ Removed: ${jsxPath}`);
          console.log(`  ✅ Kept: ${tsxPath}`);
          console.log('');
        }
      }
    } catch (error) {
      errors.push({ file: jsxPath, error: error.message });
    }
  }
  
  return { removed, errors };
}

function main() {
  const interactive = process.argv.includes('--interactive');
  
  console.log('🔍 Scanning for JSX/TSX duplicates...\n');
  
  const duplicates = findDuplicates();
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }
  
  console.log(`Found ${duplicates.length} duplicate components:`);
  duplicates.forEach(dup => console.log(`  - ${dup}`));
  console.log('');
  
  if (interactive) {
    console.log('Removing .jsx files (keeping .tsx versions)...\n');
  }
  
  const { removed, errors } = removeDuplicateJsxFiles(duplicates, interactive);
  
  console.log(`\n📋 Summary:`);
  console.log(`  Removed: ${removed.length} .jsx files`);
  console.log(`  Errors: ${errors.length}`);
  
  if (removed.length > 0) {
    console.log('\n✅ Removed files:');
    removed.forEach(file => console.log(`  - ${file}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ file, error }) => console.log(`  - ${file}: ${error}`));
  }
  
  console.log('\n🎯 Next steps:');
  console.log('  1. Run tests: npm test');
  console.log('  2. Check git status: git status');
  console.log('  3. Commit changes if tests pass');
}

if (require.main === module) {
  main();
}

module.exports = { findDuplicates, removeDuplicateJsxFiles };