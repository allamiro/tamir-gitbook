'use strict';

require('should');
var callouts = require('../lib/callouts');
var transformAlerts = callouts.transformAlerts;
var transformTaskLists = callouts.transformTaskLists;

// Opening markup of a callout of the given kind
function open(kind) {
    return '<div class="mg-callout mg-callout-' + kind + '" role="note"><span class="mg-callout-icon"><svg class="mg-i" ';
}

function titleOf(html) {
    var m = /<span class="mg-callout-title">([\s\S]*?)<\/span>/.exec(html);
    return m && m[1];
}

describe('transformAlerts', function() {
    it('turns a GitHub alert blockquote into a callout (kramed shape)', function() {
        var out = transformAlerts('<blockquote>\n<p>[!NOTE]\nBody</p>\n</blockquote>\n');
        out.should.startWith(open('info'));
        titleOf(out).should.equal('Note');
        out.should.containEql('<div class="mg-callout-body"><span class="mg-callout-title">Note</span><p>Body</p>');
        out.should.endWith('</div></div>\n');
        out.should.not.containEql('blockquote');
        out.should.not.containEql('[!NOTE]');
    });

    it('maps every alert type to a callout kind and title', function() {
        var cases = {
            NOTE: ['info', 'Note'],
            TIP: ['tip', 'Tip'],
            IMPORTANT: ['info', 'Important'],
            WARNING: ['warning', 'Warning'],
            CAUTION: ['danger', 'Caution']
        };
        Object.keys(cases).forEach(function(type) {
            var out = transformAlerts('<blockquote>\n<p>[!' + type + ']\nBody</p>\n</blockquote>\n');
            out.should.startWith(open(cases[type][0]));
            titleOf(out).should.equal(cases[type][1]);
        });
    });

    it('draws a different icon per kind, with no script needed', function() {
        var info = transformAlerts('<blockquote>\n<p>[!NOTE]\nx</p>\n</blockquote>');
        var tip = transformAlerts('<blockquote>\n<p>[!TIP]\nx</p>\n</blockquote>');
        info.should.match(/<span class="mg-callout-icon"><svg [^>]*aria-hidden="true"/);
        info.should.not.equal(tip.replace('mg-callout-tip', 'mg-callout-info').replace('Tip', 'Note'));
    });

    it('keeps the following paragraphs when the marker stands alone', function() {
        var out = transformAlerts('<blockquote>\n<p>[!WARNING]</p>\n<p>First.</p>\n<p>Second.</p>\n</blockquote>');
        out.should.containEql('<span class="mg-callout-title">Warning</span><p>First.</p>\n<p>Second.</p>');
        out.should.not.containEql('<p></p>');
    });

    it('accepts text on the marker line and any letter case', function() {
        var out = transformAlerts('<blockquote>\n<p>[!tip] Inline text</p>\n</blockquote>');
        out.should.startWith(open('tip'));
        out.should.containEql('<span class="mg-callout-title">Tip</span><p>Inline text</p>');
    });

    it('splits a blockquote kramed merged from several alerts', function() {
        var out = transformAlerts('<blockquote>\n<p>[!NOTE]\nOne</p>\n<p>[!CAUTION]\nTwo</p>\n</blockquote>');
        out.split('class="mg-callout ').length.should.equal(3);
        out.indexOf(open('info')).should.equal(0);
        out.should.containEql(open('danger'));
        out.should.containEql('<p>One</p>');
        out.should.containEql('<p>Two</p>');
    });

    it('leaves a blockquote without a marker unchanged', function() {
        var plain = '<blockquote>\n<p>A plain quote [!NOTE] mid-text.</p>\n</blockquote>\n';
        transformAlerts(plain).should.equal(plain);
        var unknown = '<blockquote>\n<p>[!DANGER]\nx</p>\n</blockquote>\n';
        transformAlerts(unknown).should.equal(unknown);
    });

    it('converts an alert nested in a plain blockquote', function() {
        var out = transformAlerts('<blockquote>\n<p>Outer</p>\n<blockquote>\n<p>[!TIP]\nInner</p>\n</blockquote>\n</blockquote>');
        out.should.startWith('<blockquote>\n<p>Outer</p>\n' + open('tip'));
        out.should.endWith('</div></div>\n</blockquote>');
    });

    it('keeps code blocks in the body for the code transform', function() {
        var out = transformAlerts('<blockquote>\n<p>[!NOTE]\nRun:</p>\n<pre><code class="lang-bash">ls\n</code></pre>\n</blockquote>');
        out.should.containEql('<p>Run:</p>\n<pre><code class="lang-bash">ls\n</code></pre>');
    });
});

describe('transformTaskLists', function() {
    var TIGHT = '<ul>\n<li>[ ] Do x</li>\n<li>[x] Done <code>y</code></li>\n</ul>\n';

    it('turns a task list into a checklist (tight kramed shape)', function() {
        transformTaskLists(TIGHT).should.equal(
            '<ul class="mg-checklist">\n' +
            '<li><label><input type="checkbox" disabled><span>Do x</span></label></li>\n' +
            '<li><label><input type="checkbox" disabled checked><span>Done <code>y</code></span></label></li>\n' +
            '</ul>\n');
    });

    it('accepts loose items and an upper-case X', function() {
        var out = transformTaskLists('<ul>\n<li><p>[X] One</p>\n</li>\n<li><p>[ ] Two</p>\n</li>\n</ul>');
        out.should.equal('<ul class="mg-checklist">\n' +
            '<li><label><input type="checkbox" disabled checked><span>One</span></label></li>\n' +
            '<li><label><input type="checkbox" disabled><span>Two</span></label></li>\n' +
            '</ul>');
    });

    it('converts only when every item is a task', function() {
        var mixed = '<ul>\n<li>[ ] Task</li>\n<li>normal</li>\n</ul>\n';
        transformTaskLists(mixed).should.equal(mixed);
        var looseMixed = '<ul>\n<li><p>[ ] Task</p>\n</li>\n<li><p>normal</p>\n</li>\n</ul>\n';
        transformTaskLists(looseMixed).should.equal(looseMixed);
    });

    it('leaves items with more than one paragraph and plain lists alone', function() {
        var multi = '<ul>\n<li><p>[ ] Task</p>\n<p>More</p>\n</li>\n</ul>\n';
        transformTaskLists(multi).should.equal(multi);
        var plain = '<ul>\n<li>first</li>\n<li>second [ ] not a box</li>\n</ul>\n';
        transformTaskLists(plain).should.equal(plain);
        var noSpace = '<ul>\n<li>[x]y</li>\n</ul>\n';
        transformTaskLists(noSpace).should.equal(noSpace);
    });

    it('converts an inner task list and leaves the outer list alone', function() {
        var html = '<ul>\n<li>Parent<ul>\n<li>[ ] Child</li>\n</ul>\n</li>\n</ul>\n';
        var out = transformTaskLists(html);
        out.should.startWith('<ul>\n<li>Parent<ul class="mg-checklist">\n');
        out.should.containEql('<span>Child</span>');
    });

    it('does not touch ordered lists or escaped markup in code', function() {
        var ol = '<ol>\n<li>[ ] One</li>\n</ol>\n';
        transformTaskLists(ol).should.equal(ol);
        var code = '<pre><code>&lt;ul&gt;\n&lt;li&gt;[ ] x&lt;/li&gt;\n&lt;/ul&gt;\n</code></pre>';
        transformTaskLists(code).should.equal(code);
    });

    it('converts every task list on the page', function() {
        var out = transformTaskLists(TIGHT + '<p>Between</p>\n' + TIGHT);
        out.split('<ul class="mg-checklist">').length.should.equal(3);
    });
});
