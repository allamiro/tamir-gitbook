// Build-time index for the Ctrl/Cmd-K search dialog: one entry per page, per
// h2/h3 section and per terminal command, written to modern-gradient/search.json.
//
//   entry = { c: 'page'|'section'|'command', t: title, s: snippet, u: url }
//
// `u` is relative to the book root (chapter-1/getting-started.html#install).
// Section anchors use GitBook 3's own slug rule (github-slugid), because
// GitBook adds heading ids after the page hook runs.

var SLUG_SYMBOLS = [
    '[', ']', '!', '"', '\'', '#',
    '$', '%', '&', '(', ')', '*', '+', ',', '.', '/', ':', ';', '<', '=',
    '>', '?', '@', '\\', '^', '_', '`', '{', '|', '}', '~',
    '©', '∑', '®', '†', '“', '”', '‘', '’', '∂', 'ƒ', '™', '℠', '…',
    'œ', 'Œ', '˚', 'º', 'ª', '•', '∆', '∞', '♥'
];
var SLUG_RE = new RegExp('[' + SLUG_SYMBOLS.map(function(c) {
    return '\\' + c;
}).join('') + ']+', 'g');

var SNIPPET_LENGTH = 140;

function slug(text) {
    var s = String(text).replace(SLUG_RE, '').replace(/ /g, '-').toLowerCase();
    return s.charAt(0) === '-' ? s.slice(1) : s;
}

var ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': '\'', apos: '\'', nbsp: ' ' };

function decode(text) {
    return text.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, function(m, name) {
        return ENTITIES[name];
    }).replace(/&#(\d+);/g, function(m, code) {
        return String.fromCharCode(Number(code));
    });
}

function plain(html) {
    return decode(String(html).replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function snippet(text) {
    return text.length > SNIPPET_LENGTH ? text.slice(0, SNIPPET_LENGTH - 1).replace(/\s+\S*$/, '') + '…' : text;
}

// Remove callouts and quotes (they are not a page summary). Callouts nest divs,
// so this walks <div> depth instead of using one regex.
function stripAsides(html) {
    html = html.replace(/<blockquote[\s\S]*?<\/blockquote>/g, '');
    var out = '';
    var pos = 0;
    var start;
    while ((start = html.indexOf('<div class="mg-callout', pos)) !== -1) {
        out += html.slice(pos, start);
        var depth = 0;
        var re = /<div\b|<\/div>/g;
        re.lastIndex = start;
        var m;
        while ((m = re.exec(html)) !== null) {
            depth += m[0] === '</div>' ? -1 : 1;
            if (depth === 0) break;
        }
        pos = m ? re.lastIndex : html.length;
    }
    return out + html.slice(pos);
}

// README.md -> index.html, a/b.md -> a/b.html
function pageUrl(path) {
    return String(path || '').replace(/(^|\/)README\.md$/i, '$1index.html').replace(/\.md$/i, '.html');
}

function createCollector() {
    var entries = [];

    function add(page, html, url) {
        var title = plain((page && page.title) || '');
        var firstPara = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(stripAsides(html));
        entries.push({ c: 'page', t: title, s: snippet(firstPara ? plain(firstPara[1]) : ''), u: url });

        // headings and terminal commands in document order
        var re = /<h([23])([^>]*)>([\s\S]*?)<\/h\1>|<span class="mg-ln mg-cmd">[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>/g;
        var anchor = '';
        var seen = {};
        var m;
        while ((m = re.exec(html)) !== null) {
            if (m[1]) {
                var idAttr = /\sid="([^"]+)"/.exec(m[2]);
                var text = plain(m[3]);
                anchor = idAttr ? idAttr[1] : slug(text);
                entries.push({ c: 'section', t: text, s: title, u: url + '#' + anchor });
            } else {
                var cmd = plain(m[4]);
                if (!cmd || seen[cmd]) continue;
                seen[cmd] = true;
                entries.push({ c: 'command', t: cmd, s: title, u: url + (anchor ? '#' + anchor : '') });
            }
        }
    }

    return {
        add: add,
        toJSON: function() {
            return JSON.stringify(entries);
        }
    };
}

module.exports = {
    createCollector: createCollector,
    slug: slug,
    pageUrl: pageUrl
};
