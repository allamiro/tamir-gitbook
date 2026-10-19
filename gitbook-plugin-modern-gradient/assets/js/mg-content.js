/* Modern Gradient content: tabs and checklists on the markup from
 * lib/blocks.js and lib/callouts.js.
 *
 * Tabs: click, Left/Right/Home/End with a roving tabindex. Choosing a tab
 * selects it in every .mg-tabs with the same data-sync on the page and is
 * remembered (MG.store "tab:<data-sync>") for later pages and visits.
 * Checklists: the server renders disabled boxes (read-only without
 * JavaScript); here they become usable, with an "N of M done" header.
 * Ticks last for the page load only.
 *
 * Listeners are delegated on document and registered once; the per-page
 * set-up runs through MG.onPage.
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

    // ------------------------------------------------------------ set-up

    MG.content = { selectTab: selectTab };

    MG.onPage(function(root) {
        initTabs(root);
        initChecklists(root);
    });
})(window, document);
