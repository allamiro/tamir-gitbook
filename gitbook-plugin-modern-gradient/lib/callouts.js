// Callouts and checklists from plain Markdown, as string transforms over
// kramed's output in the "page" hook:
//
//   > [!NOTE]            <blockquote>\n<p>[!NOTE]\nBody</p>\n</blockquote>
//   > Body          ->   div.mg-callout.mg-callout-info
//
//   - [ ] Do x           <ul>\n<li>[ ] Do x</li>\n</ul>
//   - [x] Done      ->   ul.mg-checklist (kramed has no task lists)
//
// Icons are inline SVG, so callouts read the same without JavaScript.
var escapeHtml = require('./escape').escapeHtml;
var icon = require('./icons').icon;

// GitHub alert type -> callout kind and title
var ALERTS = {
    NOTE: { kind: 'info', title: 'Note' },
    TIP: { kind: 'tip', title: 'Tip' },
    IMPORTANT: { kind: 'info', title: 'Important' },
    WARNING: { kind: 'warning', title: 'Warning' },
    CAUTION: { kind: 'danger', title: 'Caution' }
};

var KIND_ICONS = { info: 'info', tip: 'bulb', warning: 'alert', danger: 'danger' };

// Decorative inline icon (aria-hidden comes with the icon set)
function svgIcon(name) {
    return icon(name).replace('<svg ', '<svg class="mg-i" data-mg-icon="' + escapeHtml(name) + '" ');
}

// kind: info|tip|warning|danger; title: plain text (optional); body: HTML
function callout(kind, title, bodyHtml) {
    var safeKind = Object.prototype.hasOwnProperty.call(KIND_ICONS, kind) ? kind : 'info';
    return '<div class="mg-callout mg-callout-' + safeKind + '" role="note">' +
        '<span class="mg-callout-icon">' + svgIcon(KIND_ICONS[safeKind]) + '</span>' +
        '<div class="mg-callout-body">' +
        (title ? '<span class="mg-callout-title">' + escapeHtml(title) + '</span>' : '') +
        bodyHtml + '</div></div>';
}

// ------------------------------------------------------------ alerts

// Innermost blockquotes only: the body holds no other blockquote tag
var BLOCKQUOTE = /<blockquote>\n?((?:(?!<\/?blockquote[\s>])[\s\S])*?)<\/blockquote>/g;
// An alert marker opening a top-level paragraph of the blockquote
var MARKER = /(^|\n)<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*/gi;

// Rest of the blockquote after one marker -> callout body HTML
function alertBody(rest) {
    var body = rest.replace(/^\s+/, '');
    // "[!NOTE]</p>": the marker had its own paragraph
    if (body.indexOf('</p>') === 0) return body.slice(4).replace(/^\s+/, '').replace(/\s+$/, '');
    return ('<p>' + body).replace(/\s+$/, '');
}

function renderAlerts(all, inner) {
    var content = inner.replace(/^\s+/, '');
    var found = [];
    var m;
    MARKER.lastIndex = 0;
    while ((m = MARKER.exec(content))) {
        found.push({ start: m.index + m[1].length, end: MARKER.lastIndex, type: m[2].toUpperCase() });
    }
    if (!found.length || found[0].start !== 0) return all;

    // kramed merges consecutive quotes: every marker starts its own callout
    return found.map(function(marker, i) {
        var stop = i + 1 < found.length ? found[i + 1].start : content.length;
        var alert = ALERTS[marker.type];
        return callout(alert.kind, alert.title, alertBody(content.slice(marker.end, stop)));
    }).join('\n');
}

// <blockquote> starting with [!NOTE|TIP|IMPORTANT|WARNING|CAUTION] -> callout
function transformAlerts(html) {
    return String(html).replace(BLOCKQUOTE, renderAlerts);
}

// ------------------------------------------------------------ task lists

// Innermost lists only: nested lists stay as they are
var LIST = /<ul>\n((?:(?!<\/?(?:ul|ol)[\s>])[\s\S])*?)<\/ul>/g;
var ITEM = /<li>([\s\S]*?)<\/li>\n?/g;
// "[ ] text" (tight item) or "<p>[ ] text</p>" (loose item)
var TASK = /^(<p>)?\[([ xX])\][ \t]+([\s\S]*?)\s*$/;

// Item HTML -> { checked, html } or null when it is not a task
function taskOf(inner) {
    var m = TASK.exec(inner);
    if (!m) return null;
    var text = m[3];
    if (m[1]) {
        // Loose items convert only when they are a single paragraph
        var end = text.lastIndexOf('</p>');
        if (end === -1 || end !== text.length - 4) return null;
        text = text.slice(0, end);
        if (/<\/?p[\s>]/.test(text)) return null;
    }
    return { checked: m[2] !== ' ', html: text };
}

function renderList(all, inner) {
    var items = [];
    var covered = '';
    var m;
    ITEM.lastIndex = 0;
    while ((m = ITEM.exec(inner))) {
        var task = taskOf(m[1]);
        if (!task) return all;
        items.push(task);
        covered += m[0];
    }
    if (!items.length || covered !== inner) return all;

    return '<ul class="mg-checklist">\n' + items.map(function(task) {
        return '<li><label><input type="checkbox" disabled' + (task.checked ? ' checked' : '') +
            '><span>' + task.html + '</span></label></li>\n';
    }).join('') + '</ul>';
}

// <ul> whose every item starts with [ ] or [x] -> ul.mg-checklist
function transformTaskLists(html) {
    return String(html).replace(LIST, renderList);
}

module.exports = {
    callout: callout,
    svgIcon: svgIcon,
    transformAlerts: transformAlerts,
    transformTaskLists: transformTaskLists
};
