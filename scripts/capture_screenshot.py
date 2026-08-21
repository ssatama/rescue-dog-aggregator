import json
import sys

from playwright.sync_api import sync_playwright

VIEWPORTS = {
    "desktop": {"width": 1920, "height": 1080},
    "laptop": {"width": 1366, "height": 768},
    "tablet": {"width": 768, "height": 1024},
    "mobile": {"width": 375, "height": 812},
}

PAGES = {
    "homepage": "https://www.rescuedogs.me",
    "dogs": "https://www.rescuedogs.me/dogs",
}


def capture_all(output_dir: str) -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()

        for page_name, url in PAGES.items():
            for device_name, viewport in VIEWPORTS.items():
                page = browser.new_page(
                    viewport=viewport,
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                )
                page.goto(url, wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(2000)

                output_path = f"{output_dir}/{page_name}_{device_name}.png"
                page.screenshot(path=output_path, full_page=False)
                print(f"Captured: {output_path}")

                fullpage_path = f"{output_dir}/{page_name}_{device_name}_full.png"
                page.screenshot(path=fullpage_path, full_page=True)
                print(f"Captured full page: {fullpage_path}")

                page.close()

        browser.close()


def extract_html_metadata(output_dir: str) -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        results = {}

        for page_name, url in PAGES.items():
            page = browser.new_page(
                viewport={"width": 1920, "height": 1080},
            )
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)

            metadata = page.evaluate("""() => {
                const meta = {};

                // Viewport meta tag
                const viewportMeta = document.querySelector('meta[name="viewport"]');
                meta.viewport = viewportMeta ? viewportMeta.getAttribute('content') : null;

                // Title
                meta.title = document.title;

                // Meta description
                const descMeta = document.querySelector('meta[name="description"]');
                meta.description = descMeta ? descMeta.getAttribute('content') : null;

                // All headings
                meta.headings = {};
                for (let i = 1; i <= 6; i++) {
                    const hs = document.querySelectorAll('h' + i);
                    if (hs.length > 0) {
                        meta.headings['h' + i] = Array.from(hs).map(h => h.textContent.trim()).slice(0, 10);
                    }
                }

                // Images without alt text
                const imgs = document.querySelectorAll('img');
                meta.totalImages = imgs.length;
                meta.imagesWithoutAlt = Array.from(imgs).filter(img => !img.getAttribute('alt') || img.getAttribute('alt').trim() === '').length;
                meta.imageFormats = [...new Set(Array.from(imgs).map(img => {
                    const src = img.getAttribute('src') || '';
                    if (src.includes('.webp') || src.includes('format=webp')) return 'webp';
                    if (src.includes('.avif')) return 'avif';
                    if (src.includes('.png')) return 'png';
                    if (src.includes('.jpg') || src.includes('.jpeg')) return 'jpeg';
                    if (src.includes('_next/image')) return 'next/image (optimized)';
                    return 'unknown';
                }))];

                // Next.js Image components (have data-nimg attribute)
                meta.nextImageCount = document.querySelectorAll('img[data-nimg]').length;

                // Links
                const links = document.querySelectorAll('a');
                meta.totalLinks = links.length;

                // Buttons without accessible text
                const buttons = document.querySelectorAll('button');
                meta.totalButtons = buttons.length;
                meta.buttonsWithoutLabel = Array.from(buttons).filter(btn => {
                    return !btn.getAttribute('aria-label') &&
                           !btn.textContent.trim() &&
                           !btn.querySelector('span:not([aria-hidden])');
                }).length;

                // ARIA attributes usage
                meta.ariaLabels = document.querySelectorAll('[aria-label]').length;
                meta.ariaDescribedBy = document.querySelectorAll('[aria-describedby]').length;
                meta.ariaRoles = document.querySelectorAll('[role]').length;

                // Semantic HTML
                meta.semanticElements = {
                    nav: document.querySelectorAll('nav').length,
                    main: document.querySelectorAll('main').length,
                    header: document.querySelectorAll('header').length,
                    footer: document.querySelectorAll('footer').length,
                    article: document.querySelectorAll('article').length,
                    section: document.querySelectorAll('section').length,
                    aside: document.querySelectorAll('aside').length,
                };

                // Forms
                const inputs = document.querySelectorAll('input');
                meta.totalInputs = inputs.length;
                meta.inputsWithoutLabel = Array.from(inputs).filter(input => {
                    const id = input.getAttribute('id');
                    const ariaLabel = input.getAttribute('aria-label');
                    const ariaLabelledBy = input.getAttribute('aria-labelledby');
                    const hasLabel = id && document.querySelector('label[for="' + id + '"]');
                    return !hasLabel && !ariaLabel && !ariaLabelledBy;
                }).length;

                // Focus outlines check (sample)
                meta.focusStyles = 'manual check required';

                // CTA buttons above fold
                const fold = window.innerHeight;
                const ctaButtons = Array.from(document.querySelectorAll('a, button')).filter(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.top < fold && rect.bottom > 0;
                });
                meta.aboveFoldCTAs = ctaButtons.map(el => ({
                    tag: el.tagName,
                    text: el.textContent.trim().substring(0, 80),
                    href: el.getAttribute('href') || null,
                })).slice(0, 20);

                // Navigation structure
                const navs = document.querySelectorAll('nav');
                meta.navigationLinks = Array.from(navs).map(nav => {
                    return Array.from(nav.querySelectorAll('a')).map(a => ({
                        text: a.textContent.trim(),
                        href: a.getAttribute('href'),
                    }));
                });

                // Color/font info from computed styles on body
                const bodyStyle = window.getComputedStyle(document.body);
                meta.bodyFontSize = bodyStyle.fontSize;
                meta.bodyFontFamily = bodyStyle.fontFamily;
                meta.bodyColor = bodyStyle.color;
                meta.bodyBackground = bodyStyle.backgroundColor;

                // Check for skip-to-content link
                meta.skipToContent = !!document.querySelector('a[href="#main-content"], a[href="#main"], a.skip-link, a.skip-to-content');

                // Check for prefers-reduced-motion handling
                meta.hasReducedMotionCSS = Array.from(document.styleSheets).some(sheet => {
                    try {
                        return Array.from(sheet.cssRules || []).some(rule =>
                            rule.conditionText && rule.conditionText.includes('prefers-reduced-motion')
                        );
                    } catch(e) { return false; }
                });

                return meta;
            }""")

            results[page_name] = metadata
            page.close()

        browser.close()

        with open(f"{output_dir}/metadata.json", "w") as f:
            json.dump(results, f, indent=2)
        print(f"Metadata saved to {output_dir}/metadata.json")


if __name__ == "__main__":
    output_dir = sys.argv[1] if len(sys.argv) > 1 else "screenshots"
    capture_all(output_dir)
    extract_html_metadata(output_dir)
