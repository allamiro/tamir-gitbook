// system-npm shim — installed into a fetched GitBook engine in place of the
// npm it bundles (see lib/patches.js).
//
// The engine uses npm's programmatic API in exactly two places
// (lib/plugins/resolveVersion.js and node_modules/npmi), an API npm removed
// in v8 — so on any modern Node the bundled npm crashes and plugins cannot be
// installed. This module implements just that surface on top of spawning the
// system npm, which keeps plugin installation working on current npm and
// drops ~40 MB of frozen, unmaintained npm from every engine install.
//
// Written in ES5 against Node 10 APIs so it runs everywhere the CLI does.
var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

var NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';
var cachedVersion = null;

function systemNpmVersion() {
    if (cachedVersion === null) {
        try {
            cachedVersion = String(childProcess.execFileSync(
                NPM_BIN, ['--version'], {encoding: 'utf8'}
            )).trim();
        } catch (e) {
            cachedVersion = 'system';
        }
    }
    return cachedVersion;
}

// npm 9 renamed --global-style to --install-strategy=shallow and npm 10
// dropped the old flag, so pick whichever this npm understands.
function shallowInstallFlag() {
    var major = parseInt(systemNpmVersion(), 10);
    return (isNaN(major) || major >= 9) ? '--install-strategy=shallow'
                                        : '--global-style';
}

function run(args, callback) {
    childProcess.execFile(NPM_BIN, args, {
        maxBuffer: 32 * 1024 * 1024,
        env: process.env
    }, function(err, stdout, stderr) {
        if (err) {
            err.message = 'npm ' + args.join(' ') + ' failed: ' +
                (stderr || err.message);
            return callback(err);
        }
        callback(null, stdout);
    });
}

function copyPackage(source, target) {
    removeTree(target);
    copyTree(source, target);
}

function copyTree(source, target) {
    fs.mkdirSync(target, {recursive: true});

    fs.readdirSync(source).forEach(function(entry) {
        var from = path.join(source, entry);
        var to = path.join(target, entry);
        var stat = fs.lstatSync(from);

        if (stat.isDirectory()) {
            copyTree(from, to);
        } else if (stat.isSymbolicLink()) {
            try {
                fs.symlinkSync(fs.readlinkSync(from), to);
            } catch (e) { /* skip unresolvable links */ }
        } else {
            fs.copyFileSync(from, to);
        }
    });
}

function removeTree(target) {
    if (fs.rmSync) {
        try {
            fs.rmSync(target, {recursive: true, force: true});
        } catch (e) { /* already gone */ }
        return;
    }

    // Node < 14 has no fs.rmSync, and fs.rmdirSync's recursive option only
    // arrived in 12.10 — recurse by hand so this works back to Node 10.
    var stat;
    try {
        stat = fs.lstatSync(target);
    } catch (e) {
        return; // nothing there
    }

    if (stat.isDirectory()) {
        fs.readdirSync(target).forEach(function(entry) {
            removeTree(path.join(target, entry));
        });
        try { fs.rmdirSync(target); } catch (e) { /* not empty; leave it */ }
    } else {
        try { fs.unlinkSync(target); } catch (e) { /* already gone */ }
    }
}

// The engine asks for a plugin's whole version history so it can pick the
// newest release compatible with itself, and expresses "any version" as the
// range '*' (PluginDependency's default). The npm CLI special-cases a bare
// '*' as the 'latest' dist-tag and prints that single version, so the engine
// would only ever see the newest release — and plugins whose latest release
// targets GitBook 4 would become uninstallable. An explicit '>=0.0.0' range
// makes npm list every published version, matching what the programmatic API
// used to return (prereleases stay excluded, as they were before).
// A spec with no range is left alone: npmi asks for view([name]) precisely
// when it wants the latest version only.
function widenRange(spec) {
    var at = String(spec).lastIndexOf('@');
    if (at <= 0) return spec;

    var range = spec.slice(at + 1);
    if (range === '*' || range === '') return spec.slice(0, at) + '@>=0.0.0';

    return spec;
}

// `npm view <spec> --json` answers in three shapes:
// one object when a single version matches, an array of objects when several
// do, and a bare version string when the extra fields hold no data. Fold all
// three into the version-keyed map the engine expects.
function normalizeView(parsed) {
    var entries = Array.isArray(parsed) ? parsed : [parsed];
    var result = {};

    entries.forEach(function(entry) {
        if (!entry) return;
        if (typeof entry === 'string') {
            result[entry] = {};
            return;
        }
        if (!entry.version) return;
        result[entry.version] = entry;
    });

    return result;
}

var npm = {
    prefix: process.cwd(),

    load: function(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (options && options.prefix) npm.prefix = options.prefix;
        process.nextTick(function() {
            callback(null, npm);
        });
    },

    commands: {
        // install(where, [specs], cb) — installs into <where>/node_modules
        install: function(where, specs, callback) {
            if (typeof where !== 'string') {
                callback = specs;
                specs = where;
                where = npm.prefix;
            }
            if (typeof specs === 'function') {
                callback = specs;
                specs = [];
            }

            // No spec: a plain "npm install" against an existing package.json
            if (!specs || specs.length === 0) {
                return run([
                    'install', '--prefix', where,
                    '--no-audit', '--no-fund', '--loglevel', 'error'
                ], function(err) {
                    callback(err);
                });
            }

            // Install each package into a scratch prefix and copy the result
            // in. Installing straight into the book would make npm treat the
            // previously installed plugins as extraneous (they are not in a
            // package.json) and delete them, so only the last plugin would
            // survive. A shallow install keeps each package self-contained,
            // so copying its folder is enough.
            var remaining = specs.slice();

            function next(err) {
                if (err) return callback(err);
                if (remaining.length === 0) return callback(null);

                var spec = remaining.shift();
                var scratch = fs.mkdtempSync(
                    path.join(os.tmpdir(), 'gitbook-plugin-')
                );

                run([
                    'install', spec,
                    '--prefix', scratch,
                    shallowInstallFlag(),
                    '--no-save', '--no-audit', '--no-fund',
                    '--no-package-lock', '--loglevel', 'error'
                ], function(installErr) {
                    if (installErr) {
                        removeTree(scratch);
                        return callback(installErr);
                    }

                    var source = path.join(scratch, 'node_modules');
                    var target = path.join(where, 'node_modules');

                    try {
                        fs.readdirSync(source)
                        .filter(function(entry) {
                            return entry.charAt(0) !== '.';
                        })
                        .forEach(function(name) {
                            // Scoped packages nest one level deeper
                            if (name.charAt(0) === '@') {
                                fs.readdirSync(path.join(source, name))
                                .forEach(function(scoped) {
                                    copyPackage(
                                        path.join(source, name, scoped),
                                        path.join(target, name, scoped)
                                    );
                                });
                            } else {
                                copyPackage(
                                    path.join(source, name),
                                    path.join(target, name)
                                );
                            }
                        });
                    } catch (copyErr) {
                        removeTree(scratch);
                        return callback(copyErr);
                    }

                    removeTree(scratch);
                    next(null);
                });
            }

            next(null);
        },

        // view([spec, field...], silent, cb) — resolves to a map keyed by
        // version, matching what the programmatic API returned:
        //   { "2.2.1": { engines: { gitbook: ">=3.0.0" } }, ... }
        view: function(args, silent, callback) {
            if (typeof silent === 'function') callback = silent;

            var spec = widenRange(args[0]);

            // Ask for whole manifests rather than named fields. npm drops the
            // requested fields entirely when any matching version lacks one
            // (returning bare version strings instead), which would silently
            // lose the engines data the engine resolves plugins with.
            run(['view', spec, '--json'],
            function(err, stdout) {
                if (err) return callback(err);

                var parsed;
                try {
                    parsed = JSON.parse(stdout);
                } catch (e) {
                    return callback(e);
                }

                callback(null, normalizeView(parsed));
            });
        }
    }
};

// Reported in the engine's "installing N plugins using npm@X" log line
Object.defineProperty(npm, 'version', {
    enumerable: true,
    get: systemNpmVersion
});

// Exposed for the unit tests; the engine only ever uses the npm API above.
npm._normalizeView = normalizeView;
npm._widenRange = widenRange;

module.exports = npm;
