'use strict';

const { test, expect } = require('@playwright/test');

// theme-default turns every link inside the page into an in-app (AJAX) page
// load; links to files must instead reach the browser untouched
test.describe('links to files', () => {
    test('a link to a .zip downloads it', async ({ page }) => {
        await page.goto('getting-started.html');
        const download = page.waitForEvent('download', { timeout: 10000 });
        await page.locator('.markdown-section a[href="files/sample.zip"]').click();
        expect((await download).suggestedFilename()).toBe('sample.zip');
    });

    test('a link to an .svg opens the file, not an in-app page load', async ({ page }) => {
        await page.goto('getting-started.html');
        await page.locator('.markdown-section a[href="files/diagram.svg"]').click();
        await expect(page).toHaveURL(/\/docs\/files\/diagram\.svg$/);
    });

    test('links to pages still navigate in-app', async ({ page }) => {
        await page.goto('getting-started.html');
        await page.evaluate(() => { window.__mgMarker = 'kept'; });
        await page.locator('.book-summary a[href="code.html"]').first().click();
        await expect(page).toHaveURL(/\/docs\/code\.html$/);
        expect(await page.evaluate(() => window.__mgMarker)).toBe('kept');
    });
});
