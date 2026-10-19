'use strict';

var fs = require('fs');
var path = require('path');
require('should');

var pluginDir = path.join(__dirname, '..');
var repoDir = path.join(pluginDir, '..');
var buildCssOnly = require(path.join(repoDir, 'scripts', 'build-modern-gradient-css.js')).buildCssOnly;

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

var tokensCss = read(path.join(pluginDir, 'assets', 'css', 'tokens.css'));
var baseCss = read(path.join(pluginDir, 'assets', 'css', 'base.css'));
var componentsCss = read(path.join(pluginDir, 'assets', 'css', 'components.css'));

// ---------------------------------------------------------------- parsing

function declarations(body) {
    var out = {};
    var re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
    var m;
    while ((m = re.exec(body))) {
        out[m[1]] = m[2].trim();
    }
    return out;
}

// Returns the declarations of the first rule whose selector equals `selector`.
function ruleBody(css, selector) {
    var stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    var re = /([^{}]+)\{([^{}]*)\}/g;
    var m;
    while ((m = re.exec(stripped))) {
        if (m[1].trim() === selector) {
            return m[2];
        }
    }
    throw new Error('rule not found: ' + selector);
}

var light = declarations(ruleBody(tokensCss, ':root'));
var dark = Object.assign({}, light, declarations(ruleBody(tokensCss, ':root[data-tg-mode="dark"]')));
// Developer variant: terminals keep a dark panel in both modes (components.css)
var DEV_TERMINAL = 'html.mg-v-dev .mg-code.mg-terminal';
var devTerminal = declarations(ruleBody(componentsCss, DEV_TERMINAL));

// ---------------------------------------------------------------- colour maths

function parseColor(value) {
    var hex = /^#([0-9a-f]{6})$/i.exec(value);
    if (hex) {
        return {
            r: parseInt(hex[1].slice(0, 2), 16),
            g: parseInt(hex[1].slice(2, 4), 16),
            b: parseInt(hex[1].slice(4, 6), 16),
            a: 1
        };
    }
    var rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(value);
    if (rgba) {
        return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] };
    }
    throw new Error('not a colour: ' + value);
}

function over(fg, bg) {
    return {
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
        a: 1
    };
}

function luminance(c) {
    function channel(v) {
        var s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

function ratio(fg, bg) {
    var l1 = luminance(fg);
    var l2 = luminance(bg);
    var hi = Math.max(l1, l2);
    var lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
}

// Resolve a token to an opaque colour; translucent tokens are composited on `backdrop`.
function resolve(tokens, name, backdropName) {
    if (tokens[name] === undefined) {
        throw new Error('missing token ' + name);
    }
    var colour = parseColor(tokens[name]);
    if (colour.a < 1) {
        colour = over(colour, resolve(tokens, backdropName || '--tg-bg'));
    }
    return colour;
}

function pairs(tokens) {
    var list = [
        // text on surfaces (4.5:1)
        ['--tg-text', '--tg-bg', 4.5],
        ['--tg-text-2', '--tg-bg', 4.5],
        ['--tg-muted', '--tg-bg', 4.5],
        ['--tg-muted', '--tg-surface', 4.5],
        ['--tg-accent', '--tg-bg', 4.5],
        ['--tg-accent', '--tg-surface', 4.5],
        ['--tg-text', '--tg-surface', 4.5],
        ['--tg-text-2', '--tg-surface', 4.5],
        ['--tg-text-2', '--tg-sidebar', 4.5],
        ['--tg-muted', '--tg-sidebar', 4.5],
        ['--tg-muted', '--tg-surface-2', 4.5],
        ['--tg-accent', '--tg-sidebar', 4.5],
        ['--tg-inline-code-text', '--tg-inline-code-bg', 4.5],
        ['--tg-code-text', '--tg-code-bg', 4.5],
        // line numbers are the reference for highlight="8-10": informational text
        ['--tg-code-num', '--tg-code-bg', 4.5],
        ['--tg-code-num', '--tg-code-line', 4.5, '--tg-code-bg'],
        // terminal prompts (.mg-pr) use --sx-com, also on highlighted lines
        ['--sx-com', '--tg-code-line', 4.5, '--tg-code-bg'],
        // code block header: buttons and language pill
        ['--tg-muted', '--tg-code-head', 4.5],
        ['--tg-accent', '--tg-accent-soft', 4.5, '--tg-code-head'],
        // active nav item / badges: accent on its translucent soft wash
        ['--tg-accent', '--tg-accent-soft', 4.5, '--tg-sidebar'],
        ['--tg-accent', '--tg-accent-soft', 4.5, '--tg-bg'],
        // UI glyph boundaries (3:1)
        ['--tg-border-strong', '--tg-bg', 3],
        ['--tg-focus', '--tg-bg', 3],
        ['--tg-focus', '--tg-surface', 3]
    ];
    Object.keys(tokens).forEach(function (name) {
        if (/^--sx-/.test(name)) {
            list.push([name, '--tg-code-bg', 4.5]);
        }
    });
    ['info', 'tip', 'warn', 'danger'].forEach(function (kind) {
        list.push(['--co-' + kind, '--co-' + kind + '-bg', 4.5, '--tg-bg']);
    });
    return list;
}

// Gradient stops declared inside a linear-gradient(...) token value.
function stops(value) {
    return value.match(/#[0-9a-f]{6}/gi);
}

function check(tokens) {
    pairs(tokens).forEach(function (pair) {
        var name = pair[0] + ' on ' + pair[1] + (pair[3] ? ' (over ' + pair[3] + ')' : '');
        it(name + ' >= ' + pair[2], function () {
            // translucent backgrounds are composited on pair[3] (default page bg)
            var bg = resolve(tokens, pair[1], pair[3]);
            var fg = resolve(tokens, pair[0], pair[1]);
            var r = ratio(fg, bg);
            (r >= pair[2]).should.equal(true, name + ' is ' + r.toFixed(2) + ':1, needs ' + pair[2]);
        });
    });

    it('white on every --tg-grad-strong stop >= 4.5', function () {
        var found = stops(tokens['--tg-grad-strong']);
        found.length.should.equal(3);
        found.forEach(function (hex) {
            var r = ratio(parseColor('#ffffff'), parseColor(hex));
            (r >= 4.5).should.equal(true, '#ffffff on ' + hex + ' is ' + r.toFixed(2) + ':1');
        });
    });
}

// ---------------------------------------------------------------- tests

describe('modern-gradient css', function () {
    describe('contrast: every text token pair meets AA', function () {
        describe('light', function () {
            check(light);
        });
        describe('dark', function () {
            check(dark);
        });
        describe('developer terminal panel', function () {
            var list = [
                ['--tg-code-text', '--tg-code-bg', 4.5],
                ['--tg-code-num', '--tg-code-bg', 4.5],
                ['--tg-code-num', '--tg-code-line', 4.5, '--tg-code-bg'],
                ['--sx-com', '--tg-code-line', 4.5, '--tg-code-bg'],
                ['--sx-out', '--tg-code-line', 4.5, '--tg-code-bg'],
                ['--tg-muted', '--tg-code-head', 4.5],
                ['--tg-accent', '--tg-accent-soft', 4.5, '--tg-code-head'],
                ['--co-tip', '--tg-code-head', 4.5]
            ];
            Object.keys(devTerminal).forEach(function (name) {
                if (/^--sx-/.test(name)) list.push([name, '--tg-code-bg', 4.5]);
            });
            list.forEach(function (pair) {
                var name = pair[0] + ' on ' + pair[1] + (pair[3] ? ' (over ' + pair[3] + ')' : '');
                it(name + ' >= ' + pair[2], function () {
                    var bg = resolve(devTerminal, pair[1], pair[3]);
                    var fg = resolve(devTerminal, pair[0], pair[1]);
                    var r = ratio(fg, bg);
                    (r >= pair[2]).should.equal(true, name + ' is ' + r.toFixed(2) + ':1, needs ' + pair[2]);
                });
            });
        });
    });

    describe('tokens', function () {
        it('keeps the legacy token names', function () {
            ['--tg-accent', '--tg-accent-soft', '--tg-bg', '--tg-sidebar-bg', '--tg-border', '--tg-text',
                '--tg-muted', '--tg-radius', '--tg-font', '--tg-mono'].forEach(function (name) {
                    (light[name] !== undefined).should.equal(true, name + ' is declared');
                });
        });

        it('aliases --tg-sidebar-bg to the sidebar surface', function () {
            light['--tg-sidebar-bg'].should.equal('var(--tg-sidebar)');
        });

        it('declares the three gradients plus the strong one', function () {
            light['--tg-grad'].should.containEql('#6366f1').and.containEql('#8b5cf6').and.containEql('#0ea5e9');
            dark['--tg-grad'].should.containEql('#818cf8').and.containEql('#a78bfa').and.containEql('#38bdf8');
            light['--tg-grad-strong'].should.containEql('#4f46e5').and.containEql('#6d28d9').and.containEql('#0369a1');
            dark['--tg-grad-strong'].should.equal(light['--tg-grad-strong']);
        });

        it('sets the sidebar width per variant', function () {
            light['--tg-sidebar-w'].should.equal('272px');
            declarations(ruleBody(tokensCss, 'html.mg-v-dev'))['--tg-sidebar-w'].should.equal('260px');
        });
    });

    describe('base.css', function () {
        it('has no mg- selectors', function () {
            baseCss.should.not.match(/\.mg-/);
            baseCss.should.not.match(/data-tg-mode/);
        });

        it('draws a focus ring on interactive elements', function () {
            baseCss.should.match(/:focus-visible[^{]*\{[^}]*2px solid var\(--tg-focus\)/);
            baseCss.should.match(/outline-offset:\s*2px/);
        });

        it('honours prefers-reduced-motion', function () {
            baseCss.should.match(/@media \(prefers-reduced-motion: reduce\)/);
        });
    });

    describe('css-only edition', function () {
        var generated = read(path.join(repoDir, 'themes', 'modern-gradient.css'));

        it('is generated and current', function () {
            buildCssOnly(tokensCss, baseCss).should.equal(generated);
        });

        it('maps dark tokens to prefers-color-scheme', function () {
            var out = buildCssOnly(tokensCss, baseCss);
            out.should.containEql('@media (prefers-color-scheme: dark)');
            out.should.not.containEql('data-tg-mode');
        });

        it('resolves the default variant onto :root and uses system fonts only', function () {
            var out = buildCssOnly(tokensCss, baseCss);
            out.should.not.match(/mg-v-/);
            out.should.not.match(/"Inter"|"JetBrains Mono"|@font-face/);
            out.should.containEql('--tg-sidebar-w: 260px');
        });
    });
});
