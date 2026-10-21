/* Modern Gradient icon set: the single source for server and browser.
 * Node: require('.../mg-icons.js'); browser: window.MGIcons.
 * 24px stroke icons drawn in currentColor, decorative (aria-hidden): the
 * control that holds an icon carries the accessible name.
 */
(function(root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.MGIcons = api;
    }
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    function svg(d) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
            d + '</svg>';
    }

    var PATHS = {
        // ---- content icons (listed in the README; usable from front matter)
        'rocket': '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M14.5 4.5c2.5-1 5-1 5-1s0 2.5-1 5L12 15l-3-3z"/><path d="M9 12 6 11l3-4h4M12 15l1 3 4-3v-4"/>',
        'book': '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
        'sliders': '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
        'code': '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
        'terminal': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
        'wrench': '<path d="M14.5 6.5a4 4 0 0 0 5 5L13 18l-3 3-4-4 3-3 6.5-6.5a4 4 0 0 0-1-1z"/>',
        'shield': '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
        'server': '<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7.5 7.5h.01M7.5 16.5h.01"/>',
        'database': '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13"/><path d="M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
        'cloud': '<path d="M7 18.5h10a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 7.1 9.2 4.5 4.5 0 0 0 7 18.5z"/>',
        'palette': '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.9-.8-1.4-.8-2.3 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
        'file': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
        'sparkle': '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
        'alert': '<path d="M12 3 2.5 19.5h19z"/><path d="M12 10v4M12 17h.01"/>',
        'layers': '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
        'git': '<circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="8" r="2.2"/><path d="M6 8.2v7.6M18 10.2c0 4-6 3-11 5.6"/>',

        // ---- interface icons (from the approved mockup)
        'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
        'close': '<path d="M6 6l12 12M18 6 6 18"/>',
        'moon': '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
        'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        'focus': '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>',
        'chevron': '<path d="m6 9 6 6 6-6"/>',
        'chevron-right': '<path d="m9 6 6 6-6 6"/>',
        'chevron-left': '<path d="m15 6-6 6 6 6"/>',
        'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
        'copy': '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
        'check': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        'wrap': '<path d="M4 6h16M4 12h13a3 3 0 0 1 0 6h-4"/><path d="m14 15-3 3 3 3"/><path d="M4 18h5"/>',
        'numbers': '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 5h1.5v4M3.5 9h3M3.5 14.5c0-1 2.5-1 2.5.3 0 1-2.5 2-2.5 3.2h3"/>',
        'link': '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
        'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
        'bulb': '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>',
        'danger': '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16h.01"/>',
        'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'signal': '<path d="M5 20v-4M12 20V10M19 20V4"/>',
        'calendar': '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
        'folder': '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        'pencil': '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
        'list': '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
        'linux': '<path d="M12 3c-2 0-3 1.8-3 4 0 1.5-.5 2.5-1.5 4S5 14 6 16.5c-1 .5-1.5 1.5-1 2.5s3 1 4.5 1.5c1 .3 1.5.5 2.5.5s1.5-.2 2.5-.5c1.5-.5 4-.5 4.5-1.5s0-2-1-2.5c1-2.5-.5-4-1.5-5.5S15 8.5 15 7c0-2.2-1-4-3-4z"/>',
        'apple': '<path d="M16 3c-1 .2-2.3 1-2.7 2.3M12 7c-1-.6-2-.9-3-.9C6.5 6.1 5 8.2 5 11c0 4 2.6 9 5 9 .8 0 1.3-.5 2-.5s1.2.5 2 .5c2.2 0 4.2-3.8 4.6-5.5-1.5-.6-2.6-2-2.6-3.8 0-1.6.9-2.9 2.2-3.5C17.6 6.4 16.3 6 15 6c-1 0-2 .5-3 1z"/>',
        'windows': '<path d="M3 5.5 10.5 4.5v7H3zM13 4.2 21 3v8.5h-8zM3 13h7.5v6.5L3 18.5zM13 13h8v8l-8-1.2z"/>'
    };

    var ICONS = {};
    Object.keys(PATHS).forEach(function(name) {
        ICONS[name] = svg(PATHS[name]);
    });

    function has(name) {
        return typeof name === 'string' && Object.prototype.hasOwnProperty.call(ICONS, name);
    }

    // Unknown names fall back to the generic file icon
    function icon(name) {
        return has(name) ? ICONS[name] : ICONS.file;
    }

    return {
        ICONS: ICONS,
        icon: icon,
        has: has
    };
}));
