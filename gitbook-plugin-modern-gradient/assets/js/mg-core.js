/* Modern Gradient core: the page-change bus (MG.onPage), storage (MG.store),
 * icon painting, the light/dark mode toggle, the shared toast (MG.toast, also
 * the polite live region), clipboard (MG.copyText), the page scroller
 * (MG.scroller) and the reading-progress bar. Later features (focus mode,
 * drawer, sidebar) build on MG.onPage and MG.store.
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

    // ------------------------------------------------------------ toast
    // One toast for the whole site, outside .book so it survives page
    // changes. It is also the polite live region: screen readers hear the
    // same message sighted readers see.
    var TOAST_MS = 1700;
    var toastEl = null;
    var toastShow = null;
    var toastHide = null;

    function toastNode() {
        if (toastEl && document.body.contains(toastEl)) return toastEl;
        toastEl = document.createElement('div');
        toastEl.className = 'mg-toast';
        toastEl.setAttribute('role', 'status');
        toastEl.setAttribute('aria-live', 'polite');
        toastEl.setAttribute('aria-atomic', 'true');
        toastEl.innerHTML = iconSvg('check') + '<span class="mg-toast-msg"></span>';
        var svg = toastEl.querySelector('svg');
        if (svg) svg.setAttribute('class', 'mg-i');
        document.body.appendChild(toastEl);
        return toastEl;
    }

    function toast(message) {
        var el = toastNode();
        var msg = el.querySelector('.mg-toast-msg');
        window.clearTimeout(toastShow);
        window.clearTimeout(toastHide);
        // Emptied first, so the same message twice is announced twice
        msg.textContent = '';
        toastShow = window.setTimeout(function() {
            msg.textContent = String(message);
            el.classList.add('mg-show');
            toastHide = window.setTimeout(function() {
                el.classList.remove('mg-show');
                toastHide = window.setTimeout(function() { msg.textContent = ''; }, 300);
            }, TOAST_MS);
        }, 50);
    }

    // ------------------------------------------------------------ clipboard
    function copyFallback(text) {
        var active = document.activeElement;
        var area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        var ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (e) { /* not supported */ }
        document.body.removeChild(area);
        if (active && active.focus) active.focus();
        return ok;
    }

    // done(ok) once the text is (or failed to be) on the clipboard
    function copyText(text, done) {
        if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
            navigator.clipboard.writeText(text).then(function() {
                done(true);
            }, function() {
                done(copyFallback(text));
            });
        } else {
            done(copyFallback(text));
        }
    }

    // ------------------------------------------------------------ scroller
    // theme-default scrolls .body-inner on wide screens and .book-body at
    // 1240px and below (where .body-inner is static and never overflows)
    function scroller(root) {
        var book = root || currentRoot || pageRoot();
        var inner = book.querySelector('.body-inner');
        if (inner && inner.scrollHeight - inner.clientHeight > 1) return inner;
        return book.querySelector('.book-body') || inner || document.scrollingElement || document.documentElement;
    }

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    // ------------------------------------------------------------ progress
    var progressQueued = false;

    function updateProgress() {
        progressQueued = false;
        var root = currentRoot;
        var bar = root && root.querySelector('.mg-progress > i');
        if (!bar) return;
        var el = scroller(root);
        var max = el.scrollHeight - el.clientHeight;
        var ratio = max > 1 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
        bar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
    }

    function queueProgress() {
        if (progressQueued) return;
        progressQueued = true;
        (window.requestAnimationFrame || window.setTimeout)(updateProgress);
    }

    // Scroll events do not bubble: one capturing listener sees whichever
    // element scrolls, on every page, without per-page set-up
    document.addEventListener('scroll', queueProgress, true);
    window.addEventListener('resize', queueProgress);

    function initProgress(root) {
        var body = root.querySelector('.book-body');
        if (!body || body.querySelector('.mg-progress')) return;
        var bar = document.createElement('div');
        bar.className = 'mg-progress';
        bar.setAttribute('aria-hidden', 'true');
        bar.appendChild(document.createElement('i'));
        body.insertBefore(bar, body.firstChild);
        queueProgress();
    }

    window.MG = {
        onPage: onPage,
        store: store,
        icon: iconSvg,
        setMode: setMode,
        toast: toast,
        copyText: copyText,
        scroller: scroller,
        reducedMotion: prefersReducedMotion
    };

    // The live region exists before its first message, so it is announced
    if (document.body) toastNode();

    // Per-page chrome set-up
    onPage(function(root) {
        paintIcons(root);
        var summary = root.querySelector('.book-summary');
        if (summary && !summary.id) summary.id = 'mg-sidebar';
        syncModeButton();
        initProgress(root);
    });

    // First page now; later pages on page.change
    pageChanged();
    if (window.gitbook && window.gitbook.events) {
        var firstChange = true;
        window.gitbook.events.on('page.change', function() {
            // theme-default's start-up focuses .page-wrapper, which scrolls
            // the header out of view on the first load (later pages reset
            // their scroll themselves). Undo that unless a #hash is targeted.
            if (firstChange) {
                firstChange = false;
                var el = scroller();
                if (!window.location.hash && el.scrollTop) el.scrollTop = 0;
            }
            pageChanged();
        });
    }
})(window, document);
