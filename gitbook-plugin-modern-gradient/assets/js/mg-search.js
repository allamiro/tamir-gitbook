/* Modern Gradient search dialog: Ctrl/Cmd+K, "/" (outside text fields) or the
 * header button open a modal with grouped results - Pages, Sections, Commands -
 * from the build-time index (modern-gradient/search.json) plus GitBook's
 * full-text search when it is ready. Arrow keys move, Enter opens the result
 * through GitBook's in-app navigation, Esc closes and returns focus.
 * The sidebar search box is untouched.
 */
(function(window, document) {
    'use strict';

    if (!window.MG || window.MG.search) return;

    var INDEX_PATH = 'modern-gradient/search.json';
    var LIMITS = { page: 8, section: 8, command: 6 };
    var GROUPS = [
        { c: 'page', label: 'Pages', icon: 'file' },
        { c: 'section', label: 'Sections', icon: 'list' },
        { c: 'command', label: 'Commands', icon: 'terminal' }
    ];
    var SCOPES = [['all', 'All'], ['page', 'Pages'], ['section', 'Sections'], ['command', 'Commands']];

    var index = null;          // array of entries once loaded
    var loading = null;
    var dialog, overlay, input, list, chips, status;
    var scope = 'all';
    var items = [];            // current result entries, in display order
    var active = -1;
    var returnFocus = null;
    var fulltextSeq = 0;

    // ------------------------------------------------------------ paths
    function rootURL() {
        var base = (window.gitbook && window.gitbook.state && window.gitbook.state.basePath) || '.';
        return new URL(base.replace(/\/?$/, '/'), window.location.href);
    }

    function loadIndex() {
        if (index) return Promise.resolve(index);
        if (loading) return loading;
        loading = window.fetch(new URL(INDEX_PATH, rootURL()).href, { credentials: 'same-origin' })
            .then(function(r) { return r.ok ? r.json() : []; })
            .catch(function() { return []; })
            .then(function(data) {
                index = Array.isArray(data) ? data : [];
                loading = null;
                return index;
            });
        return loading;
    }

    // ------------------------------------------------------------ DOM
    function el(tag, cls, text) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text != null) node.textContent = text;
        return node;
    }

    function icon(name) {
        var span = el('span', 'mg-search-ico');
        span.setAttribute('aria-hidden', 'true');
        span.innerHTML = window.MG.icon(name);
        return span;
    }

    function build() {
        overlay = el('div', 'mg-search-overlay');
        overlay.hidden = true;
        dialog = el('div', 'mg-search-dialog');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', 'Search documentation');

        var row = el('div', 'mg-search-row');
        row.appendChild(icon('search'));
        input = el('input', 'mg-search-input');
        input.type = 'search';
        input.setAttribute('placeholder', 'Search pages, sections and commands');
        input.setAttribute('aria-label', 'Search');
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-expanded', 'true');
        input.setAttribute('aria-controls', 'mg-search-list');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('spellcheck', 'false');
        row.appendChild(input);
        var close = el('button', 'mg-search-close');
        close.type = 'button';
        close.setAttribute('aria-label', 'Close search');
        close.innerHTML = window.MG.icon('close');
        row.appendChild(close);
        dialog.appendChild(row);

        chips = el('div', 'mg-search-chips');
        chips.setAttribute('role', 'radiogroup');
        chips.setAttribute('aria-label', 'Search in');
        SCOPES.forEach(function(s) {
            var b = el('button', 'mg-search-chip', s[1]);
            b.type = 'button';
            b.setAttribute('role', 'radio');
            b.setAttribute('data-scope', s[0]);
            b.setAttribute('aria-checked', String(s[0] === scope));
            chips.appendChild(b);
        });
        dialog.appendChild(chips);

        list = el('div', 'mg-search-list');
        list.id = 'mg-search-list';
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-label', 'Results');
        dialog.appendChild(list);

        status = el('div', 'mg-search-foot');
        status.innerHTML = '<span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span>' +
            '<span><kbd>Esc</kbd> close</span>';
        dialog.appendChild(status);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        input.addEventListener('input', function() { render(); });
        input.addEventListener('keydown', onInputKey);
        close.addEventListener('click', function() { hide(true); });
        chips.addEventListener('click', function(e) {
            var b = e.target.closest('[data-scope]');
            if (!b) return;
            scope = b.getAttribute('data-scope');
            Array.prototype.forEach.call(chips.children, function(c) {
                c.setAttribute('aria-checked', String(c === b));
            });
            render();
            input.focus();
        });
        overlay.addEventListener('mousedown', function(e) {
            if (e.target === overlay) hide(true);
        });
        list.addEventListener('mousemove', function(e) {
            var opt = e.target.closest('[role=option]');
            if (opt) setActive(Number(opt.getAttribute('data-i')), false);
        });
        list.addEventListener('click', function(e) {
            var opt = e.target.closest('[role=option]');
            if (opt) open(Number(opt.getAttribute('data-i')));
        });
        dialog.addEventListener('keydown', trapFocus);
    }

    // ------------------------------------------------------------ search
    function matches(entry, q) {
        return entry.t.toLowerCase().indexOf(q) !== -1 || (entry.c === 'page' && entry.s.toLowerCase().indexOf(q) !== -1);
    }

    function rank(entry, q) {
        var t = entry.t.toLowerCase();
        if (t === q) return 0;
        if (t.indexOf(q) === 0) return 1;
        if (t.indexOf(q) !== -1) return 2;
        return 3;
    }

    function search(q) {
        var groups = { page: [], section: [], command: [] };
        var all = index || [];
        if (!q) {
            all.forEach(function(e) {
                if (e.c === 'page' && groups.page.length < LIMITS.page) groups.page.push(e);
                if (e.c === 'command' && groups.command.length < 2) groups.command.push(e);
            });
            return groups;
        }
        all.forEach(function(e) {
            if (matches(e, q)) groups[e.c].push(e);
        });
        Object.keys(groups).forEach(function(c) {
            groups[c].sort(function(a, b) { return rank(a, q) - rank(b, q); });
            groups[c] = groups[c].slice(0, LIMITS[c]);
        });
        return groups;
    }

    // Full-text page hits from GitBook's lunr search, deduped into Pages
    function addFulltext(q, groups, seq) {
        var gb = window.gitbook;
        if (!q || !gb || !gb.search || !gb.search.isInitialized || !gb.search.isInitialized()) return;
        var root = rootURL();
        // our own page entries carry clean titles and snippets (lunr's body
        // includes the article chrome), so a full-text hit reuses them
        var known = {};
        (index || []).forEach(function(e) {
            if (e.c === 'page') known[new URL(e.u, root).pathname] = e;
        });
        gb.search.query(q, 0, 10).then(function(res) {
            if (seq !== fulltextSeq || !res || !res.results) return;
            var have = {};
            groups.page.forEach(function(e) { have[new URL(e.u, root).pathname] = true; });
            var added = false;
            res.results.forEach(function(r) {
                var u = new URL(r.url, root);
                var path = u.pathname;
                if (have[path] || groups.page.length >= LIMITS.page) return;
                have[path] = true;
                groups.page.push(known[path] || { c: 'page', t: r.title || r.url, s: '', u: u.href.slice(root.href.length) });
                added = true;
            });
            if (added) paint(groups, q);
        });
    }

    function render() {
        var q = input.value.trim().toLowerCase();
        var seq = ++fulltextSeq;
        loadIndex().then(function() {
            if (seq !== fulltextSeq) return;
            var groups = search(q);
            paint(groups, q);
            addFulltext(q, groups, seq);
        });
    }

    function highlight(node, text, q) {
        var i = q ? text.toLowerCase().indexOf(q) : -1;
        if (i === -1) {
            node.textContent = text;
            return;
        }
        node.appendChild(document.createTextNode(text.slice(0, i)));
        node.appendChild(el('mark', null, text.slice(i, i + q.length)));
        node.appendChild(document.createTextNode(text.slice(i + q.length)));
    }

    function paint(groups, q) {
        list.innerHTML = '';
        items = [];
        GROUPS.forEach(function(g) {
            if (scope !== 'all' && scope !== g.c) return;
            var entries = groups[g.c];
            if (!entries.length) return;
            var label = !q && g.c === 'command' ? 'Popular commands' : g.label;
            var head = el('div', 'mg-search-group', label);
            head.setAttribute('role', 'presentation');
            list.appendChild(head);
            entries.forEach(function(e) {
                var opt = el('div', 'mg-search-opt mg-search-' + g.c);
                opt.id = 'mg-search-opt-' + items.length;
                opt.setAttribute('role', 'option');
                opt.setAttribute('aria-selected', 'false');
                opt.setAttribute('data-i', String(items.length));
                opt.appendChild(icon(g.icon));
                var text = el('span', 'mg-search-text');
                var t = el(g.c === 'command' ? 'code' : 'span', 'mg-search-t');
                highlight(t, e.t, q);
                text.appendChild(t);
                if (e.s) text.appendChild(el('span', 'mg-search-s', e.s));
                opt.appendChild(text);
                list.appendChild(opt);
                items.push(e);
            });
        });
        if (!items.length) {
            var empty = el('div', 'mg-search-empty', q ? 'No results for "' + input.value.trim() + '"' : 'Nothing indexed yet');
            empty.setAttribute('role', 'status');
            list.appendChild(empty);
        }
        setActive(items.length ? 0 : -1, false);
    }

    function setActive(i, scroll) {
        active = i;
        var opts = list.querySelectorAll('[role=option]');
        for (var k = 0; k < opts.length; k++) opts[k].setAttribute('aria-selected', String(k === i));
        if (i >= 0 && opts[i]) {
            input.setAttribute('aria-activedescendant', opts[i].id);
            if (scroll !== false && opts[i].scrollIntoView) opts[i].scrollIntoView({ block: 'nearest' });
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    }

    // ------------------------------------------------------------ navigation
    function open(i) {
        var entry = items[i];
        if (!entry) return;
        var target = new URL(entry.u, rootURL());
        hide(false);
        // theme-default navigates in-app for links clicked inside .page-inner
        // (a delegated handler on document, so a native click on a temporary link works)
        var host = document.querySelector('.book .page-inner');
        if (host) {
            var a = document.createElement('a');
            a.href = target.pathname + target.search + target.hash;
            a.style.display = 'none';
            host.appendChild(a);
            a.click();
            if (a.parentNode) a.parentNode.removeChild(a);
        } else {
            window.location.href = target.href;
        }
    }

    function onInputKey(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (items.length) setActive((active + 1) % items.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length) setActive((active - 1 + items.length) % items.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            open(active);
        }
    }

    function focusables() {
        return Array.prototype.filter.call(dialog.querySelectorAll('input, button'), function(n) {
            return !n.disabled && n.offsetParent !== null;
        });
    }

    function trapFocus(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            hide(true);
            return;
        }
        if (e.key !== 'Tab') return;
        var f = focusables();
        if (!f.length) return;
        var first = f[0];
        var last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    // ------------------------------------------------------------ open / close
    function show(trigger) {
        if (!overlay) build();
        if (!overlay.hidden) return;
        returnFocus = trigger || document.activeElement;
        overlay.hidden = false;
        document.documentElement.classList.add('mg-search-open');
        input.value = '';
        input.focus();
        render();
    }

    function hide(restore) {
        if (!overlay || overlay.hidden) return;
        overlay.hidden = true;
        document.documentElement.classList.remove('mg-search-open');
        if (restore && returnFocus && document.body.contains(returnFocus)) returnFocus.focus();
        returnFocus = null;
    }

    function typingInField(target) {
        if (!target) return false;
        var tag = target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    }

    document.addEventListener('keydown', function(e) {
        var key = e.key && e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && !e.altKey && key === 'k') {
            e.preventDefault();
            if (overlay && !overlay.hidden) hide(true); else show(document.activeElement);
        } else if (key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typingInField(e.target) &&
                   !(overlay && !overlay.hidden)) {
            e.preventDefault();
            show(document.activeElement);
        }
    });

    // The header is replaced on every in-app page change: delegate
    document.addEventListener('click', function(e) {
        var btn = e.target.closest && e.target.closest('[data-mg-search]');
        if (!btn) return;
        e.preventDefault();
        show(btn);
    });

    window.MG.search = { open: show, close: hide };
})(window, document);
