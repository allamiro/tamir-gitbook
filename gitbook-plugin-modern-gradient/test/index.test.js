'use strict';

require('should');
var plugin = require('../index.js');

// Minimal stand-in for the GitBook 3 hook context (this.config, this.log)
function context(values) {
    var warnings = [];
    var ctx = {
        values: values,
        warnings: warnings,
        config: {
            get: function(key, def) {
                var cur = values;
                var parts = key.split('.');
                for (var i = 0; i < parts.length; i++) {
                    if (cur == null || typeof cur !== 'object' || !(parts[i] in cur)) return def;
                    cur = cur[parts[i]];
                }
                return cur;
            },
            set: function(key, value) {
                var parts = key.split('.');
                var cur = values;
                for (var i = 0; i < parts.length - 1; i++) {
                    cur[parts[i]] = cur[parts[i]] || {};
                    cur = cur[parts[i]];
                }
                cur[parts[parts.length - 1]] = value;
            }
        },
        log: { warn: { ln: function(msg) { warnings.push(msg); } } }
    };
    return ctx;
}

describe('plugin manifest', function() {
    it('ships tokens, base and component styles and the core scripts', function() {
        plugin.book.assets.should.equal('./assets');
        plugin.book.css.should.eql(['css/tokens.css', 'css/base.css', 'css/components.css']);
        plugin.book.js.slice(0, 2).should.eql(['js/mg-icons.js', 'js/mg-core.js']);
    });
});

describe('init hook', function() {
    var DEFAULTS = { 'styles': { website: 'styles/website.css' } };

    function run(values) {
        var ctx = context(values);
        plugin.hooks.init.call(ctx);
        return ctx;
    }

    it('is quiet for a default book and normalises the options', function() {
        var ctx = run({ styles: DEFAULTS.styles, plugins: ['modern-gradient'], pluginsConfig: {} });
        ctx.warnings.should.eql([]);
        ctx.values.pluginsConfig['modern-gradient'].should.eql({
            variant: 'premium-developer',
            variantClasses: 'mg-v-premium mg-v-dev',
            editUrl: ''
        });
    });

    it('warns about an unknown variant and uses the default', function() {
        var ctx = run({ plugins: ['modern-gradient'], pluginsConfig: { 'modern-gradient': { variant: 'neon' } } });
        ctx.warnings.length.should.equal(1);
        ctx.warnings[0].should.containEql('neon');
        ctx.values.pluginsConfig['modern-gradient'].variantClasses.should.equal('mg-v-premium mg-v-dev');
    });

    it('warns when another theme stylesheet is selected', function() {
        var ctx = run({ styles: { website: 'themes/modern.css' }, plugins: ['modern-gradient'] });
        ctx.warnings.length.should.equal(1);
        ctx.warnings[0].should.containEql('styles.website');
    });

    it('warns when expandable-chapters is listed (any spelling)', function() {
        run({ plugins: ['expandable-chapters', 'modern-gradient'] }).warnings.length.should.equal(1);
        run({ plugins: ['expandable-chapters@0.2.0'] }).warnings.length.should.equal(1);
        run({ plugins: 'search,expandable-chapters' }).warnings.length.should.equal(1);
        run({ plugins: ['-expandable-chapters'] }).warnings.length.should.equal(0);
    });

    it('warns about and drops a non-http edit URL', function() {
        var ctx = run({ pluginsConfig: { 'modern-gradient': { editUrl: 'javascript:alert(1)' } } });
        ctx.warnings.length.should.equal(1);
        ctx.values.pluginsConfig['modern-gradient'].editUrl.should.equal('');
    });
});

describe('page hooks', function() {
    it('ships the code block script after the core script', function() {
        var js = plugin.book.js;
        js.indexOf('js/mg-code.js').should.be.above(js.indexOf('js/mg-core.js'));
    });

    it('page:before turns {% code %} options into markers', function() {
        var page = { content: '{% code title="a.json" %}\n```json\n{}\n```\n{% endcode %}\n' };
        var out = plugin.hooks['page:before'].call(context({}), page);
        out.should.equal(page);
        out.content.should.startWith('<div class="mg-code-opts" data-title="a.json"></div>');
        out.content.should.not.containEql('endcode');
    });

    it('page:before protects and page restores template tags in fences', function() {
        var page = { content: '```js\n"{% endraw %}"\n```\n' };
        var before = plugin.hooks['page:before'].call(context({}), page).content;
        before.should.not.containEql('{% endraw %}');
        var html = { content: '<pre><code class="lang-js">' + before.split('\n')[1] + '\n</code></pre>' };
        plugin.hooks.page.call(context({}), html).content.should.containEql('"{% endraw %}"');
    });

    it('ships the content script after the code script', function() {
        var js = plugin.book.js;
        js.indexOf('js/mg-content.js').should.be.above(js.indexOf('js/mg-code.js'));
    });

    it('registers the content blocks', function() {
        Object.keys(plugin.blocks).sort().should.eql(['hint', 'path', 'stepper', 'tabs']);
    });

    it('page turns alerts and task lists into components, then wraps code', function() {
        var page = {
            content: '<p><!--mg-block--><div class="mg-tabs">t</div><!--/mg-block--></p>\n' +
                '<blockquote>\n<p>[!TIP]\nRun:</p>\n<pre><code class="lang-bash">ls\n</code></pre>\n</blockquote>\n' +
                '<ul>\n<li>[ ] One</li>\n</ul>\n'
        };
        var out = plugin.hooks.page.call(context({}), page).content;
        out.should.containEql('</nav><div class="mg-meta">');
        out = out.slice(out.indexOf('<div class="mg-tabs">'));
        out.should.startWith('<div class="mg-tabs">t</div>\n<div class="mg-callout mg-callout-tip"');
        out.should.containEql('<p>Run:</p>\n<figure class="mg-code" data-lang="bash">');
        out.should.containEql('<ul class="mg-checklist">');
        out.should.not.containEql('mg-block');
    });

    it('page wraps code blocks in figures', function() {
        var page = { layout: 'home', content: '<pre><code class="lang-console">$ ls\n</code></pre>' };
        var out = plugin.hooks.page.call(context({}), page);
        out.should.equal(page);
        out.content.should.startWith('<figure class="mg-code mg-terminal" data-lang="console">');
    });

    describe('article chrome', function() {
        var ARTICLES = [
            { title: 'Introduction', level: '1.1', path: 'README.md' },
            { title: 'Guides', level: '1.2', path: 'guides/README.md' },
            { title: 'Long page', level: '1.2.1', path: 'guides/long-page.md' },
            { title: 'Dupes', level: '1.2.2', path: 'guides/dupes.md' }
        ];

        // this.summary and this.output as GitBook 3 hands them to hooks
        function bookContext() {
            var ctx = context({});
            ctx.summary = {
                walk: function(fn) { ARTICLES.forEach(function(a) { fn(a); }); }
            };
            return ctx;
        }

        function run(page) {
            return plugin.hooks.page.call(bookContext(), page).content;
        }

        // GitBook's resolveLinks modifier (after the hook) turns these .md
        // links into .html / directory URLs, as for links in the Markdown
        it('adds breadcrumbs, meta and a pager with .md links relative to the page', function() {
            var html = run({
                path: 'guides/long-page.md',
                title: 'Long page',
                difficulty: 'intermediate',
                content: '<h1>Long page</h1>\n<p>Text</p>\n',
                previous: { title: 'Guides', path: 'guides/README.md' },
                next: { title: 'Dupes', path: 'guides/dupes.md' }
            });
            html.should.startWith('<nav class="mg-crumbs');
            html.should.containEql('<a href="../README.md">Home</a>');
            html.should.containEql('<a href="README.md">Guides</a>');
            html.should.containEql('<span aria-current="page">Long page</span>');
            html.should.containEql('<h1>Long page</h1>\n<div class="mg-meta">');
            html.should.containEql('mg-chip-level-intermediate');
            html.should.containEql('<a class="mg-prev" href="README.md">');
            html.should.containEql('<a class="mg-next" href="dupes.md">');
            html.indexOf('<p>Text</p>').should.be.below(html.indexOf('mg-pager'));
        });

        it('handles a page outside SUMMARY without errors', function() {
            var html = run({ path: 'GLOSSARY.md', content: '<h1>Glossary</h1>' });
            html.should.containEql('<a href="README.md">Home</a>');
            html.should.not.containEql('mg-pager');
            html.should.not.containEql('aria-current');
        });

        it('leaves the home layout alone', function() {
            var html = run({ path: 'README.md', layout: 'home', content: '<p>Hi</p>', next: ARTICLES[1] });
            html.should.equal('<p>Hi</p>');
        });

        it('copes with a hook context that has no summary', function() {
            var html = plugin.hooks.page.call(context({}), { path: 'a/b.md', content: '<p>x</p>', next: { title: 'C', path: 'a/c.md' } }).content;
            html.should.containEql('<a class="mg-next" href="c.md">');
        });
    });
});

describe('search index hooks', function() {
    function buildCtx(outputName, written) {
        var ctx = context({ styles: { website: 'styles/website.css' }, plugins: ['modern-gradient'], pluginsConfig: {} });
        ctx.output = {
            name: outputName,
            writeFile: function(name, content) { written[name] = content; return Promise.resolve(); }
        };
        ctx.summary = { walk: function() {} };
        return ctx;
    }

    it('collects every website page and writes modern-gradient/search.json on finish', function() {
        var written = {};
        var ctx = buildCtx('website', written);
        plugin.hooks.init.call(ctx);
        plugin.hooks.page.call(ctx, { title: 'Intro', path: 'README.md', content: '<h1>Intro</h1><p>Hi</p><h2>Part one</h2>' });
        plugin.hooks.page.call(ctx, { title: 'Guide', path: 'guide/setup.md', content: '<h1>Guide</h1>' });
        return Promise.resolve(plugin.hooks.finish.call(ctx)).then(function() {
            var entries = JSON.parse(written['modern-gradient/search.json']);
            entries.map(function(e) { return e.c + ':' + e.u; }).should.eql([
                'page:index.html', 'section:index.html#part-one', 'page:guide/setup.html']);
        });
    });

    it('starts a fresh index on every build (init) and skips ebook output', function() {
        var written = {};
        var ctx = buildCtx('website', written);
        plugin.hooks.init.call(ctx);
        plugin.hooks.page.call(ctx, { title: 'Old', path: 'old.md', content: '<h1>Old</h1>' });
        plugin.hooks.init.call(ctx);
        plugin.hooks.page.call(ctx, { title: 'New', path: 'new.md', content: '<h1>New</h1>' });
        ctx.output.name = 'ebook';
        plugin.hooks.page.call(ctx, { title: 'Book', path: 'book.md', content: '<h1>Book</h1>' });
        ctx.output.name = 'website';
        return Promise.resolve(plugin.hooks.finish.call(ctx)).then(function() {
            JSON.parse(written['modern-gradient/search.json']).map(function(e) { return e.u; }).should.eql(['new.html']);
        });
    });
});
