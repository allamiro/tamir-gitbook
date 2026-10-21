/* Modern Gradient content: tabs and checklists on the markup from
 * lib/blocks.js and lib/callouts.js; heading anchors, the table of contents
 * in aside.mg-toc (page.html) and its scrollspy.
 *
 * Tabs: click, Left/Right/Home/End with a roving tabindex. Choosing a tab
 * selects it in every .mg-tabs with the same data-sync on the page and is
 * remembered (MG.store "tab:<data-sync>") for later pages and visits.
 * Checklists: the server renders disabled boxes (read-only without
 * JavaScript); here they become usable, with an "N of M done" header.
 * Ticks last for the page load only.
 *
 * Headings: GitBook gives every heading an id from its text, without
 * de-duplicating, so a repeated heading gets "<id>-1", "<id>-2", … here
 * (the first keeps its id). h2/h3 get a "copy link" button and, with two or
 * more of them, a table of contents with Back to top, Edit this page (when
 * editUrl is configured) and Focus mode actions.
 *
 * Listeners are delegated on document and registered once; the per-page
 * set-up runs through MG.onPage, which also disconnects the previous page's
 * scrollspy observer.
 */
(function(window, document) {
    'use strict';

    if (!window.MG || window.MG.content) return;

    var MG = window.MG;
    var uid = 0;

    function hasClass(el, name) {
        return !!el && typeof el.className === 'string' &&
            (' ' + el.className + ' ').indexOf(' ' + name + ' ') !== -1;
    }

    function childrenWithClass(el, name) {
        var out = [];
        for (var i = 0; el && i < el.children.length; i++) {
            if (hasClass(el.children[i], name)) out.push(el.children[i]);
        }
        return out;
    }

    // ------------------------------------------------------------ tabs

    function tabButtons(group) {
        return childrenWithClass(childrenWithClass(group, 'mg-tablist')[0], 'mg-tab');
    }

    // Shows `slug` in one .mg-tabs; false when it has no such tab
    function selectIn(group, slug) {
        var tabs = tabButtons(group);
        var found = tabs.some(function(tab) { return tab.getAttribute('data-tab') === slug; });
        if (!found) return false;
        tabs.forEach(function(tab) {
            var on = tab.getAttribute('data-tab') === slug;
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
            tab.setAttribute('tabindex', on ? '0' : '-1');
        });
        childrenWithClass(group, 'mg-tabpanel').forEach(function(panel) {
            panel.hidden = panel.getAttribute('data-panel') !== slug;
        });
        return true;
    }

    // Every tab group on the page with the same titles follows
    function selectTab(sync, slug) {
        var groups = document.querySelectorAll('.mg-tabs');
        for (var i = 0; i < groups.length; i++) {
            if (groups[i].getAttribute('data-sync') === sync) selectIn(groups[i], slug);
        }
        MG.store.set('tab:' + sync, slug);
    }

    function initTabs(root) {
        var groups = root.querySelectorAll('.mg-tabs');
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var panels = childrenWithClass(group, 'mg-tabpanel');
            tabButtons(group).forEach(function(tab) {
                var panel = panels.filter(function(p) {
                    return p.getAttribute('data-panel') === tab.getAttribute('data-tab');
                })[0];
                var id = 'mg-tab-' + (++uid);
                tab.id = id;
                if (panel) {
                    panel.id = id + '-panel';
                    tab.setAttribute('aria-controls', panel.id);
                    panel.setAttribute('aria-labelledby', id);
                }
            });
            var saved = MG.store.get('tab:' + group.getAttribute('data-sync'), null);
            if (saved) selectIn(group, saved);
        }
    }

    function tabFrom(target) {
        var tab = target && target.closest ? target.closest('.mg-tab') : null;
        var list = tab && tab.parentNode;
        var group = list && list.parentNode;
        return tab && hasClass(list, 'mg-tablist') && hasClass(group, 'mg-tabs') ? { tab: tab, group: group } : null;
    }

    document.addEventListener('click', function(e) {
        var hit = tabFrom(e.target);
        if (!hit) return;
        selectTab(hit.group.getAttribute('data-sync'), hit.tab.getAttribute('data-tab'));
    });

    // Capture phase on window: theme-default binds Left/Right to the previous
    // and next page (Mousetrap on document), which must not see these keys
    window.addEventListener('keydown', function(e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        var hit = tabFrom(e.target);
        if (!hit) return;
        var tabs = tabButtons(hit.group);
        var at = tabs.indexOf(hit.tab);
        var next;
        if (e.key === 'ArrowRight') next = tabs[(at + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(at + tabs.length - 1) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        e.stopPropagation();
        selectTab(hit.group.getAttribute('data-sync'), next.getAttribute('data-tab'));
        next.focus();
    }, true);

    // ------------------------------------------------------------ checklists

    function boxes(list) {
        return Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]'));
    }

    function updateChecklist(list) {
        var all = boxes(list);
        var done = all.filter(function(box) { return box.checked; }).length;
        var count = list.querySelector('.mg-checklist-count');
        var bar = list.querySelector('.mg-meter i');
        if (count) count.textContent = done + ' of ' + all.length + ' done';
        if (bar) bar.style.width = (all.length ? 100 * done / all.length : 0) + '%';
    }

    function initChecklists(root) {
        var lists = root.querySelectorAll('ul.mg-checklist');
        for (var i = 0; i < lists.length; i++) {
            var list = lists[i];
            if (list.querySelector('.mg-checklist-head')) continue;
            boxes(list).forEach(function(box) { box.disabled = false; });

            var head = document.createElement('li');
            head.className = 'mg-checklist-head';
            head.setAttribute('role', 'presentation');
            head.innerHTML = '<span class="mg-checklist-count" aria-live="polite"></span>' +
                '<span class="mg-meter" aria-hidden="true"><i></i></span>';
            list.insertBefore(head, list.firstChild);
            updateChecklist(list);
        }
    }

    document.addEventListener('change', function(e) {
        var target = e.target;
        var list = target && target.closest ? target.closest('ul.mg-checklist') : null;
        if (list && target.type === 'checkbox') updateChecklist(list);
    });

    // ------------------------------------------------------------ headings

    function iconEl(name) {
        var holder = document.createElement('span');
        holder.innerHTML = MG.icon(name);
        var svg = holder.firstChild;
        if (svg && svg.setAttribute) {
            svg.setAttribute('class', 'mg-i');
            svg.setAttribute('data-mg-icon', name);
        }
        return svg || document.createTextNode('');
    }

    function headingText(h) {
        var text = h.querySelector('.mg-heading-text');
        return ((text || h).textContent || '').replace(/\s+/g, ' ').trim();
    }

    // Distinct ids for repeated headings; returns the ids that changed
    function dedupeIds(section) {
        var seen = {};
        var renamed = {};
        var headings = section.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (var i = 0; i < headings.length; i++) {
            var h = headings[i];
            var id = h.id || 'section';
            if (seen[id]) {
                var n = 1;
                while (seen[id + '-' + n] || document.getElementById(id + '-' + n)) n++;
                id = id + '-' + n;
                renamed[id] = true;
            }
            if (h.id !== id) h.id = id;
            seen[id] = true;
        }
        return renamed;
    }

    // "Copy link" button inside each h2/h3. The heading's own text is
    // wrapped and named with aria-labelledby, so the heading still reads as
    // its text alone (not "Copy link to …").
    function addAnchor(h) {
        if (h.querySelector('.mg-anchor')) return;
        var text = document.createElement('span');
        text.className = 'mg-heading-text';
        text.id = 'mg-h-' + (++uid);
        while (h.firstChild) text.appendChild(h.firstChild);
        h.appendChild(text);
        h.setAttribute('aria-labelledby', text.id);
        h.classList.add('mg-heading');

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mg-anchor';
        btn.setAttribute('aria-label', 'Copy link to \u201c' + headingText(h) + '\u201d');
        btn.title = 'Copy link';
        btn.appendChild(iconEl('link'));
        h.insertBefore(btn, text);
    }

    function pageURL() {
        return window.location.href.split('#')[0];
    }

    document.addEventListener('click', function(e) {
        var btn = e.target && e.target.closest ? e.target.closest('.mg-anchor') : null;
        var h = btn && btn.parentNode;
        if (!h || !h.id) return;
        e.preventDefault();
        MG.copyText(pageURL() + '#' + h.id, function(ok) {
            MG.toast(ok ? 'Link copied' : 'Copy failed: copy the link from the address bar');
        });
    });

    // ------------------------------------------------------------ toc

    var spy = null;

    function tocHeadings(section) {
        var all = section.querySelectorAll('h2, h3');
        var out = [];
        for (var i = 0; i < all.length; i++) {
            // Hidden tab panels and closed <details> cannot be scrolled to
            if (all[i].closest('.mg-tabpanel, details')) continue;
            if (all[i].id) out.push(all[i]);
        }
        return out;
    }

    function editUrl() {
        var state = window.gitbook && window.gitbook.state;
        var cfg = state && state.config && state.config.pluginsConfig &&
            state.config.pluginsConfig['modern-gradient'];
        var base = cfg && typeof cfg.editUrl === 'string' ? cfg.editUrl : '';
        var file = state && ((state.file && state.file.path) || (state.page && state.page.path));
        return /^https?:\/\//i.test(base) && file ? base + file : '';
    }

    function actionButton(act, iconName, label) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-mg-act', act);
        btn.appendChild(iconEl(iconName));
        btn.appendChild(document.createTextNode(label));
        return btn;
    }

    function buildToc(toc, headings) {
        var title = document.createElement('p');
        title.className = 'mg-toc-title';
        title.appendChild(iconEl('list'));
        title.appendChild(document.createTextNode('On this page'));

        var list = document.createElement('ol');
        headings.forEach(function(h) {
            var li = document.createElement('li');
            li.className = h.tagName === 'H3' ? 'mg-toc-l3' : 'mg-toc-l2';
            var a = document.createElement('a');
            a.href = '#' + h.id;
            a.setAttribute('data-mg-toc', h.id);
            a.textContent = headingText(h);
            li.appendChild(a);
            list.appendChild(li);
        });

        var actions = document.createElement('div');
        actions.className = 'mg-toc-actions';
        actions.appendChild(actionButton('top', 'arrow-up', 'Back to top'));
        var edit = editUrl();
        if (edit) {
            var link = document.createElement('a');
            link.className = 'mg-toc-edit';
            link.href = edit;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.appendChild(iconEl('pencil'));
            link.appendChild(document.createTextNode('Edit this page'));
            actions.appendChild(link);
        }
        actions.appendChild(actionButton('focus', 'focus', 'Focus mode'));

        toc.appendChild(title);
        toc.appendChild(list);
        toc.appendChild(actions);
    }

    function setActive(toc, id) {
        var links = toc.querySelectorAll('a[data-mg-toc]');
        for (var i = 0; i < links.length; i++) {
            var on = links[i].getAttribute('data-mg-toc') === id;
            links[i].classList.toggle('active', on);
            if (on) links[i].setAttribute('aria-current', 'location');
            else links[i].removeAttribute('aria-current');
        }
    }

    // The section being read is the last heading above the top 30% of the
    // viewport (the first heading before any has been reached)
    var SPY_LINE = 0.3;

    function updateActive(toc, headings) {
        var line = window.innerHeight * SPY_LINE;
        var active = headings[0];
        for (var i = 0; i < headings.length; i++) {
            if (headings[i].getBoundingClientRect().top <= line + 1) active = headings[i];
            else break;
        }
        if (active) setActive(toc, active.id);
    }

    function startSpy(toc, headings) {
        if (!window.IntersectionObserver) return;
        spy = new window.IntersectionObserver(function() {
            updateActive(toc, headings);
        }, { rootMargin: '0px 0px -' + (100 - SPY_LINE * 100) + '% 0px', threshold: [0, 1] });
        headings.forEach(function(h) { spy.observe(h); });
    }

    function scrollToHeading(h) {
        h.scrollIntoView({ behavior: MG.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        // Keyboard and screen-reader users continue from the heading
        if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
        try {
            h.focus({ preventScroll: true });
        } catch (e) { /* old browsers */ }
    }

    document.addEventListener('click', function(e) {
        var target = e.target && e.target.closest ? e.target : null;
        var toc = target && target.closest('.mg-toc');
        if (!toc) return;

        var link = target.closest('a[data-mg-toc]');
        if (link) {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            var h = document.getElementById(link.getAttribute('data-mg-toc'));
            if (!h) return;
            e.preventDefault();
            var url = pageURL() + '#' + h.id;
            // Same shape as theme-default's history entries, so Back works
            if (window.history && window.history.pushState) window.history.pushState({ path: url }, '', url);
            scrollToHeading(h);
            setActive(toc, h.id);
            return;
        }

        var act = target.closest('[data-mg-act]');
        if (!act) return;
        if (act.getAttribute('data-mg-act') === 'top') {
            var el = MG.scroller();
            if (el.scrollTo) el.scrollTo({ top: 0, behavior: MG.reducedMotion() ? 'auto' : 'smooth' });
            else el.scrollTop = 0;
            var wrapper = document.querySelector('.page-wrapper');
            if (wrapper) {
                try {
                    wrapper.focus({ preventScroll: true });
                } catch (err) { /* old browsers */ }
            }
        } else if (act.getAttribute('data-mg-act') === 'focus') {
            // Focus mode belongs to the header button (#mg-focus)
            var focusBtn = document.getElementById('mg-focus');
            if (focusBtn) focusBtn.click();
        }
    });

    function initHeadings(root) {
        if (spy) {
            spy.disconnect();
            spy = null;
        }
        var section = root.querySelector('.markdown-section');
        if (!section) return;

        var renamed = dedupeIds(section);
        var anchored = section.querySelectorAll('h2, h3');
        for (var i = 0; i < anchored.length; i++) {
            if (anchored[i].id) addAnchor(anchored[i]);
        }

        var toc = root.querySelector('.mg-toc');
        if (toc) {
            toc.innerHTML = '';
            var headings = tocHeadings(section);
            if (headings.length >= 2) {
                buildToc(toc, headings);
                updateActive(toc, headings);
                startSpy(toc, headings);
            }
        }

        // A link to a renamed duplicate ("#setup-1") could not be followed
        // before the id existed
        var hash = window.location.hash.slice(1);
        try {
            hash = decodeURIComponent(hash);
        } catch (e) { /* keep it as is */ }
        if (hash && renamed[hash]) {
            var target = document.getElementById(hash);
            var go = function() {
                target.scrollIntoView({ block: 'start' });
            };
            // On a first load, after fonts and theme-default's start-up
            if (target && document.readyState === 'complete') window.setTimeout(go, 0);
            else if (target) window.addEventListener('load', function() { window.setTimeout(go, 0); });
        }
    }

    // ------------------------------------------------------------ set-up

    MG.content = { selectTab: selectTab };

    MG.onPage(function(root) {
        initTabs(root);
        initChecklists(root);
        initHeadings(root);
    });
})(window, document);
