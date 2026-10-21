// Article chrome rendered on the server, so it reads without JavaScript:
// breadcrumbs and eyebrow from the SUMMARY hierarchy, the meta chips
// (reading time, difficulty) and prerequisites from front matter, and the
// previous / next cards. The table of contents and heading anchors are
// browser enhancements (assets/js/mg-content.js): heading ids only exist
// after GitBook's addHeadingId modifier, which runs after the page hook.
var escapeHtml = require('./escape').escapeHtml;
var icon = require('./icons').icon;

var WORDS_PER_MINUTE = 200;
var LEVELS = ['beginner', 'intermediate', 'advanced'];

function svgIcon(name) {
    return icon(name).replace('<svg ', '<svg class="mg-i" data-mg-icon="' + escapeHtml(name) + '" ');
}

function identity(value) {
    return value;
}

// ---------------------------------------------------------------- reading time

// Minutes to read Markdown or HTML: max(1, round(words / 200)). Fenced
// code, <pre> blocks, code figures and tags are not counted.
function readingTime(text) {
    var plain = String(text == null ? '' : text)
        .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, ' ')
        .replace(/<figure\b[^>]*\bmg-code\b[^>]*>[\s\S]*?<\/figure>/gi, ' ')
        .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&[#\w]+;/g, ' ');
    var words = plain.split(/\s+/).filter(function(word) {
        return /[0-9A-Za-zÀ-ɏͰ-῿぀-￯]/.test(word);
    }).length;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

// ---------------------------------------------------------------- breadcrumbs

function cleanPath(p) {
    return String(p || '').replace(/\\/g, '/').replace(/^(\.\/)+/, '');
}

// [{title, url, current?}] from Home down to the page. A page that is not in
// SUMMARY gets [Home] only. Parents without a page of their own keep their
// title with url null. toURL(articlePath) -> href (defaults to the path).
function breadcrumbTrail(summaryArticles, path, toURL) {
    var articles = Array.isArray(summaryArticles) ? summaryArticles : [];
    var link = typeof toURL === 'function' ? toURL : identity;
    var target = cleanPath(path);

    var home = null;
    var byLevel = {};
    var current = null;
    articles.forEach(function(article) {
        if (!article) return;
        if (!home && article.path) home = article;
        if (article.level != null) byLevel[String(article.level)] = article;
        if (!current && article.path && target && cleanPath(article.path) === target) current = article;
    });

    var homeCrumb = { title: 'Home', url: home ? link(home.path) : null };
    if (!current) return [homeCrumb];
    if (current === home) {
        homeCrumb.current = true;
        return [homeCrumb];
    }

    var crumbs = [{ title: String(current.title || ''), url: link(current.path), current: true }];
    var level = String(current.level || '');
    while (level.lastIndexOf('.') > 0) {
        level = level.slice(0, level.lastIndexOf('.'));
        var parent = byLevel[level];
        if (parent && parent !== home) {
            crumbs.unshift({ title: String(parent.title || ''), url: parent.path ? link(parent.path) : null });
        }
    }
    crumbs.unshift(homeCrumb);
    return crumbs;
}

// ---------------------------------------------------------------- article head

function renderCrumbs(trail) {
    if (!trail.length) return '';
    var sep = svgIcon('chevron-right');
    var items = trail.map(function(crumb, i) {
        var title = escapeHtml(crumb.title);
        var body;
        if (crumb.current) body = '<span aria-current="page">' + title + '</span>';
        else if (crumb.url) body = '<a href="' + escapeHtml(crumb.url) + '">' + title + '</a>';
        else body = '<span>' + title + '</span>';
        return '<li>' + (i > 0 ? sep : '') + body + '</li>';
    });
    return '<nav class="mg-crumbs no-glossary" aria-label="Breadcrumb"><ol>' + items.join('') + '</ol></nav>';
}

// Parent titles: the trail without Home and without the page itself
function renderEyebrow(trail) {
    var parents = trail.slice(1).filter(function(crumb) { return !crumb.current; });
    if (!parents.length) return '';
    return '<div class="mg-eyebrow no-glossary">' +
        parents.map(function(crumb) { return escapeHtml(crumb.title); }).join(' · ') + '</div>';
}

function difficultyOf(page) {
    var value = typeof page.difficulty === 'string' ? page.difficulty.trim().toLowerCase() : '';
    return LEVELS.indexOf(value) === -1 ? '' : value;
}

function prerequisitesOf(page) {
    var list = page.prerequisites;
    if (list == null) return [];
    if (!Array.isArray(list)) list = [list];
    return list.filter(function(item) {
        return item != null && String(item).trim() !== '';
    }).map(function(item) { return String(item).trim(); });
}

function renderMeta(page, options) {
    var chips = [];
    if (page.readingTime !== false && page.readingTime !== 'false') {
        var minutes = options.minutes != null ? options.minutes : readingTime(page.content);
        chips.push('<span class="mg-chip mg-chip-time">' + svgIcon('clock') +
            escapeHtml(minutes) + ' min read</span>');
    }
    var level = difficultyOf(page);
    if (level) {
        chips.push('<span class="mg-chip mg-chip-level-' + level + '">' + svgIcon('signal') +
            level.charAt(0).toUpperCase() + level.slice(1) + '</span>');
    }

    var html = chips.length ? '<div class="mg-meta">' + chips.join('') + '</div>' : '';

    var prereqs = prerequisitesOf(page);
    if (prereqs.length) {
        html += '<div class="mg-prereq"><p class="mg-prereq-title">You will need</p><ul>' +
            prereqs.map(function(item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') +
            '</ul></div>';
    }
    return html;
}

function parts(page, trail, options) {
    var p = page || {};
    var crumbs = Array.isArray(trail) ? trail : [];
    return {
        top: renderCrumbs(crumbs) + renderEyebrow(crumbs),
        meta: renderMeta(p, options || {})
    };
}

// Breadcrumbs, eyebrow, meta chips and prerequisites, in reading order
function renderArticleHead(page, trail, options) {
    var head = parts(page, trail, options);
    return head.top + head.meta;
}

// Places the head around the page's leading <h1>, as in the mockup:
// breadcrumbs and eyebrow above the title, chips and prerequisites below.
// Without a leading <h1> the whole head goes first.
function insertArticleHead(html, page, trail, options) {
    var content = String(html == null ? '' : html);
    var head = parts(page, trail, options);
    var m = /^\s*(<h1\b[^>]*>[\s\S]*?<\/h1>)\s*/i.exec(content);
    if (!m) return head.top + head.meta + content;
    return head.top + m[1] + '\n' + head.meta + content.slice(m[0].length);
}

// ---------------------------------------------------------------- pager

function pagerLink(kind, article, link) {
    if (!article || !article.path) return '';
    var prev = kind === 'prev';
    var href = link(article.path) + (article.anchor || '');
    return '<a class="mg-' + kind + '" href="' + escapeHtml(href) + '">' +
        '<span class="mg-pager-dir">' +
        (prev ? svgIcon('chevron-left') + 'Previous' : 'Next' + svgIcon('chevron-right')) +
        '</span><span class="mg-pager-title">' + escapeHtml(article.title) + '</span></a>';
}

// Previous / next cards; '' when the page has neither neighbour
function renderPager(page, toURL) {
    var p = page || {};
    var link = typeof toURL === 'function' ? toURL : identity;
    var cards = pagerLink('prev', p.previous, link) + pagerLink('next', p.next, link);
    if (!cards) return '';
    return '<nav class="mg-pager no-glossary" aria-label="Previous and next pages">' + cards + '</nav>';
}

// ---------------------------------------------------------------- urls

function segments(p) {
    return cleanPath(p).split('/').filter(function(s) { return s && s !== '.'; });
}

// A book-root-relative path ("guides/dupes.md", "code.html", "guides/")
// made relative to the folder of the page `fromFile`, so links work from
// any folder and under a sub-path.
function relativeURL(fromFile, target) {
    var url = String(target || '');
    var isDir = url === '' || url === '.' || /\/$/.test(url);
    var from = segments(fromFile);
    from.pop();
    var to = segments(url);
    var i = 0;
    while (i < from.length && i < to.length && from[i] === to[i]) i++;
    var out = [];
    for (var j = i; j < from.length; j++) out.push('..');
    out = out.concat(to.slice(i)).join('/');
    if (isDir) return out ? out + '/' : './';
    return out || './';
}

module.exports = {
    readingTime: readingTime,
    breadcrumbTrail: breadcrumbTrail,
    renderArticleHead: renderArticleHead,
    insertArticleHead: insertArticleHead,
    renderPager: renderPager,
    relativeURL: relativeURL
};
