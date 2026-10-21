'use strict';

require('should');
var chrome = require('../lib/chrome');

function words(n, word) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(word || 'word');
    return out.join(' ');
}

function count(html, re) {
    return (html.match(re) || []).length;
}

// Summary articles as this.summary.walk() yields them (encodeSummaryArticle)
var ARTICLES = [
    { title: 'Introduction', level: '1.1', depth: 1, path: 'README.md' },
    { title: 'Chapter 1', level: '1.2', depth: 1, path: 'chapter-1/README.md' },
    { title: 'Getting started', level: '1.2.1', depth: 2, path: 'chapter-1/getting-started.md' },
    { title: 'Chapter 2', level: '1.3', depth: 1, path: 'chapter-2/README.md' },
    { title: 'Configuration', level: '1.3.1', depth: 2, path: 'chapter-2/configuration.md' },
    { title: 'Plugins <&>', level: '1.3.1.1', depth: 3, path: 'chapter-2/plugins.md' },
    { title: 'Reference', level: '1.4', depth: 1 },
    { title: 'API', level: '1.4.1', depth: 2, path: 'reference/api.md' }
];

function url(p) {
    return 'u:' + p;
}

describe('readingTime', function() {
    it('is max(1, round(words / 200)) minutes', function() {
        chrome.readingTime(words(400)).should.equal(2);
        chrome.readingTime(words(10)).should.equal(1);
        chrome.readingTime(words(500)).should.equal(3);
        chrome.readingTime('').should.equal(1);
        chrome.readingTime(null).should.equal(1);
    });

    it('leaves out fenced code in Markdown', function() {
        var md = words(10) + '\n\n```bash\n' + words(1000, 'echo') + '\n```\n\n~~~\n' + words(500) + '\n~~~\n';
        chrome.readingTime(md).should.equal(1);
    });

    it('leaves out tags, code blocks and code figures in HTML', function() {
        var html = '<p class="lede">' + words(400) + '</p>' +
            '<pre><code class="lang-bash">' + words(1000) + '</code></pre>' +
            '<figure class="mg-code" data-lang="json"><div class="mg-code-head">x</div><pre><code>' +
            words(1000) + '</code></pre></figure>';
        chrome.readingTime(html).should.equal(2);
    });

    it('does not count lone punctuation as words', function() {
        chrome.readingTime(words(300) + ' ' + words(300, '—')).should.equal(2);
    });
});

describe('breadcrumbTrail', function() {
    it('walks up the SUMMARY levels: Home > Chapter 2 > Configuration', function() {
        var trail = chrome.breadcrumbTrail(ARTICLES, 'chapter-2/configuration.md', url);
        trail.map(function(c) { return c.title; }).should.eql(['Home', 'Chapter 2', 'Configuration']);
        trail[0].url.should.equal('u:README.md');
        trail[1].url.should.equal('u:chapter-2/README.md');
        trail[2].url.should.equal('u:chapter-2/configuration.md');
        trail[2].current.should.equal(true);
        (trail[0].current === true).should.equal(false);
    });

    it('keeps every ancestor of a deep page', function() {
        chrome.breadcrumbTrail(ARTICLES, 'chapter-2/plugins.md', url).map(function(c) { return c.title; })
            .should.eql(['Home', 'Chapter 2', 'Configuration', 'Plugins <&>']);
    });

    it('keeps a parent that has no page, without a link', function() {
        var trail = chrome.breadcrumbTrail(ARTICLES, 'reference/api.md', url);
        trail.map(function(c) { return c.title; }).should.eql(['Home', 'Reference', 'API']);
        (trail[1].url === null).should.equal(true);
    });

    it('is Home alone, as the current page, for the readme', function() {
        var trail = chrome.breadcrumbTrail(ARTICLES, 'README.md', url);
        trail.length.should.equal(1);
        trail[0].title.should.equal('Home');
        trail[0].current.should.equal(true);
    });

    it('is [Home] for a page that is not in SUMMARY, and never throws', function() {
        var trail = chrome.breadcrumbTrail(ARTICLES, 'GLOSSARY.md', url);
        trail.length.should.equal(1);
        trail[0].title.should.equal('Home');
        (trail[0].current === true).should.equal(false);
        chrome.breadcrumbTrail([], 'x.md', url).length.should.equal(1);
        chrome.breadcrumbTrail(null, undefined).length.should.equal(1);
    });

    it('normalises ./ prefixes and defaults the url to the path', function() {
        var trail = chrome.breadcrumbTrail(ARTICLES, './chapter-1/getting-started.md');
        trail.map(function(c) { return c.title; }).should.eql(['Home', 'Chapter 1', 'Getting started']);
        trail[1].url.should.equal('chapter-1/README.md');
    });
});

describe('renderArticleHead', function() {
    var trail = chrome.breadcrumbTrail(ARTICLES, 'chapter-2/configuration.md', url);

    it('renders breadcrumbs, the eyebrow and the reading time chip', function() {
        var html = chrome.renderArticleHead({ title: 'Configuration', content: words(400) }, trail, {});
        html.should.startWith('<nav class="mg-crumbs no-glossary" aria-label="Breadcrumb">');
        html.should.containEql('<a href="u:README.md">Home</a>');
        html.should.containEql('<a href="u:chapter-2/README.md">Chapter 2</a>');
        html.should.containEql('<span aria-current="page">Configuration</span>');
        html.should.containEql('<div class="mg-eyebrow no-glossary">Chapter 2</div>');
        html.should.containEql('<span class="mg-chip mg-chip-time">');
        html.should.containEql('2 min read</span>');
        html.indexOf('mg-crumbs').should.be.below(html.indexOf('mg-meta'));
    });

    it('joins parent titles with a middle dot in the eyebrow and escapes them', function() {
        var deep = chrome.breadcrumbTrail(ARTICLES, 'chapter-2/plugins.md', url);
        var html = chrome.renderArticleHead({ title: 'Plugins', content: 'x' }, deep, {});
        html.should.containEql('<div class="mg-eyebrow no-glossary">Chapter 2 · Configuration</div>');
        html.should.containEql('<span aria-current="page">Plugins &lt;&amp;&gt;</span>');
        html.should.not.containEql('<&>');
    });

    it('has no eyebrow for a top-level page', function() {
        var top = chrome.breadcrumbTrail(ARTICLES, 'chapter-1/README.md', url);
        chrome.renderArticleHead({ title: 'Chapter 1', content: 'x' }, top, {}).should.not.containEql('mg-eyebrow');
    });

    it('shows a difficulty chip for a known level', function() {
        var html = chrome.renderArticleHead({ content: 'x', difficulty: 'advanced' }, trail, {});
        html.should.containEql('<span class="mg-chip mg-chip-level-advanced">');
        html.should.match(/mg-chip-level-advanced">[^]*?Advanced<\/span>/);
        chrome.renderArticleHead({ content: 'x', difficulty: 'Beginner' }, trail, {})
            .should.containEql('mg-chip-level-beginner');
    });

    it('ignores an unknown difficulty', function() {
        var html = chrome.renderArticleHead({ content: 'x', difficulty: '<b>expert</b>' }, trail, {});
        html.should.not.containEql('mg-chip-level');
        html.should.not.containEql('expert');
    });

    it('hides the reading time with readingTime: false', function() {
        var html = chrome.renderArticleHead({ content: words(400), readingTime: false }, trail, {});
        html.should.not.containEql('mg-chip-time');
        // no chips at all: no empty meta row
        html.should.not.containEql('mg-meta');
        chrome.renderArticleHead({ content: 'x', readingTime: 'false' }, trail, {}).should.not.containEql('mg-chip-time');
    });

    it('takes the reading time from options when given', function() {
        chrome.renderArticleHead({ content: 'x' }, trail, { minutes: 7 }).should.containEql('7 min read');
    });

    it('lists prerequisites, escaped', function() {
        var html = chrome.renderArticleHead({ content: 'x', prerequisites: ['Docker 24+', '<b>Git</b>'] }, trail, {});
        html.should.containEql('<div class="mg-prereq">');
        count(html.slice(html.indexOf('mg-prereq')), /<li>/g).should.equal(2);
        html.should.containEql('<li>Docker 24+</li>');
        html.should.containEql('<li>&lt;b&gt;Git&lt;/b&gt;</li>');
        html.indexOf('mg-meta').should.be.below(html.indexOf('mg-prereq'));
    });

    it('accepts a single prerequisite string and skips empty lists', function() {
        var one = chrome.renderArticleHead({ content: 'x', prerequisites: 'Git' }, trail, {});
        count(one.slice(one.indexOf('mg-prereq')), /<li>/g).should.equal(1);
        chrome.renderArticleHead({ content: 'x', prerequisites: [] }, trail, {}).should.not.containEql('mg-prereq');
        chrome.renderArticleHead({ content: 'x', prerequisites: ['', null] }, trail, {}).should.not.containEql('mg-prereq');
    });

    it('renders Home as plain text on a page outside SUMMARY', function() {
        var orphan = chrome.breadcrumbTrail(ARTICLES, 'GLOSSARY.md', url);
        var html = chrome.renderArticleHead({ content: 'x' }, orphan, {});
        html.should.containEql('<a href="u:README.md">Home</a>');
        html.should.not.containEql('aria-current');
        html.should.not.containEql('mg-eyebrow');
    });

    it('works without front matter or a trail', function() {
        chrome.renderArticleHead({}, [], {}).should.not.containEql('mg-crumbs');
        chrome.renderArticleHead({}).should.containEql('mg-chip-time');
    });
});

describe('insertArticleHead', function() {
    var trail = chrome.breadcrumbTrail(ARTICLES, 'chapter-2/configuration.md', url);

    it('puts the breadcrumbs above a leading h1 and the meta below it', function() {
        var page = { title: 'Configuration', content: '', difficulty: 'beginner' };
        var html = chrome.insertArticleHead('\n<h1>Configure</h1>\n<p>Body</p>', page, trail, {});
        html.should.startWith('<nav class="mg-crumbs');
        var h1 = html.indexOf('<h1>Configure</h1>');
        html.indexOf('mg-eyebrow').should.be.below(h1);
        html.indexOf('<div class="mg-meta">').should.be.above(h1);
        html.should.endWith('<p>Body</p>');
    });

    it('prepends the whole head when the page does not start with an h1', function() {
        var head = chrome.renderArticleHead({ content: '<p>Body</p>' }, trail, {});
        chrome.insertArticleHead('<p>Body</p>', { content: '<p>Body</p>' }, trail, {}).should.equal(head + '<p>Body</p>');
    });
});

describe('renderPager', function() {
    var prev = { title: 'Getting <started>', level: '1.2', path: 'getting-started.md' };
    var next = { title: 'Code & blocks', level: '1.4', path: 'code.md', anchor: '#top' };

    it('links both neighbours with escaped titles', function() {
        var html = chrome.renderPager({ previous: prev, next: next }, url);
        html.should.startWith('<nav class="mg-pager no-glossary" aria-label="Previous and next pages">');
        html.should.containEql('<a class="mg-prev" href="u:getting-started.md">');
        html.should.containEql('<a class="mg-next" href="u:code.md#top">');
        html.should.containEql('Getting &lt;started&gt;');
        html.should.containEql('Code &amp; blocks');
        html.indexOf('mg-prev').should.be.below(html.indexOf('mg-next'));
    });

    it('has only a next card on the first page', function() {
        var html = chrome.renderPager({ next: next }, url);
        html.should.containEql('mg-next');
        html.should.not.containEql('mg-prev');
    });

    it('has only a previous card on the last page', function() {
        var html = chrome.renderPager({ previous: prev }, url);
        html.should.containEql('mg-prev');
        html.should.not.containEql('mg-next');
    });

    it('is empty with neither, or with neighbours that have no page', function() {
        chrome.renderPager({}, url).should.equal('');
        chrome.renderPager({ previous: { title: 'Part' }, next: null }, url).should.equal('');
    });

    it('defaults the url to the raw path', function() {
        chrome.renderPager({ next: next }).should.containEql('href="code.md#top"');
    });
});

describe('relativeURL', function() {
    it('turns a root-relative output URL into one relative to the page', function() {
        chrome.relativeURL('getting-started.md', 'code.html').should.equal('code.html');
        chrome.relativeURL('getting-started.md', './').should.equal('./');
        chrome.relativeURL('guides/long-page.md', './').should.equal('../');
        chrome.relativeURL('guides/long-page.md', 'code.html').should.equal('../code.html');
        chrome.relativeURL('guides/long-page.md', 'guides/').should.equal('./');
        chrome.relativeURL('guides/long-page.md', 'guides/dupes.html').should.equal('dupes.html');
        chrome.relativeURL('README.md', 'guides/').should.equal('guides/');
        chrome.relativeURL('a/b/c.md', 'a/d/e.html').should.equal('../d/e.html');
    });
});
