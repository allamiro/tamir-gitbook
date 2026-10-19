/* Modern Gradient code blocks: Lines / Wrap / Copy buttons, line splitting,
 * highlighted lines and the terminal legend, on the figure.mg-code markup
 * from lib/code.js (after GitBook's highlight.js pass).
 *
 * Without this script every block is still complete: terminal lines are
 * rendered on the server, and data-wrap works from CSS alone.
 */
(function(window, document) {
    'use strict';

    if (!window.MG || window.MG.code) return;

    var COPIED_MS = 1600;
    var MAX_RANGE = 10000;
    var VOID = /^(?:br|img|wbr|hr|input)$/i;

    // "1,3-5" -> { 1: true, 3: true, 4: true, 5: true }
    function parseRanges(spec) {
        var lines = {};
        String(spec || '').split(',').forEach(function(part) {
            var m = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part);
            if (!m) return;
            var from = parseInt(m[1], 10);
            var to = m[2] ? parseInt(m[2], 10) : from;
            if (to < from || to - from > MAX_RANGE) return;
            for (var n = from; n <= to; n++) lines[n] = true;
        });
        return lines;
    }

    // Split highlighted HTML into lines. Spans that cross a line break are
    // closed at the end of the line and reopened on the next one.
    function splitLines(html) {
        var lines = [];
        var open = [];
        var current = '';
        var tokens = String(html).match(/<[^>]*>|[^<]+|</g) || [];

        function closeAll() {
            for (var i = open.length - 1; i >= 0; i--) current += '</' + open[i].name + '>';
        }
        function reopenAll() {
            for (var i = 0; i < open.length; i++) current += open[i].tag;
        }

        tokens.forEach(function(token) {
            var tag = /^<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>$/.exec(token);
            if (tag) {
                current += token;
                if (tag[1]) {
                    if (open.length) open.pop();
                } else if (!tag[3] && !VOID.test(tag[2])) {
                    open.push({ name: tag[2], tag: token });
                }
                return;
            }
            var parts = token.split('\n');
            for (var i = 0; i < parts.length; i++) {
                if (i > 0) {
                    closeAll();
                    lines.push(current);
                    current = '';
                    reopenAll();
                }
                current += parts[i];
            }
        });
        lines.push(current);

        // The trailing newline every block ends with leaves an empty last line
        if (lines.length > 1 && lines[lines.length - 1].replace(/<[^>]*>/g, '') === '') lines.pop();
        return lines;
    }

    function iconEl(name) {
        var holder = document.createElement('span');
        holder.innerHTML = window.MG.icon(name);
        var svg = holder.firstChild;
        if (svg && svg.setAttribute) {
            svg.setAttribute('class', 'mg-i');
            svg.setAttribute('data-mg-icon', name);
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
        }
        return svg || document.createTextNode('');
    }

    function button(act, label, iconName, pressed) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mg-code-btn';
        btn.setAttribute('data-act', act);
        if (pressed != null) btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        btn.appendChild(iconEl(iconName));
        var text = document.createElement('span');
        text.className = 'mg-lbl';
        text.textContent = label;
        btn.appendChild(text);
        return btn;
    }

    // ------------------------------------------------------------ announcements
    var liveRegion = null;

    function announce(message) {
        if (!liveRegion || !document.body.contains(liveRegion)) {
            liveRegion = document.createElement('div');
            liveRegion.className = 'mg-sr-only';
            liveRegion.setAttribute('role', 'status');
            liveRegion.setAttribute('aria-live', 'polite');
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = '';
        window.setTimeout(function() { liveRegion.textContent = message; }, 50);
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

    // ------------------------------------------------------------ blocks
    function codeText(fig) {
        if (fig.classList.contains('mg-terminal')) {
            var cmds = fig.querySelectorAll('.mg-cmd > code');
            var out = [];
            for (var i = 0; i < cmds.length; i++) out.push(cmds[i].textContent);
            return out.join('\n');
        }
        var code = fig.querySelector('pre > code');
        return code ? code.textContent.replace(/\n$/, '') : '';
    }

    function showCopied(fig, btn) {
        var label = btn.querySelector('.mg-lbl');
        btn.classList.add('mg-copied');
        btn.replaceChild(iconEl('check'), btn.firstChild);
        label.textContent = 'Copied';
        announce(fig.classList.contains('mg-terminal')
            ? 'Commands copied to the clipboard, output left out'
            : 'Code copied to the clipboard');
        window.clearTimeout(btn._mgTimer);
        btn._mgTimer = window.setTimeout(function() {
            btn.classList.remove('mg-copied');
            btn.replaceChild(iconEl('copy'), btn.firstChild);
            label.textContent = 'Copy';
        }, COPIED_MS);
    }

    function onHeadClick(e) {
        var btn = e.target.closest ? e.target.closest('.mg-code-btn') : null;
        if (!btn) return;
        var fig = btn.closest('figure.mg-code');
        var act = btn.getAttribute('data-act');

        if (act === 'copy') {
            copyText(codeText(fig), function(ok) {
                if (ok) showCopied(fig, btn);
                else announce('Copy failed: select the code and copy it by hand');
            });
            return;
        }

        var attr = act === 'wrap' ? 'data-wrap' : 'data-line-numbers';
        var on = fig.getAttribute(attr) !== 'true';
        fig.setAttribute(attr, on ? 'true' : 'false');
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    function setup(fig) {
        if (fig.getAttribute('data-mg-ready')) return;
        var pre = fig.querySelector('pre');
        var head = fig.querySelector('.mg-code-head');
        if (!pre || !head) return;
        fig.setAttribute('data-mg-ready', 'true');

        var terminal = fig.classList.contains('mg-terminal');
        var holder = pre;
        if (!terminal) {
            holder = pre.querySelector('code') || pre;
            holder.innerHTML = splitLines(holder.innerHTML).map(function(line) {
                return '<span class="mg-ln">' + line + '\n</span>';
            }).join('');
        }

        var hl = parseRanges(fig.getAttribute('data-highlight'));
        var lines = holder.children;
        var hasOutput = false;
        for (var i = 0; i < lines.length; i++) {
            if (!lines[i].classList.contains('mg-ln')) continue;
            lines[i].setAttribute('data-n', String(i + 1));
            if (hl[i + 1]) lines[i].classList.add('hl');
            if (lines[i].classList.contains('mg-out')) hasOutput = true;
        }

        var title = head.querySelector('.mg-code-title');
        if (title) title.insertBefore(iconEl(terminal ? 'terminal' : 'file'), title.firstChild);

        var actions = document.createElement('span');
        actions.className = 'mg-code-actions';
        var lineBtn = button('lines', 'Lines', 'numbers', fig.getAttribute('data-line-numbers') === 'true');
        lineBtn.title = 'Line numbers';
        var wrapBtn = button('wrap', 'Wrap', 'wrap', fig.getAttribute('data-wrap') === 'true');
        wrapBtn.title = 'Wrap long lines';
        var copyBtn = button('copy', 'Copy', 'copy', null);
        copyBtn.title = terminal ? 'Copy commands' : 'Copy code';
        copyBtn.setAttribute('aria-label', copyBtn.title);
        actions.appendChild(lineBtn);
        actions.appendChild(wrapBtn);
        actions.appendChild(copyBtn);
        head.appendChild(actions);
        head.addEventListener('click', onHeadClick);

        if (terminal && hasOutput) {
            var foot = document.createElement('div');
            foot.className = 'mg-code-foot';
            foot.innerHTML =
                '<span><i class="mg-key mg-key-cmd" aria-hidden="true"></i>$ command — copied</span>' +
                '<span><i class="mg-key mg-key-out" aria-hidden="true"></i>output — not copied</span>';
            fig.appendChild(foot);
        }
    }

    window.MG.code = { splitLines: splitLines, parseRanges: parseRanges };

    window.MG.onPage(function(root) {
        var figures = root.querySelectorAll('figure.mg-code');
        for (var i = 0; i < figures.length; i++) setup(figures[i]);
    });
})(window, document);
