'use strict';

const { test, expect } = require('@playwright/test');

const LONG = 'guides/long-page.html';
const DUPES = 'guides/dupes.html';

function toc(page) {
    return page.locator('aside.mg-toc');
}

function tocLinks(page) {
    return toc(page).locator('a[data-mg-toc]');
}

// Top of an element relative to the viewport
function top(locator) {
    return locator.evaluate((el) => Math.round(el.getBoundingClientRect().top));
}

// Scrolled to: at the top of the viewport (scroll-margin-top is 16px), not
// merely passing it during a smooth scroll
async function atTop(locator) {
    const t = await top(locator);
    return t >= 0 && t < 40;
}

test.describe('table of contents', () => {
    test('lists the h2 and h3 headings with the page actions', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.goto(LONG);

        await expect(toc(page)).toBeVisible();
        await expect(toc(page).locator('.mg-toc-title')).toHaveText('On this page');
        await expect(tocLinks(page)).toHaveText([
            'First section', 'Second section', 'A subsection', 'Third section',
            'Fourth section', 'Fifth section', 'Sixth section'
        ]);
        await expect(toc(page).locator('li.mg-toc-l3')).toHaveCount(1);
        await expect(tocLinks(page).nth(1)).toHaveAttribute('href', '#second-section');
        // no editUrl in the fixture: no Edit this page link
        await expect(toc(page).locator('.mg-toc-actions > *')).toHaveText(['Back to top', 'Focus mode']);
        expect(errors).toEqual([]);
    });

    test('scrolling to the third section marks its link active', async ({ page }) => {
        await page.goto(LONG);
        await expect(toc(page).locator('a.active')).toHaveText('First section');

        await page.locator('#third-section').evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await expect(toc(page).locator('a[data-mg-toc="third-section"]')).toHaveClass(/\bactive\b/);
        await expect(toc(page).locator('a.active')).toHaveCount(1);
        await expect(toc(page).locator('a.active')).toHaveAttribute('aria-current', 'location');

        await page.locator('#first-section').evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await expect(toc(page).locator('a.active')).toHaveText('First section');
    });

    test('a link scrolls to its heading and updates the address', async ({ page }) => {
        await page.goto(LONG);
        await tocLinks(page).filter({ hasText: 'Fourth section' }).click();
        await expect.poll(() => atTop(page.locator('#fourth-section'))).toBe(true);
        await expect(page).toHaveURL(/\/docs\/guides\/long-page\.html#fourth-section$/);
        await expect(toc(page).locator('a.active')).toHaveText('Fourth section');
        await expect(page.locator('#fourth-section')).toBeFocused();
    });

    test('duplicate headings get distinct targets that scroll to different places', async ({ page }) => {
        await page.goto(DUPES);
        const ids = await page.locator('.markdown-section h2, .markdown-section h3')
            .evaluateAll((els) => els.map((el) => el.id));
        expect(ids).toEqual(['setup', 'options', 'setup-1', 'options-1']);

        await expect(tocLinks(page)).toHaveText(['Setup', 'Options', 'Setup', 'Options']);
        const hrefs = await tocLinks(page).evaluateAll((els) => els.map((a) => a.getAttribute('href')));
        expect(new Set(hrefs).size).toBe(4);

        await tocLinks(page).nth(2).click();
        await expect.poll(() => atTop(page.locator('#setup-1'))).toBe(true);
        expect(await top(page.locator('#setup'))).toBeLessThan(-200);

        await tocLinks(page).nth(0).click();
        await expect.poll(() => atTop(page.locator('#setup'))).toBe(true);
        expect(await top(page.locator('#setup-1'))).toBeGreaterThan(200);
    });

    test('a link to a renamed duplicate opens at that heading', async ({ page }) => {
        await page.goto(DUPES + '#setup-1');
        await expect.poll(() => atTop(page.locator('#setup-1'))).toBe(true);
    });

    test('pages with fewer than two headings show no TOC', async ({ page }) => {
        await page.goto('guides/no-headings.html');
        await expect(toc(page)).toBeEmpty();
        await expect(toc(page)).toBeHidden();

        // outside SUMMARY, one heading
        await page.goto('GLOSSARY.html');
        await expect(toc(page)).toBeEmpty();
        await expect(page.locator('.mg-crumbs')).toHaveText('Home');
    });

    test('Back to top returns to the start of the page', async ({ page }) => {
        await page.goto(LONG);
        await page.locator('#fifth-section').evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await toc(page).getByRole('button', { name: 'Back to top' }).click();
        await expect.poll(() => top(page.locator('.markdown-section h1'))).toBeGreaterThan(0);
    });

    test('the column is hidden below 1240px', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 900 });
        await page.goto(LONG);
        await expect(tocLinks(page)).toHaveCount(7);
        await expect(toc(page)).toBeHidden();
    });
});

test.describe('heading anchors', () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

    test('copy the section link and keep the heading name clean', async ({ page }) => {
        await page.goto(LONG);
        const heading = page.getByRole('heading', { name: 'Second section', exact: true });
        await expect(heading).toHaveCount(1);
        await expect(page.locator('.markdown-section .mg-anchor')).toHaveCount(7);

        const anchor = heading.locator('.mg-anchor');
        await expect(anchor).toHaveAttribute('aria-label', 'Copy link to “Second section”');
        await heading.hover();
        await expect(anchor).toHaveCSS('opacity', '1');
        await anchor.click();
        expect(await page.evaluate(() => navigator.clipboard.readText()))
            .toBe('http://127.0.0.1:4317/docs/guides/long-page.html#second-section');
        await expect(page.locator('.mg-toast')).toHaveText('Link copied');
        await expect(page.locator('.mg-toast')).toHaveClass(/\bmg-show\b/);
    });
});

test.describe('article chrome', () => {
    test('breadcrumbs, eyebrow, meta chips and prerequisites', async ({ page }) => {
        await page.goto(LONG);
        const crumbs = page.locator('nav.mg-crumbs[aria-label="Breadcrumb"] li');
        await expect(crumbs).toHaveText(['Home', 'Guides', 'Reading a long page']);
        await expect(crumbs.nth(2).locator('[aria-current="page"]')).toHaveCount(1);
        await expect(page.locator('.mg-eyebrow')).toHaveText('Guides');
        await expect(page.locator('.mg-meta .mg-chip')).toHaveText(['5 min read', 'Advanced']);
        await expect(page.locator('.mg-chip-level-advanced')).toBeVisible();
        await expect(page.locator('.mg-prereq li')).toHaveText(['Docker 24+', 'Git']);

        // the title sits between the breadcrumbs and the chips
        const order = await page.locator('.markdown-section > *').evaluateAll((els) =>
            els.slice(0, 4).map((el) => el.className || el.tagName));
        expect(order).toEqual(['mg-crumbs no-glossary', 'mg-eyebrow no-glossary', 'H1', 'mg-meta']);

        await page.locator('.mg-crumbs a', { hasText: 'Home' }).click();
        await expect(page).toHaveURL(/\/docs\/$/);
        await expect(page.locator('.markdown-section h1')).toHaveText('Theme fixture');
    });

    test('reading progress follows the scroll position', async ({ page }) => {
        await page.goto(LONG);
        const bar = page.locator('.book-body > .mg-progress > i');
        await expect(bar).toHaveCount(1);
        const scale = () => bar.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
        expect(await scale()).toBe(0);
        await page.locator('.body-inner').evaluate((el) => { el.scrollTop = el.scrollHeight; });
        await expect.poll(scale).toBeGreaterThan(0.99);
    });

    test.describe('without JavaScript', () => {
        test.use({ javaScriptEnabled: false });

        test('breadcrumbs, chips and the pager are still there; the chevrons are not', async ({ page }) => {
            await page.goto(LONG);
            await expect(page.locator('.mg-crumbs')).toBeVisible();
            await expect(page.locator('.mg-meta')).toBeVisible();
            await expect(page.locator('.mg-prereq')).toBeVisible();
            await expect(page.locator('.mg-pager .mg-prev')).toBeVisible();
            await expect(page.locator('.mg-pager .mg-next')).toBeVisible();
            await expect(page.locator('.navigation-prev')).toHaveCount(1);
            await expect(page.locator('.navigation-prev')).toBeHidden();
            await expect(page.locator('.mg-anchor')).toHaveCount(0);
        });
    });
});
