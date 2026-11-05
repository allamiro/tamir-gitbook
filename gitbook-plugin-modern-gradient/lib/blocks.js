// Template blocks: hint, tabs/tab, stepper/step and path.
//
//   {% hint style="warning" title="Careful" %}Markdown{% endhint %}
//   {% tabs %}{% tab title="Linux" %}…{% tab title="macOS" %}…{% endtabs %}
//   {% stepper %}{% step %}### One …{% step %}### Two …{% endstepper %}
//   {% path %}intro.md{% endpath %}
//
// Blocks run on the Markdown source; bodies are rendered with
// renderBlock('markdown') and GitBook pastes the result into the page HTML
// in place of a marker. Markdown wraps that marker in a paragraph, so
// block-level output is fenced with comments and unwrapBlocks (first step
// of the "page" hook) removes the paragraph again: <p><div> is invalid HTML
// and leaves an empty paragraph behind.
var escapeHtml = require('./escape').escapeHtml;
var callouts = require('./callouts');

var OPEN = '<!--mg-block-->';
var CLOSE = '<!--/mg-block-->';

// GitBook hint styles -> callout kinds
var HINT_STYLES = { info: 'info', success: 'tip', warning: 'warning', danger: 'danger' };

// Tab slugs that get a platform icon
var TAB_ICONS = { linux: 'linux', macos: 'apple', windows: 'windows' };

function own(map, key) {
    return Object.prototype.hasOwnProperty.call(map, key);
}

function fence(html) {
    return OPEN + html + CLOSE;
}

// Markdown text -> Promise of HTML ('' for blank text)
function markdown(ctx, text) {
    if (!/\S/.test(String(text || ''))) return Promise.resolve('');
    return Promise.resolve(ctx.book.renderBlock('markdown', String(text)));
}

function subBlocks(block, name) {
    return (block.blocks || []).filter(function(sub) {
        return sub.name === name;
    });
}

// "macOS" -> "macos"; repeats get -2, -3, …
function slugger() {
    var used = {};
    return function(title, fallback) {
        var base = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
        var slug = base;
        for (var n = 2; own(used, slug); n++) slug = base + '-' + n;
        used[slug] = true;
        return slug;
    };
}

// Text before the first sub-block, then the sub-blocks' HTML
function renderParts(ctx, block, subs) {
    return Promise.all([markdown(ctx, block.body)].concat(subs.map(function(sub) {
        return markdown(ctx, sub.body);
    })));
}

function hint(block) {
    var kwargs = block.kwargs || {};
    var style = String(kwargs.style || '').toLowerCase();
    var kind = own(HINT_STYLES, style) ? HINT_STYLES[style] : 'info';
    return markdown(this, block.body).then(function(html) {
        return fence(callouts.callout(kind, kwargs.title ? String(kwargs.title) : '', html));
    });
}

function tabs(block) {
    var subs = subBlocks(block, 'tab');
    var slug = slugger();
    var list = subs.map(function(sub, i) {
        var title = sub.kwargs && sub.kwargs.title != null && String(sub.kwargs.title) !== ''
            ? String(sub.kwargs.title) : 'Tab ' + (i + 1);
        return { title: title, slug: slug(title, 'tab') };
    });

    return renderParts(this, block, subs).then(function(parts) {
        var intro = parts.shift();
        var buttons = list.map(function(tab, i) {
            return '<button type="button" class="mg-tab" role="tab" data-tab="' + tab.slug + '"' +
                ' aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? '0' : '-1') + '">' +
                (own(TAB_ICONS, tab.slug) ? callouts.svgIcon(TAB_ICONS[tab.slug]) : '') +
                escapeHtml(tab.title) + '</button>';
        }).join('');
        var panels = list.map(function(tab, i) {
            return '<div class="mg-tabpanel" role="tabpanel" data-panel="' + tab.slug + '"' +
                ' data-title="' + escapeHtml(tab.title) + '"' + (i === 0 ? '' : ' hidden') + '>' +
                parts[i] + '</div>';
        }).join('');
        var sync = list.map(function(tab) { return tab.title; }).join('|');

        return fence(intro + '<div class="mg-tabs" data-sync="' + escapeHtml(sync) + '">' +
            '<div class="mg-tablist" role="tablist">' + buttons + '</div>' + panels + '</div>');
    });
}

function stepper(block) {
    var subs = subBlocks(block, 'step');
    return renderParts(this, block, subs).then(function(parts) {
        var intro = parts.shift();
        return fence(intro + '<ol class="mg-steps">' + parts.map(function(html) {
            return '<li class="mg-step">' + html + '</li>';
        }).join('') + '</ol>');
    });
}

// Inline, so not fenced: it stays inside its paragraph
function path(block) {
    var text = String(block.body || '').trim();
    var name = /\/$/.test(text) ? 'folder' : 'file';
    return '<span class="mg-path">' + callouts.svgIcon(name) + escapeHtml(text) + '</span>';
}

// Drops the <p> Markdown put around a fenced block (when the block is the
// whole paragraph) and every fence comment.
function unwrapBlocks(html) {
    var source = String(html);
    if (source.indexOf(OPEN) === -1) return source;

    var TOKEN = /(<p>\s*)?<!--mg-block-->|<!--\/mg-block-->(\s*<\/p>)?/g;
    var drop = [];   // [start, end] ranges to remove
    var stack = [];
    var m;
    while ((m = TOKEN.exec(source))) {
        var start = m.index;
        var end = TOKEN.lastIndex;
        if (m[0].indexOf(CLOSE) === -1) {
            stack.push({ start: start, end: end, wrapped: !!m[1], pEnd: start + (m[1] ? m[1].length : 0) });
            continue;
        }
        var opener = stack.pop();
        if (!opener) {
            drop.push([start, start + CLOSE.length]);
            continue;
        }
        if (opener.wrapped && m[2]) {
            drop.push([opener.start, opener.end], [start, end]);
        } else {
            drop.push([opener.pEnd, opener.end], [start, start + CLOSE.length]);
        }
    }
    stack.forEach(function(opener) {
        drop.push([opener.pEnd, opener.end]);
    });

    drop.sort(function(a, b) { return a[0] - b[0]; });
    var out = '';
    var at = 0;
    drop.forEach(function(range) {
        out += source.slice(at, range[0]);
        at = range[1];
    });
    return out + source.slice(at);
}

module.exports = {
    blocks: {
        hint: { process: hint },
        tabs: { blocks: ['tab'], process: tabs },
        stepper: { blocks: ['step'], process: stepper },
        path: { process: path }
    },
    unwrapBlocks: unwrapBlocks
};
