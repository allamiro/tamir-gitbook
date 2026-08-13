var fs = require('fs');
var os = require('os');
var path = require('path');
var should = require('should');

var shim = require('../lib/engine-npm-shim');

// The shim's real API (load/view/install) is what the engine calls, and it is
// where the bugs have been. Substituting the npm runner lets all of it be
// exercised offline, with the exact output shapes npm 6, 9 and 12 produce.
function withRunner(handler, body) {
    var calls = [];

    shim._setRunner(function(args, options, callback) {
        calls.push({args: args, options: options});
        handler(args, options, callback);
    });

    try {
        body(calls);
    } finally {
        shim._setRunner(null);
    }
}

function removeTree(target) {
    if (fs.rmSync) return fs.rmSync(target, {recursive: true, force: true});
    if (!fs.existsSync(target)) return;
    if (fs.lstatSync(target).isDirectory()) {
        fs.readdirSync(target).forEach(function(e) {
            removeTree(path.join(target, e));
        });
        fs.rmdirSync(target);
    } else {
        fs.unlinkSync(target);
    }
}

describe('Engine npm shim — API surface', function() {

    describe('.load()', function() {
        it('should resolve the npm version without blocking on a sync spawn', function(done) {
            withRunner(function(args, options, callback) {
                args.should.eql(['--version']);
                callback(null, '12.0.2\n');
            }, function() {
                shim.load({}, function(err) {
                    should(err).be.null();
                    shim.version.should.equal('12.0.2');
                    done();
                });
            });
        });

        it('should survive an npm that cannot report its version', function(done) {
            withRunner(function(args, options, callback) {
                callback(new Error('npm missing'));
            }, function() {
                shim.load({}, function(err) {
                    should(err).be.null();
                    shim.version.should.equal('system');
                    done();
                });
            });
        });

        it('should record the prefix it was loaded with', function(done) {
            withRunner(function(args, options, callback) {
                callback(null, '9.0.0');
            }, function() {
                shim.load({prefix: '/books/mine'}, function() {
                    shim.prefix.should.equal('/books/mine');
                    done();
                });
            });
        });
    });

    describe('.commands.view()', function() {
        it('should widen the engine default range before asking npm', function(done) {
            withRunner(function(args, options, callback) {
                args.should.eql(['view', 'gitbook-plugin-ga@>=0.0.0', '--json']);
                callback(null, JSON.stringify([
                    {version: '1.0.1', engines: {gitbook: '>=2.5.1'}},
                    {version: '2.0.0', engines: {gitbook: '>=4.0.0-alpha.0'}}
                ]));
            }, function() {
                shim.commands.view(['gitbook-plugin-ga@*', 'engines'], true,
                function(err, result) {
                    should(err).be.null();
                    // The engine needs every version to choose a compatible one
                    Object.keys(result).should.eql(['1.0.1', '2.0.0']);
                    result['1.0.1'].engines.gitbook.should.equal('>=2.5.1');
                    done();
                });
            });
        });

        it('should request whole manifests, never named fields', function(done) {
            withRunner(function(args, options, callback) {
                // npm drops named fields entirely when any matching version
                // lacks one, which silently loses the engines data
                args.should.not.containEql('engines');
                args.should.containEql('--json');
                callback(null, JSON.stringify({version: '1.0.0'}));
            }, function() {
                shim.commands.view(['pkg@1.0.0', 'engines'], true, function() {
                    done();
                });
            });
        });

        it('should key a single-version answer by its version', function(done) {
            withRunner(function(args, options, callback) {
                callback(null, JSON.stringify({version: '2.2.1', engines: {gitbook: '>=3.0.0'}}));
            }, function() {
                shim.commands.view(['pkg'], true, function(err, result) {
                    Object.keys(result).should.eql(['2.2.1']);
                    done();
                });
            });
        });

        it('should surface npm failures instead of throwing', function(done) {
            withRunner(function(args, options, callback) {
                callback(new Error('E404 not found'));
            }, function() {
                shim.commands.view(['nope@*'], true, function(err) {
                    should.exist(err);
                    err.message.should.containEql('E404');
                    done();
                });
            });
        });

        it('should report unparseable npm output as an error', function(done) {
            withRunner(function(args, options, callback) {
                callback(null, 'not json at all');
            }, function() {
                shim.commands.view(['pkg@1.0.0'], true, function(err) {
                    should.exist(err);
                    done();
                });
            });
        });
    });

    describe('.commands.install()', function() {
        var book;

        beforeEach(function() {
            book = fs.mkdtempSync(path.join(os.tmpdir(), 'gitbook-book-test-'));
            fs.mkdirSync(path.join(book, 'node_modules'), {recursive: true});
        });

        afterEach(function() {
            removeTree(book);
        });

        it('should install each plugin via a scratch prefix and copy it in', function(done) {
            withRunner(function(args, options, callback) {
                if (args[0] === '--version') return callback(null, '12.0.2');

                // Simulate npm populating the scratch prefix
                var prefix = args[args.indexOf('--prefix') + 1];
                var pkgDir = path.join(prefix, 'node_modules', 'gitbook-plugin-x');
                fs.mkdirSync(pkgDir, {recursive: true});
                fs.writeFileSync(path.join(pkgDir, 'package.json'),
                    JSON.stringify({name: 'gitbook-plugin-x', version: '1.0.0'}));
                callback(null, '');
            }, function() {
                shim.commands.install(book, ['gitbook-plugin-x@1.0.0'], function(err) {
                    should(err).be.null();
                    fs.existsSync(path.join(book, 'node_modules', 'gitbook-plugin-x'))
                        .should.be.true();
                    done();
                });
            });
        });

        it('should keep earlier plugins when a later one is installed', function(done) {
            // Installing straight into the book made npm prune the previous
            // plugins as extraneous, so only the last one survived
            var installed = 0;

            withRunner(function(args, options, callback) {
                if (args[0] === '--version') return callback(null, '12.0.2');

                var prefix = args[args.indexOf('--prefix') + 1];
                var name = 'gitbook-plugin-' + (installed === 0 ? 'first' : 'second');
                installed++;
                var pkgDir = path.join(prefix, 'node_modules', name);
                fs.mkdirSync(pkgDir, {recursive: true});
                fs.writeFileSync(path.join(pkgDir, 'package.json'),
                    JSON.stringify({name: name, version: '1.0.0'}));
                callback(null, '');
            }, function() {
                shim.commands.install(book,
                    ['gitbook-plugin-first@1.0.0', 'gitbook-plugin-second@1.0.0'],
                function(err) {
                    should(err).be.null();
                    var present = fs.readdirSync(path.join(book, 'node_modules'));
                    present.should.containEql('gitbook-plugin-first');
                    present.should.containEql('gitbook-plugin-second');
                    done();
                });
            });
        });

        it('should run npm in the book directory so its .npmrc applies', function(done) {
            withRunner(function(args, options, callback) {
                if (args[0] === '--version') return callback(null, '12.0.2');
                options.cwd.should.equal(book);

                var prefix = args[args.indexOf('--prefix') + 1];
                fs.mkdirSync(path.join(prefix, 'node_modules'), {recursive: true});
                callback(null, '');
            }, function() {
                shim.commands.install(book, ['gitbook-plugin-x@1.0.0'], function() {
                    done();
                });
            });
        });

        it('should not destroy the installed plugin when npm fails', function(done) {
            var target = path.join(book, 'node_modules', 'gitbook-plugin-x');
            fs.mkdirSync(target, {recursive: true});
            fs.writeFileSync(path.join(target, 'marker'), 'original');

            withRunner(function(args, options, callback) {
                if (args[0] === '--version') return callback(null, '12.0.2');
                callback(new Error('ENOSPC'));
            }, function() {
                shim.commands.install(book, ['gitbook-plugin-x@1.0.0'], function(err) {
                    should.exist(err);
                    fs.readFileSync(path.join(target, 'marker'), 'utf8')
                        .should.equal('original');
                    done();
                });
            });
        });

        it('should leave no scratch directory behind after a failure', function(done) {
            var before = fs.readdirSync(os.tmpdir())
                .filter(function(e) { return e.indexOf('gitbook-plugin-') === 0; }).length;

            withRunner(function(args, options, callback) {
                if (args[0] === '--version') return callback(null, '12.0.2');
                callback(new Error('boom'));
            }, function() {
                shim.commands.install(book, ['gitbook-plugin-x@1.0.0'], function() {
                    var after = fs.readdirSync(os.tmpdir())
                        .filter(function(e) { return e.indexOf('gitbook-plugin-') === 0; }).length;
                    after.should.equal(before);
                    done();
                });
            });
        });
    });

    describe('npm flag selection', function() {
        it('should use the modern shallow-install flag on npm 9+', function() {
            shim._setNpmVersion('12.0.2');
            shim._shallowInstallFlag().should.equal('--install-strategy=shallow');
        });

        it('should use --global-style on npm 6', function() {
            shim._setNpmVersion('6.14.18');
            shim._shallowInstallFlag().should.equal('--global-style');
        });

        it('should assume a modern npm when the version is unknown', function() {
            // npm 6-8 ignore the modern flag; npm 10+ rejects the old one
            shim._setNpmVersion('system');
            shim._shallowInstallFlag().should.equal('--install-strategy=shallow');
        });
    });

    describe('npm executable resolution', function() {
        it('should never use a shell, so specs cannot be interpreted as commands', function() {
            var npm = shim._resolveNpm();
            npm.should.have.property('file');
            npm.should.have.property('prefixArgs');
            // On POSIX this is plain "npm"; on Windows it must be a .js entry
            // point run by node, because execFile cannot launch npm.cmd
            if (process.platform === 'win32') {
                (npm.file === process.execPath || npm.file === 'npm.cmd').should.be.true();
            } else {
                npm.file.should.equal('npm');
            }
        });
    });
});
