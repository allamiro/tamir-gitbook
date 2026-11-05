'use strict';

require('should');
var escape = require('../lib/escape');

describe('escapeHtml', function() {
    it('escapes the five HTML-significant characters', function() {
        escape.escapeHtml('<a href="x">&\'').should.equal('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
    });

    it('turns null and undefined into an empty string', function() {
        escape.escapeHtml(null).should.equal('');
        escape.escapeHtml(undefined).should.equal('');
        escape.escapeHtml(5).should.equal('5');
    });
});

describe('safeUrl', function() {
    it('allows http and https only', function() {
        escape.safeUrl('https://example.com/a').should.equal('https://example.com/a');
        escape.safeUrl('HTTP://example.com').should.equal('HTTP://example.com');
        escape.safeUrl('javascript:alert(1)').should.equal('');
        escape.safeUrl(' javascript:alert(1)').should.equal('');
        escape.safeUrl('//evil.example').should.equal('');
        escape.safeUrl(null).should.equal('');
    });
});
