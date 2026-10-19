#!/usr/bin/env node
/*
 * Generates themes/modern-gradient.css, the CSS-only edition of the Modern
 * Gradient theme, from the plugin's token and base stylesheets:
 *
 *   gitbook-plugin-modern-gradient/assets/css/tokens.css
 *   gitbook-plugin-modern-gradient/assets/css/base.css
 *
 * The CSS-only edition needs no plugin and no JavaScript, so:
 *   - dark tokens move under @media (prefers-color-scheme: dark)
 *   - the default variants (premium + developer) are resolved onto :root
 *   - fonts fall back to the system stacks (no web fonts are bundled)
 *
 * Plain CommonJS, ES5, no dependencies: runs on Node 10 and later.
 * Usage: node scripts/build-modern-gradient-css.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var CSS_DIR = path.join(ROOT, 'gitbook-plugin-modern-gradient', 'assets', 'css');
var OUTPUT = path.join(ROOT, 'themes', 'modern-gradient.css');

var DEFAULT_VARIANTS = ['mg-v-premium', 'mg-v-dev'];
var DARK_SELECTOR = ':root[data-tg-mode="dark"]';
var VARIANT_SELECTOR = /^html\.(mg-v-[a-z]+)(\[data-tg-mode="dark"\])?$/;

var HEADER = [
    '/* Theme: Modern Gradient (CSS-only edition)',
    ' * Generated file: edit gitbook-plugin-modern-gradient/assets/css, then run',
    ' * node scripts/build-modern-gradient-css.js',
    ' * Follows the OS light/dark setting; use the modern-gradient plugin for the',
    ' * mode toggle, web fonts, code-block tools and the rest of the theme.',
    ' * Selected via book.json:  "styles": { "website": "themes/modern-gradient.css" }',
    ' */'
].join('\n');

// Splits a stylesheet of plain top-level rules (no at-rules) into
// { lead, selector, body } records. `lead` is the comment text before a rule.
function parseRules(css) {
    var rules = [];
    var pos = 0;
    var lead = '';
    var open;
    var close;
    var comment;
    var chunk;
    while (pos < css.length) {
        chunk = css.slice(pos);
        comment = /^\s*(\/\*[\s\S]*?\*\/)/.exec(chunk);
        if (comment) {
            lead += (lead ? '\n' : '') + comment[1];
            pos += comment[0].length;
            continue;
        }
        if (/^\s*$/.test(chunk)) {
            break;
        }
        open = css.indexOf('{', pos);
        close = css.indexOf('}', open);
        if (open < 0 || close < 0) {
            throw new Error('tokens.css: unbalanced braces near "' + chunk.slice(0, 40) + '"');
        }
        if (css.slice(open + 1, close).indexOf('{') >= 0) {
            throw new Error('tokens.css: nested rules and at-rules are not supported');
        }
        rules.push({
            lead: lead,
            selector: css.slice(pos, open).trim(),
            body: css.slice(open + 1, close).replace(/^\n+|\s+$/g, '')
        });
        lead = '';
        pos = close + 1;
    }
    return rules;
}

function block(selector, body) {
    return selector + ' {\n' + body + '\n}';
}

function indent(text) {
    return text.replace(/^(?=.)/gm, '    ');
}

function systemFonts(css) {
    return css.replace(/"Inter", /g, '').replace(/"JetBrains Mono", /g, '');
}

function buildCssOnly(tokensCss, baseCss) {
    var light = [];
    var dark = [];

    parseRules(tokensCss).forEach(function (rule) {
        var variant;
        if (rule.selector === ':root') {
            light.push(block(':root', rule.body));
        } else if (rule.selector === DARK_SELECTOR) {
            dark.push(rule.body);
        } else if ((variant = VARIANT_SELECTOR.exec(rule.selector))) {
            if (DEFAULT_VARIANTS.indexOf(variant[1]) < 0) {
                return;
            }
            if (variant[2]) {
                dark.push(rule.body);
            } else {
                light.push((rule.lead ? rule.lead + '\n' : '') + block(':root', rule.body));
            }
        } else {
            throw new Error('tokens.css: unexpected selector "' + rule.selector + '"');
        }
    });

    var darkBlock = '@media (prefers-color-scheme: dark) {\n' +
        indent(block(':root', dark.join('\n\n'))) + '\n}';

    return [
        HEADER,
        systemFonts(light.join('\n\n')),
        systemFonts(darkBlock),
        baseCss.replace(/^\s+|\s+$/g, '')
    ].join('\n\n') + '\n';
}

function main() {
    var tokens = fs.readFileSync(path.join(CSS_DIR, 'tokens.css'), 'utf8');
    var base = fs.readFileSync(path.join(CSS_DIR, 'base.css'), 'utf8');
    fs.writeFileSync(OUTPUT, buildCssOnly(tokens, base));
    console.log('wrote ' + path.relative(process.cwd(), OUTPUT));
}

module.exports = { buildCssOnly: buildCssOnly };

if (require.main === module) {
    main();
}
