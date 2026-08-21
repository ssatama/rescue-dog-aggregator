import json
import os
import sys

from playwright.sync_api import sync_playwright

VIEWPORTS = {
    "desktop": {"width": 1920, "height": 1080},
    "mobile": {"width": 375, "height": 812},
}

PAGES = {
    "homepage": "https://www.rescuedogs.me",
    "dogs": "https://www.rescuedogs.me/dogs",
    "dog_detail": "https://www.rescuedogs.me/dogs/badger-mixed-breed-7563",
    "breeds": "https://www.rescuedogs.me/breeds",
    "breed_detail": "https://www.rescuedogs.me/breeds/lurcher",
}


def capture_screenshots(output_dir: str) -> None:
    os.makedirs(output_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()

        for page_name, url in PAGES.items():
            for device_name, viewport in VIEWPORTS.items():
                page = browser.new_page(
                    viewport=viewport,
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                )
                try:
                    page.goto(url, wait_until="networkidle", timeout=30000)
                    page.wait_for_timeout(3000)

                    output_path = f"{output_dir}/{page_name}_{device_name}.png"
                    page.screenshot(path=output_path, full_page=False)
                    print(f"Captured above-fold: {output_path}")

                    fullpage_path = f"{output_dir}/{page_name}_{device_name}_full.png"
                    page.screenshot(path=fullpage_path, full_page=True)
                    print(f"Captured full page: {fullpage_path}")

                except Exception as e:
                    print(f"ERROR capturing {page_name} {device_name}: {e}")
                finally:
                    page.close()

        browser.close()


def extract_metadata(output_dir: str) -> dict:
    os.makedirs(output_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        all_results = {}

        for page_name, url in PAGES.items():
            page_results = {}
            for device_name, viewport in VIEWPORTS.items():
                page = browser.new_page(viewport=viewport)
                try:
                    page.goto(url, wait_until="networkidle", timeout=30000)
                    page.wait_for_timeout(3000)

                    metadata = page.evaluate("""() => {
                        const meta = {};
                        const fold = window.innerHeight;

                        // Basic page info
                        meta.title = document.title;
                        const descMeta = document.querySelector('meta[name="description"]');
                        meta.description = descMeta ? descMeta.getAttribute('content') : null;

                        // Headings
                        meta.headings = {};
                        for (let i = 1; i <= 3; i++) {
                            const hs = document.querySelectorAll('h' + i);
                            if (hs.length > 0) {
                                meta.headings['h' + i] = Array.from(hs).map(h => ({
                                    text: h.textContent.trim().substring(0, 100),
                                    aboveFold: h.getBoundingClientRect().top < fold,
                                })).slice(0, 10);
                            }
                        }

                        // Images analysis
                        const imgs = document.querySelectorAll('img');
                        meta.totalImages = imgs.length;
                        meta.imagesWithoutAlt = Array.from(imgs).filter(img =>
                            !img.getAttribute('alt') || img.getAttribute('alt').trim() === ''
                        ).length;
                        meta.imagesWithoutDimensions = Array.from(imgs).filter(img =>
                            !img.getAttribute('width') && !img.getAttribute('height') &&
                            !img.style.width && !img.style.height
                        ).length;
                        meta.nextImageCount = document.querySelectorAll('img[data-nimg]').length;
                        meta.lazyLoadedImages = Array.from(imgs).filter(img =>
                            img.getAttribute('loading') === 'lazy'
                        ).length;

                        // Images with blur placeholder
                        meta.imagesWithBlur = Array.from(imgs).filter(img => {
                            const parent = img.parentElement;
                            return parent && (
                                parent.style.backgroundImage ||
                                parent.querySelector('[style*="blur"]') ||
                                img.style.filter?.includes('blur')
                            );
                        }).length;

                        // CLS risk: images without explicit dimensions
                        meta.clsRiskImages = Array.from(imgs).filter(img => {
                            const rect = img.getBoundingClientRect();
                            return rect.top < fold && (
                                !img.getAttribute('width') || !img.getAttribute('height')
                            ) && !img.closest('[data-nimg]');
                        }).map(img => ({
                            src: (img.getAttribute('src') || '').substring(0, 80),
                            alt: img.getAttribute('alt') || 'none',
                            hasDataNimg: !!img.getAttribute('data-nimg'),
                        })).slice(0, 10);

                        // CTAs above fold
                        meta.aboveFoldCTAs = Array.from(
                            document.querySelectorAll('a, button')
                        ).filter(el => {
                            const rect = el.getBoundingClientRect();
                            return rect.top < fold && rect.bottom > 0 && rect.width > 0;
                        }).map(el => ({
                            tag: el.tagName,
                            text: el.textContent.trim().substring(0, 60),
                            href: el.getAttribute('href') || null,
                            width: Math.round(el.getBoundingClientRect().width),
                            height: Math.round(el.getBoundingClientRect().height),
                        })).slice(0, 25);

                        // Touch target analysis (mobile relevant)
                        const interactiveEls = document.querySelectorAll('a, button, input, select, textarea');
                        meta.smallTouchTargets = Array.from(interactiveEls).filter(el => {
                            const rect = el.getBoundingClientRect();
                            return rect.width > 0 && rect.height > 0 &&
                                   (rect.width < 44 || rect.height < 44) &&
                                   rect.top < fold * 2;
                        }).map(el => ({
                            tag: el.tagName,
                            text: (el.textContent || el.getAttribute('aria-label') || '').trim().substring(0, 40),
                            width: Math.round(el.getBoundingClientRect().width),
                            height: Math.round(el.getBoundingClientRect().height),
                        })).slice(0, 15);

                        // Navigation
                        const navs = document.querySelectorAll('nav');
                        meta.navigationLinks = Array.from(navs).map(nav =>
                            Array.from(nav.querySelectorAll('a')).map(a => ({
                                text: a.textContent.trim(),
                                href: a.getAttribute('href'),
                                visible: a.getBoundingClientRect().width > 0,
                            }))
                        );

                        // Hamburger menu check
                        meta.hasHamburgerMenu = !!document.querySelector(
                            '[aria-label*="menu" i], [aria-label*="navigation" i], ' +
                            'button.hamburger, button.menu-toggle, [data-testid="mobile-menu"]'
                        );

                        // Text readability
                        const bodyStyle = window.getComputedStyle(document.body);
                        meta.bodyFontSize = bodyStyle.fontSize;
                        meta.bodyFontFamily = bodyStyle.fontFamily;

                        // Check for small text
                        const allText = document.querySelectorAll('p, span, a, li, td, th, label, div');
                        meta.smallTextElements = Array.from(allText).filter(el => {
                            const style = window.getComputedStyle(el);
                            const size = parseFloat(style.fontSize);
                            return size < 14 && el.textContent.trim().length > 10 &&
                                   el.getBoundingClientRect().width > 0;
                        }).length;

                        // Horizontal overflow check
                        meta.hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
                        meta.pageWidth = document.documentElement.scrollWidth;
                        meta.viewportWidth = document.documentElement.clientWidth;

                        // Semantic HTML
                        meta.semanticElements = {
                            nav: document.querySelectorAll('nav').length,
                            main: document.querySelectorAll('main').length,
                            header: document.querySelectorAll('header').length,
                            footer: document.querySelectorAll('footer').length,
                            article: document.querySelectorAll('article').length,
                            section: document.querySelectorAll('section').length,
                        };

                        // Accessibility
                        meta.ariaLabels = document.querySelectorAll('[aria-label]').length;
                        meta.skipToContent = !!document.querySelector(
                            'a[href="#main-content"], a[href="#main"], a.skip-link'
                        );

                        // Buttons without accessible text
                        const buttons = document.querySelectorAll('button');
                        meta.buttonsWithoutLabel = Array.from(buttons).filter(btn =>
                            !btn.getAttribute('aria-label') &&
                            !btn.textContent.trim() &&
                            !btn.querySelector('[aria-label]')
                        ).map(btn => ({
                            classes: btn.className.substring(0, 60),
                            innerHTML: btn.innerHTML.substring(0, 80),
                        })).slice(0, 10);

                        // Skeleton loaders present
                        meta.skeletonLoaders = document.querySelectorAll(
                            '[class*="skeleton" i], [class*="shimmer" i], [class*="pulse" i], [class*="loading" i]'
                        ).length;

                        // Font loading
                        meta.fontsLoaded = document.fonts ? document.fonts.size : 'API not available';

                        // Color contrast sampling on key elements
                        const h1 = document.querySelector('h1');
                        if (h1) {
                            const h1Style = window.getComputedStyle(h1);
                            meta.h1Style = {
                                color: h1Style.color,
                                backgroundColor: h1Style.backgroundColor,
                                fontSize: h1Style.fontSize,
                                fontWeight: h1Style.fontWeight,
                            };
                        }

                        return meta;
                    }""")

                    page_results[device_name] = metadata

                except Exception as e:
                    page_results[device_name] = {"error": str(e)}
                finally:
                    page.close()

            all_results[page_name] = page_results

        browser.close()

        output_path = f"{output_dir}/audit_metadata.json"
        with open(output_path, "w") as f:
            json.dump(all_results, f, indent=2)
        print(f"\nMetadata saved to {output_path}")

        return all_results


if __name__ == "__main__":
    output_dir = sys.argv[1] if len(sys.argv) > 1 else "screenshots"
    capture_screenshots(output_dir)
    results = extract_metadata(output_dir)

    print("\n=== AUDIT SUMMARY ===")
    for page_name, devices in results.items():
        print(f"\n--- {page_name} ---")
        for device, data in devices.items():
            if "error" in data:
                print(f"  {device}: ERROR - {data['error']}")
                continue
            print(f"  {device}:")
            print(f"    Title: {data.get('title', 'N/A')}")
            print(f"    Images: {data.get('totalImages', 0)} total, {data.get('imagesWithoutAlt', 0)} missing alt")
            print(f"    Small touch targets: {len(data.get('smallTouchTargets', []))}")
            print(f"    Horizontal scroll: {data.get('hasHorizontalScroll', False)}")
            print(f"    Small text elements: {data.get('smallTextElements', 0)}")
            print(f"    Skeleton loaders: {data.get('skeletonLoaders', 0)}")
