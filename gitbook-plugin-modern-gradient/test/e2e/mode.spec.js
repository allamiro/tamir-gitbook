'use strict';

const { test, expect } = require('@playwright/test');

// Records <html> state the moment <body> is inserted (before anything can
// paint) and again at DOMContentLoaded.
function recordEarlyState() {
    const snap = () => ({
        mode: document.documentElement.getAttribute('data-tg-mode'),
        classes: document.documentElement.className
    });
    window.__mgEarly = {};
    new MutationObserver((records, observer) => {
        if (document.body) {
            window.__mgEarly.body = snap();
            observer.disconnect();
        }
    }).observe(document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => {
        window.__mgEarly.domContentLoaded = snap();
    });
}

function isLocal(url) {
    if (!/^https?:/i.test(url)) return true;
    const host = new URL(url).hostname;
    return host === '127.0.0.1' || host === 'localhost';
}

test.describe('light and dark mode', () => {
    test('mode and variant classes are set before first paint', async ({ page }) => {
        await page.addInitScript(recordEarlyState);
        await page.goto('./');
        const early = await page.evaluate(() => window.__mgEarly);

        expect(early.body.mode).toBe('light');
        expect(early.body.classes.split(' ')).toEqual(expect.arrayContaining(['mg', 'mg-v-premium', 'mg-v-dev']));
        expect(early.domContentLoaded.mode).toBe('light');
    });

    test('the toggle switches to dark and the choice survives reload and navigation', async ({ page }) => {
        await page.goto('./');
        const html = page.locator('html');
        const toggle = page.locator('#mg-mode');

        await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode');
        await expect(toggle.locator('svg[data-mg-icon="moon"]')).toHaveCount(1);

        await toggle.click();
        await expect(html).toHaveAttribute('data-tg-mode', 'dark');
        await expect(toggle).toHaveAttribute('aria-label', 'Switch to light mode');
        await expect(toggle.locator('svg[data-mg-icon="sun"]')).toHaveCount(1);
        expect(await page.evaluate(() => localStorage.getItem('mg-mode'))).toBe('dark');

        await page.reload();
        await expect(html).toHaveAttribute('data-tg-mode', 'dark');
        await expect(page.locator('#mg-mode')).toHaveAttribute('aria-label', 'Switch to light mode');

        // In-app navigation replaces the header: it must come back in sync,
        // and one click must still toggle exactly once
        await page.evaluate(() => { window.__mgSamePage = true; });
        await page.locator('.book-summary a[href="getting-started.html"]').first().click();
        await expect(page.locator('.markdown-section h1')).toHaveText('Getting started');
        expect(await page.evaluate(() => window.__mgSamePage)).toBe(true);
        await expect(html).toHaveAttribute('data-tg-mode', 'dark');
        await expect(page.locator('#mg-mode')).toHaveAttribute('aria-label', 'Switch to light mode');
        await expect(page.locator('#mg-mode svg[data-mg-icon="sun"]')).toHaveCount(1);

        await page.locator('#mg-mode').click();
        await expect(html).toHaveAttribute('data-tg-mode', 'light');
        expect(await page.evaluate(() => localStorage.getItem('mg-mode'))).toBe('light');
    });

    test.describe('with a dark OS preference', () => {
        test.use({ colorScheme: 'dark' });

        test('starts dark when the reader has not chosen', async ({ page }) => {
            await page.addInitScript(recordEarlyState);
            await page.goto('./');
            expect(await page.evaluate(() => localStorage.getItem('mg-mode'))).toBeNull();
            const early = await page.evaluate(() => window.__mgEarly);
            expect(early.body.mode).toBe('dark');
            await expect(page.locator('#mg-mode')).toHaveAttribute('aria-label', 'Switch to light mode');
        });
    });
});

test.describe('self-hosted assets', () => {
    test('uses Inter and JetBrains Mono with no requests leaving localhost', async ({ page }) => {
        const requests = [];
        const failed = [];
        page.on('request', (req) => requests.push(req.url()));
        page.on('response', (res) => { if (res.status() >= 400) failed.push(res.url() + ' ' + res.status()); });

        await page.goto('./');
        await page.evaluate(() => document.fonts.ready);

        expect(await page.evaluate(() => document.fonts.check('16px Inter'))).toBe(true);
        const loaded = await page.evaluate(() => {
            const families = [];
            document.fonts.forEach((f) => { if (f.status === 'loaded') families.push(f.family.replace(/"/g, '')); });
            return families;
        });
        expect(loaded).toContain('Inter');
        expect(loaded).toContain('JetBrains Mono');

        const bodyFont = await page.locator('.markdown-section p').first()
            .evaluate((el) => getComputedStyle(el).fontFamily);
        expect(bodyFont.replace(/"/g, '')).toMatch(/^Inter\b/);

        // Fonts load from the sub-path, not the server root
        expect(requests.some((u) => /\/docs\/gitbook\/gitbook-plugin-modern-gradient\/fonts\/Inter-var-latin\.woff2$/.test(u))).toBe(true);
        expect(requests.filter((u) => !isLocal(u))).toEqual([]);
        expect(failed).toEqual([]);
    });
});

test.describe('header', () => {
    test('paints the header icons and has no script errors', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.goto('./');
        await expect(page.locator('.mg-header i[data-mg-icon]')).toHaveCount(0);
        await expect(page.locator('.mg-logo svg')).toHaveCount(1);
        await expect(page.locator('[data-mg-search]')).toBeVisible();
        await expect(page.locator('#mg-focus')).toBeVisible();
        await expect(page.locator('.mg-brand')).toContainText('Modern Gradient Fixture');
        await expect(page.locator('.mg-brand small')).toHaveText('Theme test book');
        await expect(page.locator('.book-header .font-settings')).toBeHidden();
        await expect(page.locator('#mg-menu')).toHaveAttribute('aria-controls', 'mg-sidebar');
        await expect(page.locator('#mg-sidebar.book-summary')).toHaveCount(1);
        expect(errors).toEqual([]);
    });

    test.describe('without JavaScript', () => {
        test.use({ javaScriptEnabled: false });

        test('content is readable and the JS-only controls are not shown', async ({ page }) => {
            await page.goto('./');
            await expect(page.locator('.markdown-section h1')).toBeVisible();
            await expect(page.locator('.markdown-section pre').first()).toBeVisible();
            await expect(page.locator('#mg-mode')).toBeHidden();
            await expect(page.locator('[data-mg-search]')).toBeHidden();
            await expect(page.locator('.mg-brand')).toBeVisible();
        });
    });
});
