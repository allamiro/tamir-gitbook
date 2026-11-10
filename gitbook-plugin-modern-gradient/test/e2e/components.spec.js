'use strict';

const { test, expect } = require('@playwright/test');

const PAGE = 'components.html';
const SYNC_KEY = 'mg-tab:Linux|macOS|Windows';

function section(page) {
    return page.locator('.markdown-section');
}

function group(page, n) {
    return section(page).locator('.mg-tabs').nth(n);
}

async function expectSelected(tabs, slug) {
    const all = ['linux', 'macos', 'windows'];
    for (const s of all) {
        const on = s === slug;
        await expect(tabs.locator(`.mg-tab[data-tab="${s}"]`)).toHaveAttribute('aria-selected', String(on));
        await expect(tabs.locator(`.mg-tab[data-tab="${s}"]`)).toHaveAttribute('tabindex', on ? '0' : '-1');
        if (on) await expect(tabs.locator(`.mg-tabpanel[data-panel="${s}"]`)).toBeVisible();
        else await expect(tabs.locator(`.mg-tabpanel[data-panel="${s}"]`)).toBeHidden();
    }
}

test.describe('content components', () => {
    test('render callouts, tabs, steps, checklists and paths with no script errors', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.goto(PAGE);

        // 5 alerts (two merged by kramed, split again), 2 hints, 1 alert inside a tab
        await expect(section(page).locator('.mg-callout')).toHaveCount(8);
        await expect(section(page).locator('.mg-callout-title')).toHaveText(
            ['Note', 'Tip', 'Warning', 'Caution', 'Important', 'Saved', 'Note']);
        await expect(section(page).locator('.mg-callout-warning svg.mg-i')).toHaveCount(1);
        await expect(section(page).locator('blockquote')).toHaveCount(1);
        await expect(section(page).locator('blockquote')).toHaveText('A plain blockquote stays a plain quote.');
        // the block output is not left inside an empty paragraph
        expect(await section(page).locator('p:empty').count()).toBe(0);

        await expect(section(page).locator('.mg-tabs')).toHaveCount(2);
        await expect(section(page).locator('ol.mg-steps > li.mg-step')).toHaveCount(3);
        await expect(section(page).locator('.mg-path')).toHaveText(['book.json', 'SUMMARY.md', '_book/']);
        await expect(section(page).locator('.mg-path').nth(2).locator('svg[data-mg-icon="folder"]')).toHaveCount(1);

        // tab panels get ids for aria-controls / aria-labelledby
        const macTab = group(page, 0).locator('.mg-tab[data-tab="macos"]');
        const panelId = await macTab.getAttribute('aria-controls');
        await expect(group(page, 0).locator('#' + panelId)).toHaveAttribute('data-panel', 'macos');
        await expect(group(page, 0).locator('#' + panelId)).toHaveAttribute('aria-labelledby', await macTab.getAttribute('id'));
        expect(errors).toEqual([]);
    });

    test('code inside tabs and steps gets the code block treatment', async ({ page }) => {
        await page.goto(PAGE);
        await group(page, 0).locator('.mg-tab[data-tab="windows"]').click();
        const term = group(page, 0).locator('.mg-tabpanel[data-panel="windows"] figure.mg-code.mg-terminal');
        await expect(term).toBeVisible();
        await expect(term.locator('.mg-code-btn[data-act="copy"]')).toHaveCount(1);
        await expect(term.locator('.mg-cmd [class*="hljs-"]').first()).toBeAttached();

        const step = section(page).locator('.mg-step').nth(1);
        await expect(step.locator('figure.mg-code .mg-lang')).toHaveText('Terminal');
        await expect(step.locator('.mg-code-btn[data-act="copy"]')).toHaveCount(1);

        // filled step numbers use the strong gradient (white text at 4.5:1)
        const bg = await step.evaluate((el) => getComputedStyle(el, '::before').backgroundImage);
        expect(bg).toContain('rgb(79, 70, 229)');
    });

    test('choosing a tab switches every group with the same titles and is remembered', async ({ page }) => {
        await page.goto(PAGE);
        await expectSelected(group(page, 0), 'linux');
        await expectSelected(group(page, 1), 'linux');

        await group(page, 0).locator('.mg-tab[data-tab="macos"]').click();
        await expectSelected(group(page, 0), 'macos');
        await expectSelected(group(page, 1), 'macos');
        expect(await page.evaluate((key) => localStorage.getItem(key), SYNC_KEY)).toBe('macos');

        // in-app navigation away and back
        await page.evaluate(() => { window.__mgSamePage = true; });
        await page.locator('.book-summary a[href="getting-started.html"]').first().click();
        await expect(section(page).locator('h1')).toHaveText('Getting started');
        await page.locator('.book-summary a[href="components.html"]').first().click();
        await expect(section(page).locator('h1')).toHaveText('Components');
        expect(await page.evaluate(() => window.__mgSamePage)).toBe(true);
        await expectSelected(group(page, 0), 'macos');
        await expectSelected(group(page, 1), 'macos');

        // still one switch per click after navigation (no duplicate listeners)
        await group(page, 1).locator('.mg-tab[data-tab="windows"]').click();
        await expectSelected(group(page, 0), 'windows');
        await expectSelected(group(page, 1), 'windows');

        await page.reload();
        await expectSelected(group(page, 0), 'windows');
    });

    test('arrow keys, Home and End move between tabs (and not between pages)', async ({ page }) => {
        await page.goto(PAGE);
        await page.evaluate(() => { window.__mgSamePage = true; });
        const tabs = group(page, 0);
        await tabs.locator('.mg-tab[data-tab="linux"]').focus();

        await page.keyboard.press('ArrowRight');
        await expectSelected(tabs, 'macos');
        await expect(tabs.locator('.mg-tab[data-tab="macos"]')).toBeFocused();

        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await expectSelected(tabs, 'windows');
        await expect(tabs.locator('.mg-tab[data-tab="windows"]')).toBeFocused();

        await page.keyboard.press('Home');
        await expectSelected(tabs, 'linux');
        await page.keyboard.press('End');
        await expectSelected(tabs, 'windows');
        await expectSelected(group(page, 1), 'windows');
        expect(await page.evaluate(() => window.__mgSamePage)).toBe(true);
        await expect(section(page).locator('h1')).toHaveText('Components');

        // roving tabindex: one Tab press leaves the tablist
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.activeElement.classList.contains('mg-tab'))).toBe(false);
    });

    test('checking boxes updates the progress header', async ({ page }) => {
        await page.goto(PAGE);
        const list = section(page).locator('ul.mg-checklist');
        const boxes = list.locator('input[type="checkbox"]');
        const count = list.locator('.mg-checklist-count');

        await expect(boxes).toHaveCount(4);
        for (let i = 0; i < 4; i++) await expect(boxes.nth(i)).toBeEnabled();
        await expect(count).toHaveText('1 of 4 done');

        await list.getByText('The container is healthy').click();
        await expect(boxes.nth(0)).toBeChecked();
        await expect(count).toHaveText('2 of 4 done');
        const width = () => list.locator('.mg-meter i').evaluate((el) => el.style.width);
        expect(await width()).toBe('50%');

        await boxes.nth(1).uncheck();
        await expect(count).toHaveText('1 of 4 done');
        await boxes.nth(2).check();
        await boxes.nth(3).check();
        await expect(count).toHaveText('3 of 4 done');

        // checked boxes are filled with the strong gradient
        const fill = await boxes.nth(2).evaluate((el) => getComputedStyle(el).backgroundImage);
        expect(fill).toContain('rgb(79, 70, 229)');

        // state is per page load
        await page.reload();
        await expect(count).toHaveText('1 of 4 done');
    });

    test('details open and close', async ({ page }) => {
        await page.goto(PAGE);
        const details = section(page).locator('details');
        await expect(details.getByText('Hidden until opened.')).toBeHidden();
        await details.locator('summary').click();
        await expect(details.getByText('Hidden until opened.')).toBeVisible();
    });

    test.describe('without JavaScript', () => {
        test.use({ javaScriptEnabled: false });

        test('callouts, every tab panel and the checklist state are readable', async ({ page }) => {
            await page.goto(PAGE);
            const titles = section(page).locator('.mg-callout-title');
            await expect(titles).toHaveCount(7);
            for (let i = 0; i < 7; i++) await expect(titles.nth(i)).toBeVisible();
            await expect(section(page).locator('.mg-callout-icon svg').first()).toBeVisible();

            // tabs cannot switch: every panel is shown, the tab buttons are not
            const panels = section(page).locator('.mg-tabpanel');
            await expect(panels).toHaveCount(6);
            for (let i = 0; i < 6; i++) await expect(panels.nth(i)).toBeVisible();
            await expect(section(page).locator('.mg-tablist').first()).toBeHidden();
            const label = await panels.nth(1).evaluate((el) => getComputedStyle(el, '::before').content);
            expect(label).toBe('"macOS"');
            await expect(section(page).locator('.mg-tabpanel pre')).toHaveCount(3);
            for (let i = 0; i < 3; i++) await expect(section(page).locator('.mg-tabpanel pre').nth(i)).toBeVisible();

            const boxes = section(page).locator('ul.mg-checklist input[type="checkbox"]');
            await expect(boxes.nth(1)).toBeChecked();
            await expect(boxes.nth(0)).toBeDisabled();
            await expect(section(page).locator('.mg-checklist-head')).toHaveCount(0);
        });
    });
});
