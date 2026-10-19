/* Modern Gradient core: the page-change bus (MG.onPage), storage (MG.store),
 * icon painting and the light/dark mode toggle. Later features (focus mode,
 * drawer, sidebar, progress) build on MG.onPage and MG.store.
 *
 * theme-default swaps the whole .book element on in-app navigation and then
 * emits gitbook.events "page.change" (also once on the first load). Handlers
 * registered with MG.onPage run once per .book element, so the first page is
 * not initialised twice.
 */
(function(window, document) {
    'use strict';

    if (window.MG) return;

    var STORE_PREFIX = 'mg-';
    var memory = {};

    // localStorage with an in-memory fallback (private mode, blocked storage)
    var store = {
        get: function(key, fallback) {
            // The session's own writes win, so a failed write is never lost
            var value = Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
            if (value == null) {
                try {
                    value = window.localStorage.getItem(STORE_PREFIX + key);
                } catch (e) { /* blocked: fall back */ }
            }
            return value == null ? fallback : value;
        },
        set: function(key, value) {
            memory[key] = String(value);
            try {
                window.localStorage.setItem(STORE_PREFIX + key, String(value));
            } catch (e) { /* memory copy keeps the session working */ }
        }
    };

    var handlers = [];
    var currentRoot = null;

    function pageRoot() {
        return document.querySelector('.book') || document.body;
    }

    function run(fn, root) {
        try {
            fn(root);
        } catch (e) {
            if (window.console && window.console.error) window.console.error('[modern-gradient]', e);
        }
    }

    // fn(rootEl) runs now and after every in-app page change
    function onPage(fn) {
        handlers.push(fn);
        if (currentRoot) run(fn, currentRoot);
    }

    function pageChanged() {
        var root = pageRoot();
        if (!root || root === currentRoot) return;
        currentRoot = root;
        for (var i = 0; i < handlers.length; i++) run(handlers[i], root);
    }

    function iconSvg(name) {
        return window.MGIcons ? window.MGIcons.icon(name) : '';
    }

    // <i class="mg-i" data-mg-icon="name"> placeholders -> inline svg
    function paintIcons(root) {
        var nodes = root.querySelectorAll('i[data-mg-icon]');
        for (var i = 0; i < nodes.length; i++) setIcon(nodes[i], nodes[i].getAttribute('data-mg-icon'));
    }

    function setIcon(el, name) {
        var holder = document.createElement('span');
        holder.innerHTML = iconSvg(name);
        var svg = holder.firstChild;
        if (!svg) return;
        svg.setAttribute('class', 'mg-i');
        svg.setAttribute('data-mg-icon', name);
        el.parentNode.replaceChild(svg, el);
    }

    // ------------------------------------------------------------ mode
    var html = document.documentElement;
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function currentMode() {
        return html.getAttribute('data-tg-mode') === 'dark' ? 'dark' : 'light';
    }

    function syncModeButton() {
        var btn = document.getElementById('mg-mode');
        if (!btn) return;
        var dark = currentMode() === 'dark';
        btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        var icon = btn.querySelector('[data-mg-icon]');
        var want = dark ? 'sun' : 'moon';
        if (icon && icon.getAttribute('data-mg-icon') !== want) setIcon(icon, want);
    }

    function setMode(mode, persist) {
        html.setAttribute('data-tg-mode', mode === 'dark' ? 'dark' : 'light');
        if (persist) store.set('mode', currentMode());
        syncModeButton();
    }

    // Follow the OS while the reader has not chosen a mode
    if (media) {
        var follow = function(e) {
            var saved = store.get('mode', null);
            if (saved !== 'dark' && saved !== 'light') setMode(e.matches ? 'dark' : 'light', false);
        };
        if (media.addEventListener) media.addEventListener('change', follow);
        else if (media.addListener) media.addListener(follow);
    }

    // Delegated: the header is replaced on every page change
    document.addEventListener('click', function(e) {
        var target = e.target && e.target.closest ? e.target.closest('#mg-mode') : null;
        if (!target) return;
        e.preventDefault();
        setMode(currentMode() === 'dark' ? 'light' : 'dark', true);
    });

    window.MG = {
        onPage: onPage,
        store: store,
        icon: iconSvg,
        setMode: setMode
    };

    // Per-page chrome set-up
    onPage(function(root) {
        paintIcons(root);
        var summary = root.querySelector('.book-summary');
        if (summary && !summary.id) summary.id = 'mg-sidebar';
        syncModeButton();
    });

    // First page now; later pages on page.change
    pageChanged();
    if (window.gitbook && window.gitbook.events) {
        window.gitbook.events.on('page.change', pageChanged);
    }
})(window, document);
