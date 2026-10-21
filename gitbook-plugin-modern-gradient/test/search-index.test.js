'use strict';

require('should');
var searchIndex = require('../lib/search-index');

var TERMINAL = '<figure class="mg-code mg-terminal" data-lang="bash"><pre><code>' +
    '<span class="mg-ln mg-cmd"><span class="mg-pr" aria-hidden="true">$ </span>' +
    '<code class="lang-bash">docker compose up -d &amp;&amp; echo &lt;ok&gt;</code>\n</span>' +
    '<span class="mg-ln mg-out">done\n</span></code></pre></figure>';

var PAGE_HTML = '<h1>Getting started</h1><p>Install the <strong>wiki</strong> fast.</p>' +
    '<h2>Install Docker</h2><p>text</p>' + TERMINAL +
    '<h2 id="custom-id">Run it <em>now</em> !!</h2><p>more</p>';

describe('search index', function() {
    describe('slug', function() {
        it('matches GitBook 3 heading ids (github-slugid)', function() {
            searchIndex.slug('Hello World').should.equal('hello-world');
            searchIndex.slug('Cool !!').should.equal('cool-');
            searchIndex.slug('UC-05 · Scheduled task (4698)').should.equal('uc-05-·-scheduled-task-4698');
            searchIndex.slug('snake_case & more').should.equal('snakecase--more');
            searchIndex.slug(' Leading space').should.equal('leading-space');
        });
    });

    describe('collector', function() {
        var entries;
        beforeEach(function() {
            var c = searchIndex.createCollector();
            c.add({ title: 'Getting started' }, PAGE_HTML, 'chapter-1/getting-started.html');
            entries = JSON.parse(c.toJSON());
        });

        it('yields one page, two sections and one command', function() {
            entries.filter(function(e) { return e.c === 'page'; }).length.should.equal(1);
            entries.filter(function(e) { return e.c === 'section'; }).length.should.equal(2);
            entries.filter(function(e) { return e.c === 'command'; }).length.should.equal(1);
        });

        it('links pages, sections and commands to the right URL and anchor', function() {
            var page = entries.filter(function(e) { return e.c === 'page'; })[0];
            page.u.should.equal('chapter-1/getting-started.html');
            page.t.should.equal('Getting started');
            var sections = entries.filter(function(e) { return e.c === 'section'; });
            sections[0].u.should.equal('chapter-1/getting-started.html#install-docker');
            sections[0].t.should.equal('Install Docker');
            sections[0].s.should.equal('Getting started');
            sections[1].u.should.equal('chapter-1/getting-started.html#custom-id');
            var cmd = entries.filter(function(e) { return e.c === 'command'; })[0];
            cmd.t.should.equal('docker compose up -d && echo <ok>');
            cmd.u.should.equal('chapter-1/getting-started.html#install-docker');
        });

        it('keeps no HTML in titles or snippets (commands keep their literal text)', function() {
            entries.filter(function(e) { return e.c !== 'command'; }).forEach(function(e) {
                e.t.should.not.match(/<\/?[a-z][^>]*>/i);
                e.s.should.not.match(/<\/?[a-z][^>]*>/i);
            });
            entries.filter(function(e) { return e.c === 'section'; })[1].t.should.equal('Run it now !!');
        });

        it('uses the first paragraph as the page snippet', function() {
            entries[0].s.should.equal('Install the wiki fast.');
        });
    });

    it('keeps a repeated command once per page, but on every page that has it', function() {
        var c = searchIndex.createCollector();
        c.add({ title: 'A' }, '<h1>A</h1>' + TERMINAL + TERMINAL, 'a.html');
        c.add({ title: 'B' }, '<h1>B</h1>' + TERMINAL, 'b.html');
        var cmds = JSON.parse(c.toJSON()).filter(function(e) { return e.c === 'command'; });
        cmds.map(function(e) { return e.u; }).should.eql(['a.html', 'b.html']);
    });

    it('maps page paths to output URLs', function() {
        searchIndex.pageUrl('README.md').should.equal('index.html');
        searchIndex.pageUrl('chapter-1/README.md').should.equal('chapter-1/index.html');
        searchIndex.pageUrl('chapter-1/getting-started.md').should.equal('chapter-1/getting-started.html');
    });
});

describe('search index snippets', function() {
    it('skips callouts and quotes when picking the page snippet', function() {
        var c = searchIndex.createCollector();
        c.add({ title: 'UC' }, '<h1>UC</h1><div class="mg-callout mg-callout-note" role="note"><div class="mg-callout-body">' +
            '<div><p>Severity high</p></div></div></div><blockquote><p>quoted</p></blockquote>' +
            '<h2>What it detects</h2><p>Scheduled tasks are the most common persistence.</p>', 'uc.html');
        JSON.parse(c.toJSON())[0].s.should.equal('Scheduled tasks are the most common persistence.');
    });
});
