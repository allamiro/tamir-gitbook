'use strict';

require('should');
var code = require('../lib/code');
var preprocessCodeOptions = code.preprocessCodeOptions;
var transformCodeBlocks = code.transformCodeBlocks;
var protectTemplateTags = code.protectTemplateTags;
var restoreTemplateTags = code.restoreTemplateTags;

// kramed's output for a fenced block: escaped text, trailing newline
function kramed(lang, text) {
    var body = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    return (lang ? '<pre><code class="lang-' + lang + '">' : '<pre><code>') + body + '\n</code></pre>\n';
}

// Inner HTML of the first <pre> in `html`
function preOf(html) {
    var m = /<pre>([\s\S]*?)<\/pre>/.exec(html);
    if (!m) throw new Error('no <pre> in ' + html);
    return m[1];
}

describe('preprocessCodeOptions', function() {
    var FENCE = '```json\n{\n  "a": 1\n}\n```';

    it('turns {% code %} options into a marker and keeps the fence unchanged', function() {
        var md = 'Intro\n\n{% code title="book.json" lineNumbers="true" overflow="wrap" highlight="8-10" %}\n' +
            FENCE + '\n{% endcode %}\n\nAfter\n';
        var out = preprocessCodeOptions(md);
        out.should.containEql('<div class="mg-code-opts" data-title="book.json" data-line-numbers="true" ' +
            'data-wrap="true" data-highlight="8-10"></div>\n\n' + FENCE + '\n');
        out.should.not.containEql('{% code');
        out.should.not.containEql('endcode');
        out.should.startWith('Intro\n\n');
        out.should.containEql('\n\nAfter\n');
    });

    it('drops unknown attributes and options that are not switched on', function() {
        var out = preprocessCodeOptions('{% code title="x" foo="bar" lineNumbers="false" overflow="scroll" %}\n' +
            FENCE + '\n{% endcode %}\n');
        out.should.startWith('<div class="mg-code-opts" data-title="x"></div>\n\n');
        out.should.not.containEql('foo');
        out.should.not.containEql('bar');
        out.should.not.containEql('data-line-numbers');
        out.should.not.containEql('data-wrap');
    });

    it('escapes attribute values', function() {
        var out = preprocessCodeOptions('{% code title="<x>" highlight="1&2" %}\n' + FENCE + '\n{% endcode %}\n');
        out.should.containEql('data-title="&lt;x&gt;"');
        out.should.containEql('data-highlight="1&amp;2"');
        out.should.not.containEql('<x>');
    });

    it('accepts single quotes, extra spaces and indentation', function() {
        var out = preprocessCodeOptions("  {%   code title='a b'   lineNumbers=\"true\" -%}\n" + FENCE + '\n  {%- endcode %}\n');
        out.should.containEql('<div class="mg-code-opts" data-title="a b" data-line-numbers="true"></div>');
        out.should.not.containEql('endcode');
    });

    it('leaves {% code %} written inside a fenced block alone', function() {
        var md = '````markdown\n{% code title="x" %}\n```js\n1\n```\n{% endcode %}\n````\n';
        preprocessCodeOptions(md).should.equal(md);
    });

    it('does not touch {% raw %} or entities in code', function() {
        var md = '{% code title="t" %}\n```console\n$ echo "{% raw %}" &amp; done\n```\n{% endcode %}\n';
        preprocessCodeOptions(md).should.containEql('```console\n$ echo "{% raw %}" &amp; done\n```\n');
    });

    it('ignores other tags that start with "code"', function() {
        var md = '{% codegroup %}\n{% code-tabs title="x" %}\n';
        preprocessCodeOptions(md).should.equal(md);
    });

    it('returns markdown without code options unchanged', function() {
        var md = '# Title\n\n```js\nvar a = "{% code %}";\n```\n\nText with {% raw %}{% code %}{% endraw %} inline.\n';
        preprocessCodeOptions(md).should.equal(md);
    });
});

describe('transformCodeBlocks', function() {
    it('wraps a fenced block in a figure with a language label', function() {
        var out = transformCodeBlocks('<pre><code class="lang-json">{}</code></pre>');
        out.should.equal('<figure class="mg-code" data-lang="json"><div class="mg-code-head">' +
            '<span class="mg-lang">JSON</span></div>' +
            '<pre><code class="lang-json">{}</code></pre></figure>');
    });

    it('merges a preceding options marker into the figure and removes it', function() {
        var html = '<p>Intro</p>\n<div class="mg-code-opts" data-title="book.json" data-line-numbers="true" ' +
            'data-wrap="true" data-highlight="8-10"></div>\n' + kramed('json', '{}');
        var out = transformCodeBlocks(html);
        out.should.not.containEql('mg-code-opts');
        out.should.startWith('<p>Intro</p>\n<figure class="mg-code" data-lang="json" data-title="book.json" ' +
            'data-line-numbers="true" data-wrap="true" data-highlight="8-10"><div class="mg-code-head">' +
            '<span class="mg-lang">JSON</span><span class="mg-code-title">book.json</span></div>' +
            '<pre><code class="lang-json">{}\n</code></pre></figure>');
    });

    it('only merges a marker that directly precedes the block', function() {
        var html = '<div class="mg-code-opts" data-title="a"></div>\n<p>between</p>\n' + kramed('js', '1');
        var out = transformCodeBlocks(html);
        out.should.not.containEql('mg-code-opts');
        out.should.not.containEql('data-title');
    });

    it('labels a block without a language as text', function() {
        var out = transformCodeBlocks(kramed(null, 'plain'));
        out.should.containEql('<figure class="mg-code" data-lang="text">');
        out.should.containEql('<span class="mg-lang">Text</span>');
        out.should.containEql('<pre><code>plain\n</code></pre>');
    });

    it('leaves author-written <pre> blocks alone', function() {
        var html = '<pre class="custom">x</pre>\n<pre>y</pre>';
        transformCodeBlocks(html).should.equal(html);
    });

    it('keeps several blocks independent', function() {
        var out = transformCodeBlocks(kramed('py', 'a') + '<p>x</p>\n' + kramed('sql', 'b'));
        (out.match(/<figure /g) || []).length.should.equal(2);
        out.should.containEql('<span class="mg-lang">Python</span>');
        out.should.containEql('<span class="mg-lang">SQL</span>');
    });

    describe('language labels', function() {
        var LABELS = {
            bash: 'Bash', sh: 'Shell', powershell: 'PowerShell', ps1: 'PowerShell',
            py: 'Python', python: 'Python', js: 'JavaScript', javascript: 'JavaScript',
            ts: 'TypeScript', typescript: 'TypeScript', json: 'JSON', yaml: 'YAML', yml: 'YAML',
            sql: 'SQL', rust: 'Rust', rs: 'Rust', dockerfile: 'Dockerfile', toml: 'TOML',
            ini: 'INI', css: 'CSS', go: 'GO', 'c++': 'C++'
        };
        Object.keys(LABELS).forEach(function(lang) {
            it(lang + ' -> ' + LABELS[lang], function() {
                transformCodeBlocks(kramed(lang, 'x'))
                    .should.containEql('<span class="mg-lang">' + LABELS[lang].replace(/&/g, '&amp;') + '</span>');
            });
        });

        it('does not read labels from Object.prototype', function() {
            transformCodeBlocks(kramed('constructor', 'x')).should.containEql('<span class="mg-lang">CONSTRUCTOR</span>');
            transformCodeBlocks(kramed('__proto__', 'x')).should.containEql('<span class="mg-lang">__PROTO__</span>');
        });

        it('is case-insensitive for known languages and escapes unknown ones', function() {
            transformCodeBlocks(kramed('JSON', 'x')).should.containEql('<span class="mg-lang">JSON</span>');
            transformCodeBlocks('<pre><code class="lang-a&quot;b">x</code></pre>')
                .should.containEql('data-lang="a&quot;b"');
        });
    });

    describe('terminal blocks', function() {
        ['console', 'shell-session', 'terminal'].forEach(function(lang) {
            it(lang + ' becomes a terminal figure', function() {
                var out = transformCodeBlocks(kramed(lang, '$ ls'));
                out.should.startWith('<figure class="mg-code mg-terminal" data-lang="console">' +
                    '<div class="mg-code-head"><span class="mg-lang">Terminal</span></div><pre>');
            });
        });

        it('splits commands and output into lines', function() {
            var out = transformCodeBlocks(kramed('console',
                '$ docker compose up -d\n[+] Running 2/2\n$ docker ps'));
            preOf(out).should.equal(
                '<span class="mg-ln mg-cmd"><span class="mg-pr" aria-hidden="true">$ </span>' +
                '<code class="lang-bash">docker compose up -d</code>\n</span>' +
                '<span class="mg-ln mg-out">[+] Running 2/2\n</span>' +
                '<span class="mg-ln mg-cmd"><span class="mg-pr" aria-hidden="true">$ </span>' +
                '<code class="lang-bash">docker ps</code>\n</span>');
        });

        it('has no outer <code> wrapping the whole block', function() {
            var pre = preOf(transformCodeBlocks(kramed('console', '$ a\nb')));
            pre.should.not.startWith('<code');
            (pre.match(/<code/g) || []).length.should.equal(1);
        });

        it('recognises PowerShell prompts', function() {
            var pre = preOf(transformCodeBlocks(kramed('console', 'PS> winget install x\nPS C:\\> dir')));
            pre.should.containEql('<span class="mg-pr" aria-hidden="true">PS&gt; </span>' +
                '<code class="lang-powershell">winget install x</code>');
            pre.should.containEql('<span class="mg-pr" aria-hidden="true">PS C:\\&gt; </span>' +
                '<code class="lang-powershell">dir</code>');
        });

        it('treats a $ without a following space as output', function() {
            var pre = preOf(transformCodeBlocks(kramed('console', '$HOME is set')));
            pre.should.equal('<span class="mg-ln mg-out">$HOME is set\n</span>');
        });

        it('escapes output lines', function() {
            var pre = preOf(transformCodeBlocks(kramed('console',
                '$ docker images\nREPOSITORY   TAG\n<none>       <none>')));
            pre.should.containEql('<span class="mg-ln mg-out">&lt;none&gt;       &lt;none&gt;\n</span>');
            pre.should.not.containEql('<none>');
        });

        it('keeps empty output lines', function() {
            var pre = preOf(transformCodeBlocks(kramed('console', '$ a\n\nb')));
            pre.should.containEql('<span class="mg-ln mg-out">\n</span>');
        });

        it('merges options into a terminal figure', function() {
            var out = transformCodeBlocks('<div class="mg-code-opts" data-title="Shell" data-line-numbers="true"></div>\n' +
                kramed('console', '$ ls'));
            out.should.startWith('<figure class="mg-code mg-terminal" data-lang="console" data-title="Shell" ' +
                'data-line-numbers="true"><div class="mg-code-head"><span class="mg-lang">Terminal</span>' +
                '<span class="mg-code-title">Shell</span></div><pre>');
        });
    });

    describe('round trips', function() {
        it('keeps {% raw %} and &amp; literal in code blocks', function() {
            var src = 'echo "{% raw %}" && echo &amp;';
            var out = transformCodeBlocks(kramed('bash', src));
            out.should.containEql('<code class="lang-bash">echo &quot;{% raw %}&quot; &amp;&amp; echo &amp;amp;\n</code>');
        });

        it('keeps {% raw %} and &amp; literal in terminal commands and output', function() {
            var pre = preOf(transformCodeBlocks(kramed('console', '$ echo "{% raw %}" &amp;\n{% raw %} &amp; <b>')));
            pre.should.containEql('<code class="lang-bash">echo &quot;{% raw %}&quot; &amp;amp;</code>');
            pre.should.containEql('<span class="mg-ln mg-out">{% raw %} &amp;amp; &lt;b&gt;\n</span>');
        });
    });
});

describe('template tags inside fenced code', function() {
    var SOURCE = '{% raw %}{{ page.title }}{% endraw %}\n{%- if x -%}{{ x }}{% endif %}';
    var MD = 'Before {% raw %}{{ kept }}{% endraw %}\n\n```jinja\n' + SOURCE + '\n```\n\nAfter {{ book.title }}\n';

    it('hides every {% inside fences from the template engine', function() {
        var out = protectTemplateTags(MD);
        var fence = out.slice(out.indexOf('```jinja'), out.lastIndexOf('```'));
        fence.should.not.containEql('{%');
        fence.should.containEql('{{ page.title }}');
        out.should.startWith('Before {% raw %}{{ kept }}{% endraw %}\n\n```jinja\n');
        out.should.endWith('```\n\nAfter {{ book.title }}\n');
    });

    it('leaves markdown without fences unchanged', function() {
        var md = 'Text {% raw %}{% endraw %} and `{{ x }}`\n';
        protectTemplateTags(md).should.equal(md);
    });

    it('protects ~~~ fences and fences in list items, and stops at the closing fence', function() {
        var md = '* item\n\n  ~~~\n  {% endraw %}\n  ~~~\n\n{% hint %}x{% endhint %}\n';
        var out = protectTemplateTags(md);
        out.should.not.containEql('{% endraw %}');
        out.should.endWith('\n{% hint %}x{% endhint %}\n');
    });

    it('restores the literal tags in HTML', function() {
        restoreTemplateTags(protectTemplateTags(MD)).should.equal(MD);
        restoreTemplateTags('<p>a {% raw %}</p>').should.equal('<p>a {% raw %}</p>');
    });

    it('round-trips through the code block transform', function() {
        var fenceBody = protectTemplateTags('```console\n$ echo "{% raw %}" &amp;\n{% endraw %} <b>\n```\n').split('\n').slice(1, 3).join('\n');
        var pre = preOf(transformCodeBlocks(restoreTemplateTags(kramed('console', fenceBody))));
        pre.should.containEql('<code class="lang-bash">echo &quot;{% raw %}&quot; &amp;amp;</code>');
        pre.should.containEql('<span class="mg-ln mg-out">{% endraw %} &lt;b&gt;\n</span>');
    });

    it('works together with {% code %} options', function() {
        var md = '{% code title="t" %}\n```js\n"{% endraw %}"\n```\n{% endcode %}\n';
        var out = preprocessCodeOptions(protectTemplateTags(md));
        out.should.startWith('<div class="mg-code-opts" data-title="t"></div>\n\n```js\n');
        out.should.not.containEql('endcode');
        restoreTemplateTags(out).should.containEql('"{% endraw %}"');
    });
});
