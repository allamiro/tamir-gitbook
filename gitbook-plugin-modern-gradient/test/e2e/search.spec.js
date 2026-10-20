'use strict';

const { test, expect } = require('@playwright/test');

const dialog = (page) => page.locator('.mg-search-dialog[role="dialog"]');
const input = (page) => page.locator('.mg-search-input');

test.describe('search dialog', () => {
    test('Ctrl+K opens the dialog with focus in the input', async ({ page }) => {
        await page.goto('./');
        await page.keyboard.press('Control+k');
        await expect(dialog(page)).toBeVisible();
        await expect(dialog(page)).toHaveAttribute('aria-modal', 'true');
        await expect(input(page)).toBeFocused();
        // empty query: pages plus up to two popular commands
        await expect(page.locator('.mg-search-group').first()).toHaveText('Pages');
        await expect(page.locator('.mg-search-group', { hasText: 'Popular commands' })).toBeVisible();
        expect(await page.locator('.mg-search-command').count()).toBeLessThanOrEqual(2);
    });

    test('the header button opens it and Esc returns focus to the button', async ({ page }) => {
        await page.goto('./');
        const button = page.locator('[data-mg-search]').first();
        await button.click();
        await expect(input(page)).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog(page)).toBeHidden();
        await expect(button).toBeFocused();
    });

    test('typing "docker" shows a Commands group, scope chips filter it', async ({ page }) => {
        await page.goto('./');
        await page.keyboard.press('Control+k');
        await input(page).fill('docker');
        await expect(page.locator('.mg-search-group', { hasText: /^Commands$/ })).toBeVisible();
        await expect(page.locator('.mg-search-command').first()).toContainText('docker');
        await page.locator('.mg-search-chip[data-scope="command"]').click();
        await expect(page.locator('.mg-search-group')).toHaveCount(1);
        await expect(page.locator('.mg-search-page')).toHaveCount(0);
        await expect(input(page)).toBeFocused();
    });

    test('Enter on a section result lands on that section anchor, in-app', async ({ page }) => {
        await page.goto('./');
        await page.evaluate(() => { window.__mgMarker = 'kept'; });
        await page.keyboard.press('Control+k');
        await input(page).fill('install docker');
        const section = page.locator('.mg-search-section', { hasText: 'Install Docker' }).first();
        await expect(section).toBeVisible();
        // move the active option onto the section with the arrow keys
        for (let i = 0; i < 20; i++) {
            if (await section.getAttribute('aria-selected') === 'true') break;
            await page.keyboard.press('ArrowDown');
        }
        await expect(section).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/docs\/components\.html#install-docker$/);
        await expect(page.locator('.markdown-section h1')).toHaveText('Components');
        await expect(page.locator('#install-docker')).toHaveCount(1);
        expect(await page.evaluate(() => window.__mgMarker)).toBe('kept');
        await expect(dialog(page)).toBeHidden();
    });

    test('"/" opens it, but not while typing in the sidebar search', async ({ page }) => {
        await page.goto('./');
        await page.locator('.book-summary').click({ position: { x: 5, y: 5 } }).catch(() => {});
        await page.locator('body').press('/');
        await expect(dialog(page)).toBeVisible();
        await page.keyboard.press('Escape');
        const sidebarSearch = page.locator('#book-search-input input');
        await sidebarSearch.click();
        await sidebarSearch.type('a/b');
        await expect(sidebarSearch).toHaveValue('a/b');
        await expect(dialog(page)).toBeHidden();
    });

    test('works after in-app navigation into a sub-folder (relative index path)', async ({ page }) => {
        await page.goto('./');
        await page.locator('.book-summary a[href="guides/long-page.html"]').first().click();
        await expect(page).toHaveURL(/\/docs\/guides\/long-page\.html$/);
        await page.keyboard.press('Control+k');
        await input(page).fill('code blocks');
        const result = page.locator('.mg-search-page', { hasText: 'Code blocks' }).first();
        await expect(result).toBeVisible();
        await result.click();
        await expect(page).toHaveURL(/\/docs\/code\.html$/);
    });
});
