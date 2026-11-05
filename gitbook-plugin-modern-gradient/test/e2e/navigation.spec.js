'use strict';

const { test, expect } = require('@playwright/test');

// Counts MG.toast calls; mg-code.js and mg-content.js look MG.toast up at
// call time, so a duplicated listener would show up as a second call
async function countToasts(page) {
    await page.evaluate(() => {
        window.__mgToasts = [];
        const original = window.MG.toast;
        window.MG.toast = function(message) {
            window.__mgToasts.push(message);
            return original.apply(this, arguments);
        };
    });
}

function sidebarLink(page, href) {
    return page.locator('.book-summary a[href="' + href + '"]').first();
}

test.describe('in-app navigation', () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

    test('re-initialises copy, tabs, TOC and anchors on the new page, once', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.goto('./');
        await page.evaluate(() => { window.__mgMarker = 'kept'; });
        await countToasts(page);

        // two in-app hops, so per-page set-up would have run three times
        await sidebarLink(page, 'getting-started.html').click();
        await expect(page.locator('.markdown-section h1')).toHaveText('Getting started');
        await sidebarLink(page, 'components.html').click();
        await expect(page.locator('.markdown-section h1')).toHaveText('Components');
        await expect(page).toHaveURL(/\/docs\/components\.html$/);
        expect(await page.evaluate(() => window.__mgMarker)).toBe('kept');

        // the TOC lists this page's headings
        await expect(page.locator('aside.mg-toc a[data-mg-toc]')).toHaveText([
            'Callouts', 'Tabs', 'Steps', 'Install Docker', 'Start the wiki', 'Check it',
            'Checklist', 'Details'
        ]);
        // one anchor per h2/h3, one progress bar
        const perHeading = await page.locator('.markdown-section h2, .markdown-section h3')
            .evaluateAll((els) => els.map((el) => el.querySelectorAll('.mg-anchor').length));
        expect(perHeading.length).toBeGreaterThan(0);
        expect(perHeading.every((n) => n === 1)).toBe(true);
        await expect(page.locator('.mg-progress')).toHaveCount(1);
        await expect(page.locator('.mg-toast')).toHaveCount(1);

        // tabs work
        const tabs = page.locator('.markdown-section .mg-tabs').first();
        await tabs.locator('.mg-tab[data-tab="macos"]').click();
        await expect(tabs.locator('.mg-tab[data-tab="macos"]')).toHaveAttribute('aria-selected', 'true');
        await expect(tabs.locator('.mg-tabpanel[data-panel="macos"]')).toBeVisible();

        // copy works and fires exactly one toast
        await tabs.locator('.mg-tabpanel[data-panel="macos"] .mg-code-btn[data-act="copy"]').click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('brew install --cask docker');
        await expect(page.locator('.mg-toast')).toHaveText('Code copied to the clipboard');
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => window.__mgToasts)).toEqual(['Code copied to the clipboard']);

        // and so does a heading anchor
        await page.locator('#tabs .mg-anchor').click();
        expect(await page.evaluate(() => navigator.clipboard.readText()))
            .toBe('http://127.0.0.1:4317/docs/components.html#tabs');
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => window.__mgToasts)).toEqual(['Code copied to the clipboard', 'Link copied']);
        expect(errors).toEqual([]);
    });

    test('the scrollspy follows the new page after navigating', async ({ page }) => {
        await page.goto('guides/long-page.html');
        await page.evaluate(() => { window.__mgMarker = 'kept'; });
        await page.locator('.mg-pager .mg-next').click();
        await expect(page.locator('.markdown-section h1')).toHaveText('Duplicate headings');
        expect(await page.evaluate(() => window.__mgMarker)).toBe('kept');

        await page.locator('#setup-1').evaluate((el) => el.scrollIntoView({ block: 'start' }));
        const active = page.locator('aside.mg-toc a.active');
        await expect(active).toHaveCount(1);
        await expect(active).toHaveAttribute('data-mg-toc', 'setup-1');
    });
});

test.describe('previous / next cards', () => {
    test('the first page has only Next, the last only Previous', async ({ page }) => {
        await page.goto('./');
        await expect(page.locator('.mg-pager .mg-prev')).toHaveCount(0);
        await expect(page.locator('.mg-pager .mg-next .mg-pager-title')).toHaveText('Getting started');

        await page.goto('guides/no-headings.html');
        await expect(page.locator('.mg-pager .mg-next')).toHaveCount(0);
        await expect(page.locator('.mg-pager .mg-prev .mg-pager-title')).toHaveText('Duplicate headings');
        // no title, no chips (readingTime: false): no empty widgets
        await expect(page.locator('.mg-meta')).toHaveCount(0);
        await expect(page.locator('.mg-prereq')).toHaveCount(0);
    });

    test('links resolve from sub-folders under the /docs/ sub-path', async ({ page }) => {
        await page.goto('guides/long-page.html');
        await page.evaluate(() => { window.__mgMarker = 'kept'; });

        await page.locator('.mg-pager .mg-prev').click();
        await expect(page).toHaveURL(/\/docs\/guides\/$/);
        await expect(page.locator('.markdown-section h1')).toHaveText('Guides');

        await page.locator('.mg-pager .mg-prev').click();
        await expect(page).toHaveURL(/\/docs\/components\.html$/);
        await expect(page.locator('.markdown-section h1')).toHaveText('Components');

        await page.locator('.mg-pager .mg-next').click();
        await expect(page).toHaveURL(/\/docs\/guides\/$/);
        await page.locator('.mg-pager .mg-next').click();
        await expect(page).toHaveURL(/\/docs\/guides\/long-page\.html$/);
        expect(await page.evaluate(() => window.__mgMarker)).toBe('kept');

        // a full load of each target works too
        for (const href of await page.locator('.mg-pager a, .mg-crumbs a').evaluateAll((els) => els.map((a) => a.href))) {
            const res = await page.request.get(href);
            expect(res.status(), href).toBe(200);
        }
    });

    test('the Left / Right shortcuts still use the hidden chevrons', async ({ page }) => {
        await page.goto('getting-started.html');
        await expect(page.locator('.navigation-next')).toBeHidden();
        await page.locator('.markdown-section p').first().click();
        await page.keyboard.press('ArrowRight');
        await expect(page).toHaveURL(/\/docs\/code\.html$/);
        await page.keyboard.press('ArrowLeft');
        await expect(page).toHaveURL(/\/docs\/getting-started\.html$/);
    });
});
