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

    it('page wraps code blocks in figures', function() {
        var page = { content: '<pre><code class="lang-console">$ ls\n</code></pre>' };
        var out = plugin.hooks.page.call(context({}), page);
        out.should.equal(page);
        out.content.should.startWith('<figure class="mg-code mg-terminal" data-lang="console">');
    });
});
