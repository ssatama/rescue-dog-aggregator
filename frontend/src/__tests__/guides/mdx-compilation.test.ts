import { getAllGuides, getGuide } from '@/lib/guides';

describe('MDX Guide Compilation', () => {
  it('should compile all guide MDX files without errors', async () => {
    // Get all guides (this triggers MDX compilation)
    const guides = await getAllGuides();

    // Should have all 4 guides
    expect(guides).toHaveLength(4);

    // All guides should have basic structure
    guides.forEach((guide) => {
      expect(guide.frontmatter).toBeDefined();
      expect(guide.slug).toBeDefined();
    });

    // Test that each guide can be serialized without errors
    for (const guide of guides) {
      const fullGuide = await getGuide(guide.slug);
      expect(fullGuide.serializedContent).toBeDefined();
    }
  });

  it('should have valid frontmatter for all guides', async () => {
    const guides = await getAllGuides();

    guides.forEach((guide) => {
      const { frontmatter } = guide;

      // Required fields
      expect(frontmatter.title).toBeDefined();
      expect(frontmatter.slug).toBeDefined();
      expect(frontmatter.description).toBeDefined();
      expect(frontmatter.heroImage).toBeDefined();
      expect(frontmatter.readTime).toBeGreaterThan(0);
      expect(frontmatter.category).toBeDefined();
      expect(frontmatter.lastUpdated).toBeDefined();
    });
  });

  it('should not have lines starting with numbers (invalid JSX)', async () => {
    const fs = require('fs');
    const path = require('path');

    const guidesDir = path.join(process.cwd(), 'content', 'guides');
    const files = fs.readdirSync(guidesDir).filter((f: string) => f.endsWith('.mdx'));

    files.forEach((file: string) => {
      const content = fs.readFileSync(path.join(guidesDir, file), 'utf-8');
      const lines = content.split('\n');
      let inFrontmatter = false;
      let inCodeBlock = false;

      lines.forEach((line: string, index: number) => {
        // Track frontmatter boundaries
        if (line.trim() === '---') {
          inFrontmatter = !inFrontmatter;
          return;
        }

        // Track code block boundaries
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          return;
        }

        // Skip lines inside frontmatter or code blocks
        if (inFrontmatter || inCodeBlock) return;

        // Check if line starts with a number - MDX doesn't support numbered lists
        // Any line starting with \d is invalid (e.g., "1. Text", "2024 Stats")
        const startsWithNumber = /^\d/.test(line.trim());

        if (startsWithNumber) {
          throw new Error(`${file}:${index + 1} - Line starts with number (invalid JSX): "${line.substring(0, 50)}..."`);
        }
      });
    });
  });

  it('should not have text immediately after closing JSX tags', async () => {
    const fs = require('fs');
    const path = require('path');

    const guidesDir = path.join(process.cwd(), 'content', 'guides');
    const files = fs.readdirSync(guidesDir).filter((f: string) => f.endsWith('.mdx'));

    files.forEach((file: string) => {
      const content = fs.readFileSync(path.join(guidesDir, file), 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line: string, index: number) => {
        // Check for </div> followed by text on the same line
        if (line.includes('</div>') && line.split('</div>')[1]?.trim().length > 0) {
          const textAfter = line.split('</div>')[1].trim();
          if (textAfter && !textAfter.startsWith('<')) {
            throw new Error(`${file}:${index + 1} - Text after closing tag: "${line.substring(0, 80)}..."`);
          }
        }
      });
    });
  });

  it('should have unique slugs', async () => {
    const guides = await getAllGuides();
    const slugs = guides.map((g) => g.slug);
    const uniqueSlugs = new Set(slugs);

    expect(slugs.length).toBe(uniqueSlugs.size);
  });
});
