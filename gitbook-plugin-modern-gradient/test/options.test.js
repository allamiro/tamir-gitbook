'use strict';

require('should');
var readOptions = require('../lib/options').readOptions;

describe('readOptions', function() {
    it('defaults to premium-developer with both variant classes', function() {
        var opts = readOptions({});
        opts.variant.should.equal('premium-developer');
        opts.variantClasses.should.equal('mg-v-premium mg-v-dev');
        opts.editUrl.should.equal('');
    });

    it('accepts a missing config object', function() {
        readOptions(undefined).variant.should.equal('premium-developer');
        readOptions(null).variantClasses.should.equal('mg-v-premium mg-v-dev');
    });

    it('maps each variant to its root classes', function() {
        readOptions({ variant: 'premium' }).variantClasses.should.equal('mg-v-premium');
        readOptions({ variant: 'developer' }).variantClasses.should.equal('mg-v-dev');
        readOptions({ variant: 'minimal' }).variantClasses.should.equal('');
        readOptions({ variant: 'premium-developer' }).variantClasses.should.equal('mg-v-premium mg-v-dev');
    });

    it('falls back to the default variant for unknown values', function() {
        readOptions({ variant: 'bogus' }).variant.should.equal('premium-developer');
        readOptions({ variant: 'bogus' }).variantClasses.should.equal('mg-v-premium mg-v-dev');
        readOptions({ variant: 42 }).variant.should.equal('premium-developer');
    });

    it('keeps only http(s) edit URLs', function() {
        readOptions({ editUrl: 'javascript:x' }).editUrl.should.equal('');
        readOptions({ editUrl: 'data:text/html,x' }).editUrl.should.equal('');
        readOptions({ editUrl: ' https://github.com/me/book/edit/main/ ' }).editUrl
            .should.equal('https://github.com/me/book/edit/main/');
    });
});
