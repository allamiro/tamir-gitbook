'use strict';

require('should');
var icons = require('../lib/icons');

// The icon names the spec promises authors (home cards, front matter `icon:`)
var SPEC_ICONS = ['rocket', 'book', 'sliders', 'code', 'terminal', 'wrench', 'shield',
    'server', 'database', 'cloud', 'palette', 'file', 'sparkle', 'alert', 'layers', 'git'];

// Icons the theme chrome uses (from the approved mockup)
var UI_ICONS = ['search', 'menu', 'moon', 'sun', 'focus', 'chevron', 'chevron-right',
    'chevron-left', 'arrow-right', 'arrow-up', 'copy', 'check', 'wrap', 'numbers', 'link',
    'info', 'bulb', 'danger', 'clock', 'signal', 'calendar', 'folder', 'pencil', 'list',
    'linux', 'apple', 'windows'];

describe('icons', function() {
    it('renders an inline, decorative svg', function() {
        var svg = icons.icon('rocket');
        svg.indexOf('<svg').should.equal(0);
        svg.should.containEql('aria-hidden="true"');
        svg.should.containEql('focusable="false"');
        svg.should.endWith('</svg>');
    });

    it('falls back to the file icon for unknown names', function() {
        icons.icon('nope').should.equal(icons.icon('file'));
        icons.icon().should.equal(icons.icon('file'));
        icons.icon('__proto__').should.equal(icons.icon('file'));
        icons.icon('constructor').should.equal(icons.icon('file'));
    });

    it('has every icon named in the spec', function() {
        SPEC_ICONS.forEach(function(name) {
            icons.ICONS.should.have.property(name);
            icons.has(name).should.equal(true, name);
        });
    });

    it('has every UI icon from the mockup', function() {
        UI_ICONS.forEach(function(name) {
            icons.has(name).should.equal(true, name);
        });
    });

    it('reports unknown names', function() {
        icons.has('nope').should.equal(false);
        icons.has('toString').should.equal(false);
    });

    it('is the same module the browser loads', function() {
        require('../assets/js/mg-icons.js').should.equal(icons);
    });
});
