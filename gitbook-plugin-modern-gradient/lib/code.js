// Code blocks: GitBook-style {% code %} options, language labels and
// terminal blocks. Plain string transforms over the known shapes:
//
//   page:before  raw Markdown        protectTemplateTags, preprocessCodeOptions
//   page         kramed output HTML  restoreTemplateTags, transformCodeBlocks
//
// GitBook's highlight step runs after the "page" hook and rewrites every
// <code> element from its text, so nothing here may put markup inside a
// <code>: terminal blocks use one small <code> per command line instead.
var escapeHtml = require('./escape').escapeHtml;

// ------------------------------------------------------------ page:before

var CODE_TAG = /^(\s*)\{%-?\s*code(?=\s|-?%\})((?:[^%]|%(?!\}))*?)-?%\}\s*$/;
var ENDCODE_TAG = /^\s*\{%-?\s*endcode\s*-?%\}\s*$/;
var FENCE = /^\s*(`{3,}|~{3,})/;
var ATTR = /([A-Za-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;

function parseAttributes(source) {
    var attrs = {};
    var m;
    ATTR.lastIndex = 0;
    while ((m = ATTR.exec(source))) {
        attrs[m[1]] = m[2] != null ? m[2] : (m[3] != null ? m[3] : m[4]);
    }
    return attrs;
}

// Only the options we support, in a fixed order; values escaped
function optionsMarker(attrs) {
    var out = '<div class="mg-code-opts"';
    if (attrs.title) out += ' data-title="' + escapeHtml(attrs.title) + '"';
    if (String(attrs.lineNumbers).toLowerCase() === 'true') out += ' data-line-numbers="true"';
    if (String(attrs.overflow).toLowerCase() === 'wrap') out += ' data-wrap="true"';
    if (attrs.highlight) out += ' data-highlight="' + escapeHtml(attrs.highlight) + '"';
    return out + '></div>';
}

// Calls fn(line, inFence) for every Markdown line outside multi-line
// {% raw %} regions and fence delimiters; fn returns the replacement line.
function mapLines(markdown, fn) {
    var lines = String(markdown).split('\n');
    var fence = null;   // the open fence's marker, e.g. "```"
    var inRaw = false;  // inside a multi-line {% raw %} region

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var m = FENCE.exec(line);

        if (fence) {
            if (m && m[1].charAt(0) === fence.charAt(0) && m[1].length >= fence.length &&
                /^\s*$/.test(line.slice(line.indexOf(m[1]) + m[1].length))) {
                fence = null;
            } else {
                lines[i] = fn(line, true);
            }
            continue;
        }
        if (inRaw) {
            if (line.indexOf('{% endraw %}') !== -1) inRaw = false;
            continue;
        }
        if (m) {
            fence = m[1];
            continue;
        }
        if (line.lastIndexOf('{% raw %}') > line.lastIndexOf('{% endraw %}')) {
            inRaw = true;
            continue;
        }
        lines[i] = fn(line, false);
    }
    return lines.join('\n');
}

// GitBook wraps each fenced block in {% raw %}…{% endraw %} before the
// template engine runs, so a literal {% endraw %} (or any tag) in the code
// would end that wrapper early. Inside fences "{%" becomes "{" + U+E000 +
// "%", which neither the template engine nor Markdown touches;
// restoreTemplateTags puts it back in the page HTML.
var TAG_GUARD = '{\uE000%';
var GUARDED = /\{\uE000%/g;

function protectTemplateTags(markdown) {
    return mapLines(markdown, function(line, inFence) {
        return inFence ? line.split('{%').join(TAG_GUARD) : line;
    });
}

function restoreTemplateTags(html) {
    return String(html).replace(GUARDED, '{%');
}

// {% code title="…" lineNumbers="true" overflow="wrap" highlight="1,3-5" %}
// ```lang … ``` {% endcode %}  ->  <div class="mg-code-opts" …></div> + fence.
// The highlight plugin owns the block name "code", so this cannot be a
// template block; it is rewritten before GitBook escapes code with raw tags.
function preprocessCodeOptions(markdown) {
    var open = 0;  // {% code %} tags waiting for {% endcode %}

    return mapLines(markdown, function(line, inFence) {
        if (inFence) return line;
        var m = CODE_TAG.exec(line);
        if (m) {
            open++;
            // The blank line ends the HTML block so the fence still parses
            return m[1] + optionsMarker(parseAttributes(m[2])) + '\n';
        }
        if (open > 0 && ENDCODE_TAG.test(line)) {
            open--;
            return '';
        }
        return line;
    });
}

// ------------------------------------------------------------ page

var LABELS = {
    bash: 'Bash',
    sh: 'Shell',
    powershell: 'PowerShell',
    ps1: 'PowerShell',
    py: 'Python',
    python: 'Python',
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    sql: 'SQL',
    rust: 'Rust',
    rs: 'Rust',
    dockerfile: 'Dockerfile',
    toml: 'TOML',
    ini: 'INI',
    css: 'CSS',
    text: 'Text'
};

var TERMINAL_LANGS = { 'console': true, 'shell-session': true, 'terminal': true };

// Options carried over from the marker (values were escaped in page:before)
var OPTION_ATTRS = ['data-title', 'data-line-numbers', 'data-wrap', 'data-highlight'];

var BLOCK = new RegExp(
    '(?:<div class="mg-code-opts"([^>]*)><\\/div>\\s*)?' +
    '<pre><code(?: class="([^"]*)")?>([\\s\\S]*?)<\\/code><\\/pre>', 'g');
var ORPHAN_MARKER = /<div class="mg-code-opts"[^>]*><\/div>\n?/g;

var PROMPTS = [
    { re: /^(\$ )([\s\S]*)$/, lang: 'bash' },
    { re: /^(PS(?: [^>]*)?> )([\s\S]*)$/, lang: 'powershell' }
];

var ENTITIES = { lt: '<', gt: '>', quot: '"', amp: '&', apos: '\'' };

function own(map, key) {
    return Object.prototype.hasOwnProperty.call(map, key);
}

// One pass, so "&amp;lt;" becomes "&lt;" and not "<"
function unescapeHtml(html) {
    return String(html).replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, function(all, name) {
        if (name.charAt(0) === '#') {
            var code = name.charAt(1).toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
            if (!code || code > 0x10ffff) return all;
            return String.fromCodePoint ? String.fromCodePoint(code) : String.fromCharCode(code);
        }
        return own(ENTITIES, name) ? ENTITIES[name] : all;
    });
}

function parseOptions(attrSource) {
    var found = {};
    var re = /([\w-]+)="([^"]*)"/g;
    var m;
    while ((m = re.exec(attrSource || ''))) found[m[1]] = m[2];
    return found;
}

function languageOf(className) {
    var classes = unescapeHtml(className || '').split(/\s+/);
    for (var i = 0; i < classes.length; i++) {
        var m = /^(?:lang|language)-(.+)$/.exec(classes[i]);
        if (m) return m[1];
    }
    return '';
}

function terminalLines(escapedText) {
    var text = unescapeHtml(escapedText).replace(/\r\n?/g, '\n').replace(/\n$/, '');
    return text.split('\n').map(function(line) {
        for (var i = 0; i < PROMPTS.length; i++) {
            var m = PROMPTS[i].re.exec(line);
            if (m) {
                return '<span class="mg-ln mg-cmd"><span class="mg-pr" aria-hidden="true">' +
                    escapeHtml(m[1]) + '</span><code class="lang-' + PROMPTS[i].lang + '">' +
                    escapeHtml(m[2]) + '</code>\n</span>';
            }
        }
        return '<span class="mg-ln mg-out">' + escapeHtml(line) + '\n</span>';
    }).join('');
}

function renderBlock(all, optsSource, className, body) {
    var raw = languageOf(className);
    var lang = raw.toLowerCase() || 'text';
    var terminal = own(TERMINAL_LANGS, lang);
    var options = parseOptions(optsSource);

    var figure = '<figure class="mg-code' + (terminal ? ' mg-terminal' : '') + '" data-lang="' +
        (terminal ? 'console' : escapeHtml(lang)) + '"';
    OPTION_ATTRS.forEach(function(name) {
        if (options[name]) figure += ' ' + name + '="' + options[name] + '"';
    });
    figure += '>';

    var label = terminal ? 'Terminal' : (own(LABELS, lang) ? LABELS[lang] : raw.toUpperCase());
    var head = '<div class="mg-code-head"><span class="mg-lang">' + escapeHtml(label) + '</span>' +
        (options['data-title'] ? '<span class="mg-code-title">' + options['data-title'] + '</span>' : '') +
        '</div>';

    var pre = terminal
        ? '<pre>' + terminalLines(body) + '</pre>'
        : '<pre><code' + (className != null ? ' class="' + className + '"' : '') + '>' + body + '</code></pre>';

    return figure + head + pre + '</figure>';
}

// <pre><code class="lang-X">…</code></pre> (kramed) -> figure.mg-code
function transformCodeBlocks(html) {
    return String(html).replace(BLOCK, renderBlock).replace(ORPHAN_MARKER, '');
}

module.exports = {
    protectTemplateTags: protectTemplateTags,
    restoreTemplateTags: restoreTemplateTags,
    preprocessCodeOptions: preprocessCodeOptions,
    transformCodeBlocks: transformCodeBlocks
};
