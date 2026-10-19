'use strict';

require('should');
var blocks = require('../lib/blocks');

// Stand-in for the GitBook block context: renderBlock('markdown', text)
// resolves to recognisable HTML and records its calls
function context() {
    var calls = [];
    return {
        calls: calls,
        book: {
            renderBlock: function(type, text) {
                calls.push([type, text]);
                return Promise.resolve('<p>' + String(text).trim() + '</p>\n');
            }
        }
    };
}

function run(name, block) {
    var ctx = context();
    block.kwargs = block.kwargs || {};
    block.blocks = block.blocks || [];
    var out = blocks.blocks[name].process.call(ctx, block);
    return Promise.resolve(out).then(function(html) {
        // Block-level output is fenced for unwrapBlocks; inspect the inner markup
        return { html: blocks.unwrapBlocks(html), raw: html, calls: ctx.calls };
    });
}

function count(html, needle) {
    return html.split(needle).length - 1;
}

describe('blocks', function() {
    it('registers hint, tabs/tab, stepper/step and path', function() {
        Object.keys(blocks.blocks).sort().should.eql(['hint', 'path', 'stepper', 'tabs']);
        blocks.blocks.tabs.blocks.should.eql(['tab']);
        blocks.blocks.stepper.blocks.should.eql(['step']);
        blocks.blocks.hint.process.should.be.a.Function();
    });

    describe('hint', function() {
        it('renders the body as Markdown inside a callout', function() {
            return run('hint', { kwargs: { style: 'warning', title: 'Careful' }, body: '\nUse **it**.\n' }).then(function(r) {
                r.calls.should.eql([['markdown', '\nUse **it**.\n']]);
                r.html.should.startWith('<div class="mg-callout mg-callout-warning" role="note"><span class="mg-callout-icon"><svg class="mg-i" ');
                r.html.should.endWith('<div class="mg-callout-body"><span class="mg-callout-title">Careful</span><p>Use **it**.</p>\n</div></div>');
            });
        });

        it('maps GitBook styles to callout kinds', function() {
            var map = { info: 'info', success: 'tip', warning: 'warning', danger: 'danger' };
            return Promise.all(Object.keys(map).map(function(style) {
                return run('hint', { kwargs: { style: style }, body: 'x' }).then(function(r) {
                    r.html.should.startWith('<div class="mg-callout mg-callout-' + map[style] + '"');
                });
            }));
        });

        it('falls back to info for a missing or unknown style', function() {
            return Promise.all([
                run('hint', { body: 'x' }),
                run('hint', { kwargs: { style: 'neon' }, body: 'x' }),
                run('hint', { kwargs: { style: 'constructor' }, body: 'x' })
            ]).then(function(results) {
                results.forEach(function(r) {
                    r.html.should.startWith('<div class="mg-callout mg-callout-info"');
                });
            });
        });

        it('escapes the title and leaves it out when not given', function() {
            return Promise.all([
                run('hint', { kwargs: { title: '<b>"x" & y</b>' }, body: 'x' }),
                run('hint', { body: 'x' })
            ]).then(function(results) {
                results[0].html.should.containEql('<span class="mg-callout-title">&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;</span>');
                results[1].html.should.not.containEql('mg-callout-title');
            });
        });
    });

    describe('tabs', function() {
        var TABS = {
            body: '\n',
            blocks: [
                { name: 'tab', kwargs: { title: 'Linux' }, body: 'L' },
                { name: 'tab', kwargs: { title: 'macOS' }, body: 'M' },
                { name: 'tab', kwargs: { title: 'Windows' }, body: 'W' }
            ]
        };

        it('renders one tablist and one panel per tab, the first selected', function() {
            return run('tabs', TABS).then(function(r) {
                var html = r.html;
                html.should.startWith('<div class="mg-tabs" data-sync="Linux|macOS|Windows"><div class="mg-tablist" role="tablist">');
                count(html, 'role="tablist"').should.equal(1);
                count(html, 'class="mg-tab"').should.equal(3);
                count(html, 'class="mg-tabpanel"').should.equal(3);

                html.should.containEql('data-tab="linux" aria-selected="true" tabindex="0"');
                html.should.containEql('data-tab="macos" aria-selected="false" tabindex="-1"');
                html.should.containEql('data-tab="windows" aria-selected="false" tabindex="-1"');
                html.should.containEql('<div class="mg-tabpanel" role="tabpanel" data-panel="linux" data-title="Linux"><p>L</p>');
                html.should.containEql('<div class="mg-tabpanel" role="tabpanel" data-panel="macos" data-title="macOS" hidden><p>M</p>');
                html.should.containEql('data-panel="windows" data-title="Windows" hidden>');
                count(html, ' hidden>').should.equal(2);
                html.should.endWith('</div></div>');
                r.calls.map(function(c) { return c[1]; }).should.eql(['L', 'M', 'W']);
            });
        });

        it('labels each tab with its title (and an icon for known systems)', function() {
            return run('tabs', TABS).then(function(r) {
                r.html.should.match(/<button type="button" class="mg-tab" role="tab" data-tab="macos"[^>]*><svg class="mg-i" [^>]*data-mg-icon="apple"[\s\S]*?<\/svg>macOS<\/button>/);
            });
        });

        it('suffixes duplicate slugs and escapes titles', function() {
            return run('tabs', {
                body: '',
                blocks: [
                    { name: 'tab', kwargs: { title: 'Option A' }, body: '1' },
                    { name: 'tab', kwargs: { title: 'option a' }, body: '2' },
                    { name: 'tab', kwargs: { title: 'Option-A' }, body: '3' },
                    { name: 'tab', kwargs: { title: '<x> & "y"' }, body: '4' },
                    { name: 'tab', kwargs: {}, body: '5' }
                ]
            }).then(function(r) {
                var html = r.html;
                html.should.containEql('data-tab="option-a"');
                html.should.containEql('data-tab="option-a-2"');
                html.should.containEql('data-tab="option-a-3"');
                html.should.containEql('data-tab="x-y"');
                html.should.containEql('>&lt;x&gt; &amp; &quot;y&quot;</button>');
                html.should.containEql('data-sync="Option A|option a|Option-A|&lt;x&gt; &amp; &quot;y&quot;|Tab 5"');
                html.should.containEql('data-tab="tab-5"');
                html.should.not.containEql('<x>');
            });
        });

        it('keeps text written before the first tab', function() {
            return run('tabs', { body: 'Intro', blocks: [{ name: 'tab', kwargs: { title: 'A' }, body: 'a' }] }).then(function(r) {
                r.html.should.startWith('<p>Intro</p>\n<div class="mg-tabs"');
            });
        });
    });

    describe('stepper', function() {
        it('renders an ordered list with one item per step', function() {
            return run('stepper', {
                body: '\n',
                blocks: [
                    { name: 'step', kwargs: {}, body: '### One' },
                    { name: 'step', kwargs: {}, body: '### Two' },
                    { name: 'step', kwargs: {}, body: '### Three' }
                ]
            }).then(function(r) {
                r.html.should.equal('<ol class="mg-steps"><li class="mg-step"><p>### One</p>\n</li>' +
                    '<li class="mg-step"><p>### Two</p>\n</li><li class="mg-step"><p>### Three</p>\n</li></ol>');
            });
        });
    });

    describe('path', function() {
        it('renders an inline path chip with escaped text', function() {
            return run('path', { body: ' intro.md ' }).then(function(r) {
                r.raw.should.match(/^<span class="mg-path"><svg class="mg-i" [^>]*data-mg-icon="file"[\s\S]*<\/svg>intro\.md<\/span>$/);
                r.calls.should.eql([]);
            });
        });

        it('escapes markup and uses a folder icon for directories', function() {
            return Promise.all([
                run('path', { body: '<script>&.md' }),
                run('path', { body: '_book/' })
            ]).then(function(results) {
                results[0].raw.should.endWith('</svg>&lt;script&gt;&amp;.md</span>');
                results[1].raw.should.containEql('data-mg-icon="folder"');
            });
        });
    });
});

describe('unwrapBlocks', function() {
    var unwrapBlocks = blocks.unwrapBlocks;

    it('removes the paragraph Markdown wrapped around a block', function() {
        unwrapBlocks('<p>a</p>\n<p><!--mg-block--><div class="mg-tabs">x</div><!--/mg-block--></p>\n<p>b</p>')
            .should.equal('<p>a</p>\n<div class="mg-tabs">x</div>\n<p>b</p>');
    });

    it('handles nested blocks and blocks Markdown did not wrap', function() {
        unwrapBlocks('<p><!--mg-block--><div>1<p><!--mg-block--><div>2</div><!--/mg-block--></p></div><!--/mg-block--></p>')
            .should.equal('<div>1<div>2</div></div>');
        unwrapBlocks('<!--mg-block--><ol>x</ol><!--/mg-block-->').should.equal('<ol>x</ol>');
    });

    it('keeps the paragraph when the block shares it with text', function() {
        unwrapBlocks('<p>See <!--mg-block--><div>x</div><!--/mg-block--></p>').should.equal('<p>See <div>x</div></p>');
        unwrapBlocks('<p><!--mg-block--><div>x</div><!--/mg-block--> after</p>').should.equal('<p><div>x</div> after</p>');
    });

    it('leaves pages without blocks unchanged', function() {
        var html = '<p>Hello</p>\n<pre><code>&lt;!--mg-block--&gt;</code></pre>';
        unwrapBlocks(html).should.equal(html);
    });
});
