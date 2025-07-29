#!/usr/bin/env node

/**
 * STORYBOOK VISUAL DESIGN ARTIFACTS GENERATOR
 * Uses your existing Storybook setup to generate comprehensive design artifacts
 * Leverages Storybook 9+ visual testing capabilities with Playwright
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '../../frontend');
const OUTPUT_DIR = path.join(__dirname, 'storybook-artifacts');
const STORYBOOK_PORTS = [6006, 6007];
let STORYBOOK_PORT = null;
let STORYBOOK_URL = null;

// Configuration for comprehensive capture
const CAPTURE_CONFIG = {
  viewports: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 }
  ],
  themes: ['light', 'dark'],
  browsers: ['chromium'] // Can add 'firefox', 'webkit'
};

/**
 * Check if Storybook is running on any port
 */
async function checkStorybookRunning() {
  for (const port of STORYBOOK_PORTS) {
    try {
      const url = `http://localhost:${port}`;
      const response = await fetch(url);
      if (response.ok) {
        STORYBOOK_PORT = port;
        STORYBOOK_URL = url;
        console.log(`✅ Found Storybook running on port ${port}`);
        return true;
      }
    } catch {
      // Continue to next port
    }
  }
  return false;
}

/**
 * Start Storybook server
 */
async function startStorybook() {
  console.log('🚀 Starting Storybook...');

  const storybook = spawn('npm', ['run', 'storybook'], {
    cwd: FRONTEND_DIR,
    stdio: 'pipe'
  });

  // Wait for Storybook to be ready
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      storybook.kill();
      reject(new Error('Storybook failed to start within 60 seconds'));
    }, 60000);

    const checkReady = async () => {
      if (await checkStorybookRunning()) {
        clearTimeout(timeout);
        console.log('✅ Storybook is running');
        resolve(storybook);
      } else {
        setTimeout(checkReady, 2000);
      }
    };

    storybook.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('ready')) {
        setTimeout(checkReady, 3000);
      }
    });

    storybook.stderr.on('data', (data) => {
      console.warn('Storybook stderr:', data.toString());
    });
  });
}

/**
 * Install required dependencies for visual testing
 */
async function ensureDependencies() {
  console.log('📦 Checking dependencies...');

  try {
    // Check if test-runner is installed
    execSync('npx @storybook/test-runner --help', {
      cwd: FRONTEND_DIR,
      stdio: 'pipe'
    });
    console.log('✅ Storybook test-runner is available');
  } catch {
    console.log('Installing Storybook test-runner...');
    execSync('npm install --save-dev @storybook/test-runner playwright', {
      cwd: FRONTEND_DIR
    });
  }

  try {
    // Install Playwright browsers
    execSync('npx playwright install chromium', {
      cwd: FRONTEND_DIR,
      stdio: 'pipe'
    });
    console.log('✅ Playwright browsers ready');
  } catch {
    console.log('Installing Playwright browsers...');
    execSync('npx playwright install', { cwd: FRONTEND_DIR });
  }
}

/**
 * Create test-runner configuration for screenshot capture
 */
async function createTestRunnerConfig() {
  const configPath = path.join(FRONTEND_DIR, 'test-runner-jest.config.js');

  const config = `
const { getJestConfig } = require('@storybook/test-runner');

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  // The default configuration comes from @storybook/test-runner
  ...getJestConfig(),
  /** Add your own overrides below
   * @see https://jestjs.io/docs/configuration
   */
  testEnvironmentOptions: {
    'jest-playwright': {
      browsers: ['chromium'],
      exitOnPageError: false,
      launchOptions: {
        headless: true,
      },
      contextOptions: {
        ignoreHTTPSErrors: true,
      },
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test-runner-setup.js'],
};
`;

  await fs.writeFile(configPath, config);

  // Create setup file for screenshot testing
  const setupPath = path.join(FRONTEND_DIR, 'test-runner-setup.js');
  const setup = `
const { injectAxe, checkA11y, configureAxe } = require('axe-playwright');
const { toMatchImageSnapshot } = require('jest-image-snapshot');

expect.extend({ toMatchImageSnapshot });

// Global setup for all tests
beforeAll(async () => {
  // Configure jest-image-snapshot
  const customConfig = {
    threshold: 0.1,
    customDiffConfig: {
      threshold: 0.1,
    },
    failureThreshold: 0.02,
    failureThresholdType: 'percent',
  };

  expect.extend({
    toMatchImageSnapshot: (received) => {
      return toMatchImageSnapshot.call(this, received, customConfig);
    },
  });
});

// Custom test configuration
module.exports = {
  async preVisit(page, context) {
    // Inject screenshot function into page
    await page.addInitScript(() => {
      window.__STORYBOOK_SCREENSHOT__ = async (name) => {
        const screenshot = await page.screenshot({
          fullPage: true,
          animations: 'disabled'
        });
        return screenshot;
      };
    });
  },

  async postVisit(page, context) {
    const { id, title, name } = context;

    // Take screenshots for each viewport and theme
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    const themes = ['light', 'dark'];

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      for (const theme of themes) {
        // Set theme
        await page.evaluate((targetTheme) => {
          if (targetTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }, theme);

        // Wait for theme transition
        await page.waitForTimeout(500);

        // Take screenshot
        const screenshot = await page.screenshot({
          fullPage: true,
          animations: 'disabled'
        });

        // Save with descriptive name
        const fileName = \`\${id}--\${viewport.name}--\${theme}\`;
        expect(screenshot).toMatchImageSnapshot({
          customSnapshotIdentifier: fileName,
        });
      }
    }
  },
};
`;

  await fs.writeFile(setupPath, setup);

  console.log('✅ Test-runner configuration created');
}

/**
 * Fetch all stories from Storybook
 */
async function fetchStories() {
  try {
    const response = await fetch(`${STORYBOOK_URL}/index.json`);
    const data = await response.json();
    const stories = Object.values(data.entries || {}).filter(entry => entry.type === 'story');
    return stories;
  } catch (error) {
    console.error('Failed to fetch stories:', error.message);
    return [];
  }
}

/**
 * Generate Playwright script for comprehensive capture
 */
async function generatePlaywrightScript() {
  const scriptPath = path.join(OUTPUT_DIR, 'capture-playwright.js');

  const script = `
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const STORYBOOK_URL = '${STORYBOOK_URL}';
const OUTPUT_DIR = '${OUTPUT_DIR}/screenshots';

async function captureStory(browser, story, viewport, theme) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }
  });

  const page = await context.newPage();

  try {
    // Navigate to story
    const url = \`\${STORYBOOK_URL}/iframe.html?id=\${story.id}&viewMode=story\`;
    await page.goto(url, { waitUntil: 'networkidle' });

    // Set theme
    await page.evaluate((targetTheme) => {
      if (targetTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, theme);

    // Wait for theme and animations
    await page.waitForTimeout(1000);

    // Take screenshot
    const fileName = \`\${story.id}--\${viewport.name}--\${theme}.png\`;
    const outputPath = path.join(OUTPUT_DIR, fileName);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    await page.screenshot({
      path: outputPath,
      fullPage: true,
      animations: 'disabled'
    });

    console.log(\`✅ Captured: \${fileName}\`);

    await context.close();
    return fileName;

  } catch (error) {
    console.error(\`❌ Failed \${story.id}-\${viewport.name}-\${theme}: \${error.message}\`);
    await context.close();
    return null;
  }
}

async function main() {
  console.log('🎨 Starting Playwright screenshot capture...');

  // Fetch stories
  const response = await fetch(\`\${STORYBOOK_URL}/index.json\`);
  const data = await response.json();
  const stories = Object.values(data.entries || {}).filter(entry => entry.type === 'story');

  console.log(\`📋 Found \${stories.length} stories\`);

  const browser = await chromium.launch({ headless: true });
  const captures = [];

  const viewports = ${JSON.stringify(CAPTURE_CONFIG.viewports)};
  const themes = ${JSON.stringify(CAPTURE_CONFIG.themes)};

  for (const story of stories) {
    for (const viewport of viewports) {
      for (const theme of themes) {
        const result = await captureStory(browser, story, viewport, theme);
        if (result) {
          captures.push({
            story: story.title,
            id: story.id,
            viewport: viewport.name,
            theme: theme,
            filename: result
          });
        }
      }
    }
  }

  await browser.close();

  console.log(\`🎉 Captured \${captures.length} screenshots\`);

  // Save manifest
  await fs.writeFile(
    path.join('${OUTPUT_DIR}', 'capture-manifest.json'),
    JSON.stringify({ captures, timestamp: new Date().toISOString() }, null, 2)
  );

  return captures;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
`;

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(scriptPath, script);

  console.log('✅ Playwright capture script generated');
  return scriptPath;
}

/**
 * Generate visual gallery from captured screenshots
 */
async function generateGallery(captures) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Storybook Design Artifacts - Rescue Dog Aggregator</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        .container { max-width: 1600px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 3rem; }
        .header h1 { font-size: 3rem; color: #0c4a6e; margin-bottom: 1rem; }
        .header p { font-size: 1.2rem; color: #0369a1; margin-bottom: 0.5rem; }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }
        .stat {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .stat-number { font-size: 3rem; font-weight: bold; color: #3b82f6; }
        .stat-label { color: #64748b; margin-top: 0.5rem; font-size: 1.1rem; }

        .story-section { margin-bottom: 4rem; }
        .story-title { font-size: 2rem; color: #1e293b; margin-bottom: 2rem; }
        .variants-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
        }
        .variant-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .variant-header {
            background: #1e293b;
            color: white;
            padding: 1rem;
            font-weight: 600;
            text-align: center;
        }
        .screenshot-container { padding: 1rem; }
        .screenshot {
            width: 100%;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            transition: transform 0.2s;
        }
        .screenshot:hover { transform: scale(1.02); }

        .modal {
            display: none;
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        .modal.active { display: flex; }
        .modal-content {
            max-width: 90%;
            max-height: 90%;
            border-radius: 8px;
        }
        .close-modal {
            position: absolute;
            top: 20px; right: 30px;
            color: white;
            font-size: 40px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Storybook Design Artifacts</h1>
            <p>Rescue Dog Aggregator Component Library</p>
            <p style="font-size: 1rem; color: #64748b;">Generated from Storybook • ${new Date().toLocaleString()}</p>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-number">${captures.length}</div>
                <div class="stat-label">Component Screenshots</div>
            </div>
            <div class="stat">
                <div class="stat-number">${[...new Set(captures.map(c => c.story))].length}</div>
                <div class="stat-label">Unique Components</div>
            </div>
            <div class="stat">
                <div class="stat-number">${CAPTURE_CONFIG.viewports.length}</div>
                <div class="stat-label">Viewport Sizes</div>
            </div>
            <div class="stat">
                <div class="stat-number">${CAPTURE_CONFIG.themes.length}</div>
                <div class="stat-label">Theme Variations</div>
            </div>
        </div>

        ${generateStoryGroups(captures)}
    </div>

    <div class="modal" id="modal">
        <span class="close-modal" onclick="closeModal()">&times;</span>
        <img class="modal-content" id="modal-img">
    </div>

    <script>
        function openModal(src) {
            document.getElementById('modal').classList.add('active');
            document.getElementById('modal-img').src = src;
        }

        function closeModal() {
            document.getElementById('modal').classList.remove('active');
        }

        // Close modal on click outside
        document.getElementById('modal').onclick = function(e) {
            if (e.target === this) closeModal();
        };

        // Close modal on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });
    </script>
</body>
</html>`;

  function generateStoryGroups(captures) {
    const storyGroups = {};
    captures.forEach(capture => {
      if (!storyGroups[capture.story]) {
        storyGroups[capture.story] = [];
      }
      storyGroups[capture.story].push(capture);
    });

    return Object.entries(storyGroups).map(([story, variants]) => `
      <div class="story-section">
        <h2 class="story-title">${story}</h2>
        <div class="variants-grid">
          ${CAPTURE_CONFIG.viewports.map(viewport =>
            CAPTURE_CONFIG.themes.map(theme => {
              const variant = variants.find(v => v.viewport === viewport.name && v.theme === theme);
              return variant ? `
                <div class="variant-card">
                  <div class="variant-header">
                    ${viewport.name.toUpperCase()} • ${theme.toUpperCase()}
                  </div>
                  <div class="screenshot-container">
                    <img
                      src="screenshots/${variant.filename}"
                      alt="${story} ${viewport.name} ${theme}"
                      class="screenshot"
                      onclick="openModal('screenshots/${variant.filename}')"
                    />
                  </div>
                </div>
              ` : '';
            }).join('')
          ).join('')}
        </div>
      </div>
    `).join('');
  }

  await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), html);
  console.log('✅ Visual gallery generated');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎨 STORYBOOK VISUAL DESIGN ARTIFACTS GENERATOR');
  console.log('==============================================');
  console.log('📋 This will:');
  console.log('   • Use your existing Storybook stories');
  console.log('   • Capture ALL components in multiple viewports');
  console.log('   • Generate light/dark theme variations');
  console.log('   • Create a comprehensive visual gallery');
  console.log('');

  try {
    let storybookProcess = null;

    // Ensure dependencies
    await ensureDependencies();

    // Check if Storybook is running, start if needed
    if (!(await checkStorybookRunning())) {
      console.log('⚠️  Storybook not detected on ports 6006 or 6007');
      console.log('Please ensure Storybook is running first with:');
      console.log('cd frontend && npm run storybook');
      process.exit(1);
    }

    // Wait a bit more for Storybook to fully load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Fetch stories
    console.log('📚 Fetching Storybook stories...');
    const stories = await fetchStories();
    console.log(`✅ Found ${stories.length} stories`);

    if (stories.length === 0) {
      throw new Error('No stories found. Make sure Storybook is running and has stories.');
    }

    // Generate Playwright capture script
    console.log('🎭 Generating capture script...');
    const scriptPath = await generatePlaywrightScript();

    // Run capture
    console.log('📸 Running comprehensive capture...');
    execSync(`node ${scriptPath}`, {
      cwd: __dirname,
      stdio: 'inherit'
    });

    // Load capture results
    const manifestPath = path.join(OUTPUT_DIR, 'capture-manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

    // Generate gallery
    console.log('🎨 Creating visual gallery...');
    await generateGallery(manifest.captures);

    // Create portable package
    console.log('📦 Creating portable package...');
    execSync(`cd "${OUTPUT_DIR}" && zip -r "../storybook-artifacts-$(date +%Y%m%d-%H%M%S).zip" .`, {
      shell: true
    });

    // Cleanup
    if (storybookProcess) {
      console.log('🧹 Stopping Storybook...');
      storybookProcess.kill();
    }

    console.log('');
    console.log('🎉 STORYBOOK DESIGN ARTIFACTS COMPLETE!');
    console.log(`📁 Output: ${OUTPUT_DIR}`);
    console.log(`🌐 Gallery: file://${path.join(OUTPUT_DIR, 'index.html')}`);
    console.log(`📸 Screenshots: ${manifest.captures.length} total`);
    console.log('');
    console.log('🎯 FOR YOUR DESIGNER FRIEND:');
    console.log('   • Open the gallery HTML file');
    console.log('   • Browse all component variations');
    console.log('   • Click screenshots for full-size view');
    console.log('   • Reference actual component designs');

    return {
      outputDir: OUTPUT_DIR,
      gallery: path.join(OUTPUT_DIR, 'index.html'),
      captures: manifest.captures.length
    };

  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  }
}

// Export for integration
module.exports = { main };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
