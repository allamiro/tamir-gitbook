var fs = require('fs');
var os = require('os');
var path = require('path');
var should = require('should');

var patches = require('../lib/patches');
var shim = require('../lib/engine-npm-shim');

// Build a throwaway directory that looks like a freshly fetched engine:
// the bits the patches care about (send, npm, npmi) and nothing else.
function fakeEngine() {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'gitbook-engine-test-'));

    var sendDir = path.join(root, 'node_modules', 'send');
    fs.mkdirSync(sendDir, {recursive: true});
    fs.writeFileSync(path.join(sendDir, 'index.js'),
        'SendStream.prototype.isFresh = function(){\n' +
        '  return fresh(this.req.headers, this.res._headers);\n' +
        '};\n');

    var npmDir = path.join(root, 'node_modules', 'npm');
    fs.mkdirSync(path.join(npmDir, 'lib'), {recursive: true});
    fs.writeFileSync(path.join(npmDir, 'package.json'),
        JSON.stringify({name: 'npm', version: '3.9.2', main: './lib/npm.js'}));
    fs.writeFileSync(path.join(npmDir, 'lib', 'npm.js'), 'module.exports = {};\n');

    var npmiDir = path.join(root, 'node_modules', 'npmi');
    fs.mkdirSync(npmiDir, {recursive: true});
    fs.writeFileSync(path.join(npmiDir, 'npmi.js'), "var npm = require('npm');\n");

    return root;
}

function removeTree(target) {
    if (fs.rmSync) return fs.rmSync(target, {recursive: true, force: true});
    if (!fs.existsSync(target)) return;
    if (fs.lstatSync(target).isDirectory()) {
        fs.readdirSync(target).forEach(function(entry) {
            removeTree(path.join(target, entry));
        });
        fs.rmdirSync(target);
    } else {
        fs.unlinkSync(target);
    }
}

describe('Engine patches', function() {
    var root;

    beforeEach(function() {
        root = fakeEngine();
    });

    afterEach(function() {
        removeTree(root);
    });

    describe('send header API', function() {
        it('should stop reading the removed res._headers property', function() {
            patches.apply(root);

            var patched = fs.readFileSync(
                path.join(root, 'node_modules/send/index.js'), 'utf8'
            );
            patched.should.containEql('getHeaders');
            patched.should.not.containEql('this.res._headers)');
        });

        it('should leave an already patched file untouched', function() {
            patches.apply(root);
            var once = fs.readFileSync(
                path.join(root, 'node_modules/send/index.js'), 'utf8'
            );

            patches.apply(root);
            var twice = fs.readFileSync(
                path.join(root, 'node_modules/send/index.js'), 'utf8'
            );

            twice.should.equal(once);
        });
    });

    describe('npm shim', function() {
        it('should replace the bundled npm with the shim', function() {
            patches.apply(root);

            var pkg = JSON.parse(fs.readFileSync(
                path.join(root, 'node_modules/npm/package.json'), 'utf8'
            ));
            pkg.name.should.equal('gitbook-npm-shim');
            pkg.main.should.equal('index.js');

            fs.readFileSync(
                path.join(root, 'node_modules/npm/index.js'), 'utf8'
            ).should.containEql('system-npm shim');
        });

        it('should remove the bundled npm tree rather than merge with it', function() {
            patches.apply(root);
            fs.existsSync(path.join(root, 'node_modules/npm/lib/npm.js'))
                .should.be.false();
        });

        it('should re-shim when a real npm reappears next to a stale index.js', function() {
            patches.apply(root);

            // Simulate what re-fetching an engine used to do: the real npm
            // copied back over the shim, leaving the shim's index.js behind
            fs.writeFileSync(
                path.join(root, 'node_modules/npm/package.json'),
                JSON.stringify({name: 'npm', version: '3.9.2'})
            );

            patches.apply(root);

            JSON.parse(fs.readFileSync(
                path.join(root, 'node_modules/npm/package.json'), 'utf8'
            )).name.should.equal('gitbook-npm-shim');
        });

        it('should do nothing when the engine has no npmi to satisfy', function() {
            removeTree(path.join(root, 'node_modules/npmi'));
            patches.apply(root);

            JSON.parse(fs.readFileSync(
                path.join(root, 'node_modules/npm/package.json'), 'utf8'
            )).name.should.equal('npm');
        });
    });
});

describe('Engine npm shim', function() {
    describe('.view() range widening', function() {
        var widen = shim._widenRange;

        it('should expand the engine default "*" so npm lists every version', function() {
            // npm treats a bare '*' as the 'latest' dist-tag and prints only
            // that version, which hid every older release from the engine
            widen('gitbook-plugin-ga@*').should.equal('gitbook-plugin-ga@>=0.0.0');
        });

        it('should expand an empty range too', function() {
            widen('gitbook-plugin-ga@').should.equal('gitbook-plugin-ga@>=0.0.0');
        });

        it('should leave a bare package name alone', function() {
            // npmi asks for view([name]) exactly when it wants only the latest
            widen('gitbook-plugin-ga').should.equal('gitbook-plugin-ga');
        });

        it('should leave an explicit version or range alone', function() {
            widen('gitbook-plugin-ga@1.0.1').should.equal('gitbook-plugin-ga@1.0.1');
            widen('gitbook-plugin-ga@>=2.0.0').should.equal('gitbook-plugin-ga@>=2.0.0');
        });

        it('should not mistake a scope for a range', function() {
            widen('@scope/pkg').should.equal('@scope/pkg');
            widen('@scope/pkg@*').should.equal('@scope/pkg@>=0.0.0');
        });
    });

    describe('.view() output normalization', function() {
        var normalize = shim._normalizeView;

        it('should key a single matching version by its version', function() {
            normalize({version: '2.2.1', engines: {gitbook: '>=3.0.0'}})
                .should.eql({'2.2.1': {version: '2.2.1', engines: {gitbook: '>=3.0.0'}}});
        });

        it('should key every version when several match', function() {
            var result = normalize([
                {version: '2.0.0', engines: {gitbook: '>=3.0.0'}},
                {version: '2.2.1', engines: {gitbook: '>=3.1.0'}}
            ]);

            Object.keys(result).should.eql(['2.0.0', '2.2.1']);
            result['2.2.1'].engines.gitbook.should.equal('>=3.1.0');
        });

        it('should accept the bare version string npm returns with no field data', function() {
            normalize('4.17.21').should.eql({'4.17.21': {}});
        });

        it('should skip entries without a version instead of throwing', function() {
            normalize([null, {engines: {}}, {version: '1.0.0'}])
                .should.eql({'1.0.0': {version: '1.0.0'}});
        });
    });
});
