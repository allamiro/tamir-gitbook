'use strict';

const { test, expect } = require('@playwright/test');

const PAGE = 'code.html';

function figure(page, n) {
    return page.locator('.markdown-section figure.mg-code').nth(n);
}

test.describe('code blocks', () => {
    test('render headers, titles and buttons with no script errors', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.goto(PAGE);

        await expect(page.locator('.markdown-section figure.mg-code')).toHaveCount(6);
        await expect(page.locator('.mg-code-opts')).toHaveCount(0);

        const json = figure(page, 0);
        await expect(json).toHaveAttribute('data-lang', 'json');
        await expect(json.locator('.mg-lang')).toHaveText('JSON');
        await expect(json.locator('.mg-code-title')).toHaveText('book.json');
        await expect(json.locator('.mg-code-title svg.mg-i')).toHaveCount(1);
        await expect(json.locator('.mg-code-btn')).toHaveText(['Lines', 'Wrap', 'Copy']);
        // highlight.js still ran on the code
        await expect(json.locator('.hljs-string').first()).toBeVisible();

        await expect(figure(page, 2).locator('.mg-lang')).toHaveText('Text');
        await expect(figure(page, 2).locator('pre')).toContainText('plain text & <tags>');
        expect(errors).toEqual([]);
    });

    test('line numbers and highlighted lines follow the code options', async ({ page }) => {
        await page.goto(PAGE);
        const json = figure(page, 0);
        const lines = json.locator('.mg-ln');
        await expect(lines).toHaveCount(7);
        await expect(json.locator('.mg-ln.hl')).toHaveCount(2);
        await expect(lines.nth(2)).toHaveClass(/\bhl\b/);
        await expect(lines.nth(3)).toHaveClass(/\bhl\b/);
        await expect(lines.nth(4)).not.toHaveClass(/\bhl\b/);

        const lineBtn = json.locator('.mg-code-btn[data-act="lines"]');
        await expect(lineBtn).toHaveAttribute('aria-pressed', 'true');
        const gutter = () => lines.first().evaluate((el) => getComputedStyle(el, '::before').content);
        expect(await gutter()).toBe('"1"');

        await lineBtn.click();
        await expect(lineBtn).toHaveAttribute('aria-pressed', 'false');
        await expect(json).toHaveAttribute('data-line-numbers', 'false');
        expect(await gutter()).toBe('none');

        await lineBtn.click();
        await expect(lineBtn).toHaveAttribute('aria-pressed', 'true');
        expect(await gutter()).toBe('"1"');
    });

    test('splitting keeps highlight spans that cross lines on both lines', async ({ page }) => {
        await page.goto(PAGE);
        const js = figure(page, 1);
        await expect(js.locator('.mg-ln')).toHaveCount(3);
        await expect(js.locator('.mg-ln').nth(0).locator('.hljs-comment')).toHaveText('/* A comment that');
        await expect(js.locator('.mg-ln').nth(1).locator('.hljs-comment')).toHaveText('   spans two lines */');
        // one line of text per line box: no blank lines between or after
        const heights = await js.locator('.mg-ln').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
        expect(heights[0]).toBeGreaterThan(15);
        expect(heights[0]).toBeLessThan(30);
        expect(heights[1]).toBe(heights[0]);
    });

    test('Wrap toggles white-space', async ({ page }) => {
        await page.goto(PAGE);
        const js = figure(page, 1);
        const line = js.locator('.mg-ln').nth(2);
        const wrapBtn = js.locator('.mg-code-btn[data-act="wrap"]');
        const whiteSpace = () => line.evaluate((el) => getComputedStyle(el).whiteSpace);

        expect(await whiteSpace()).toBe('pre');
        const before = await line.evaluate((el) => el.getBoundingClientRect().height);
        await wrapBtn.click();
        await expect(wrapBtn).toHaveAttribute('aria-pressed', 'true');
        expect(await whiteSpace()).toBe('pre-wrap');
        expect(await line.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(before);
        await wrapBtn.click();
        expect(await whiteSpace()).toBe('pre');
    });

    test('terminal blocks split commands from output and show the legend', async ({ page }) => {
        await page.goto(PAGE);
        const term = figure(page, 3);
        await expect(term).toHaveClass(/\bmg-terminal\b/);
        await expect(term).toHaveAttribute('data-lang', 'console');
        await expect(term.locator('.mg-lang')).toHaveText('Terminal');
        await expect(term.locator('.mg-cmd')).toHaveCount(2);
        await expect(term.locator('.mg-out')).toHaveCount(4);
        await expect(term.locator('.mg-out').nth(3)).toHaveText('<none>       <none>    0f3c2a1b');
        await expect(term.locator('.mg-code-foot')).toHaveText('$ command — copied' + 'output — not copied');

        // Commands-only terminal: no legend
        await expect(figure(page, 5).locator('.mg-code-foot')).toHaveCount(0);
        await expect(figure(page, 5).locator('.mg-cmd code')).toHaveText('echo "{{ page.title }}" &amp; done');

        // Developer variant: dark terminal panel in light mode
        const bg = await term.evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(bg).toBe('rgb(12, 15, 26)');
    });

    test.describe('copy', () => {
        test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

        test('copying a terminal block puts only the commands on the clipboard', async ({ page }) => {
            await page.goto(PAGE);
            const term = figure(page, 3);
            const copy = term.locator('.mg-code-btn[data-act="copy"]');
            await copy.click();
            expect(await page.evaluate(() => navigator.clipboard.readText()))
                .toBe('docker compose up -d\ndocker images --filter dangling=true');
            await expect(copy).toHaveClass(/\bmg-copied\b/);
            await expect(copy.locator('.mg-lbl')).toHaveText('Copied');
            await expect(copy.locator('svg[data-mg-icon="check"]')).toHaveCount(1);
            await expect(page.locator('.mg-sr-only[aria-live="polite"]'))
                .toHaveText('Commands copied to the clipboard, output left out');
            await expect(copy.locator('.mg-lbl')).toHaveText('Copy', { timeout: 3000 });
            await expect(copy).not.toHaveClass(/\bmg-copied\b/);
        });

        test('PowerShell prompts are left out too', async ({ page }) => {
            await page.goto(PAGE);
            await figure(page, 4).locator('.mg-code-btn[data-act="copy"]').click();
            expect(await page.evaluate(() => navigator.clipboard.readText()))
                .toBe('winget install -e --id Docker.DockerDesktop\ndocker --version');
        });

        test('copying a code block copies all of its text', async ({ page }) => {
            await page.goto(PAGE);
            await figure(page, 0).locator('.mg-code-btn[data-act="copy"]').click();
            const text = await page.evaluate(() => navigator.clipboard.readText());
            expect(text.split('\n')).toHaveLength(7);
            expect(text).toMatch(/^\{\n  "title": "Modern Gradient Fixture",/);
            expect(text).toMatch(/\n\}$/);
        });
    });

    test('works after in-app navigation', async ({ page }) => {
        await page.goto('./');
        await page.locator('.book-summary a[href="code.html"]').first().click();
        await expect(page.locator('.markdown-section h1')).toHaveText('Code blocks');
        await expect(figure(page, 0).locator('.mg-code-btn')).toHaveCount(3);
        await expect(figure(page, 0).locator('.mg-ln.hl')).toHaveCount(2);
    });

    test.describe('on a phone', () => {
        test.use({ viewport: { width: 390, height: 800 } });

        test('button labels are hidden but stay the accessible names', async ({ page }) => {
            await page.goto(PAGE);
            const lines = figure(page, 0).locator('.mg-code-btn[data-act="lines"]');
            const box = await lines.locator('.mg-lbl').boundingBox();
            expect(box.width).toBeLessThanOrEqual(1);
            await expect(lines).toHaveAccessibleName('Lines');
        });
    });

    test.describe('without JavaScript', () => {
        test.use({ javaScriptEnabled: false });

        test('every code block\'s text is visible', async ({ page }) => {
            await page.goto(PAGE);
            const pres = page.locator('.markdown-section pre');
            await expect(pres).toHaveCount(6);
            for (let i = 0; i < 6; i++) await expect(pres.nth(i)).toBeVisible();
            await expect(pres.nth(0)).toContainText('"title": "Modern Gradient Fixture"');
            await expect(pres.nth(1)).toContainText('spans two lines');
            await expect(pres.nth(2)).toContainText('plain text & <tags>');
            await expect(pres.nth(3)).toContainText('docker compose up -d');
            await expect(pres.nth(3)).toContainText('<none>');
            await expect(pres.nth(4)).toContainText('PS C:\\> docker --version');
            await expect(page.locator('.mg-code-btn')).toHaveCount(0);

            // terminal lines are one per line, without blank lines between
            const heights = await pres.nth(3).locator('.mg-ln').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
            expect(heights).toHaveLength(6);
            heights.forEach((h) => expect(h).toBe(heights[0]));
            const preBox = await pres.nth(3).boundingBox();
            expect(preBox.height).toBeLessThan(heights[0] * 6 + 40);
        });
    });
});
