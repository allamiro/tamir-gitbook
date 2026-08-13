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

var cachedVersion = null;
var cachedNpm = null;
var runner = null;
var scratchDirs = [];
var exitHookInstalled = false;

// ---------------------------------------------------------------------------
// Running npm
// ---------------------------------------------------------------------------

// On Windows the npm launcher is npm.cmd, and modern Node refuses to
// execFile a .cmd file (EINVAL). Run npm's own JS entry point with the
// current node binary instead: no shell is involved, so user-controlled
// package specs can never be interpreted as shell syntax.
function resolveNpm() {
    if (cachedNpm) return cachedNpm;

    if (process.platform !== 'win32') {
        cachedNpm = {file: 'npm', prefixArgs: []};
        return cachedNpm;
    }

    var candidates = [];
    if (process.env.npm_execpath) candidates.push(process.env.npm_execpath);
    candidates.push(path.join(path.dirname(process.execPath),
        'node_modules', 'npm', 'bin', 'npm-cli.js'));

    for (var i = 0; i < candidates.length; i++) {
        try {
            if (candidates[i] && /\.js$/i.test(candidates[i]) &&
                fs.existsSync(candidates[i])) {
                cachedNpm = {file: process.execPath, prefixArgs: [candidates[i]]};
                return cachedNpm;
            }
        } catch (e) { /* try the next candidate */ }
    }

    // Last resort. execFile may reject this on current Node, but failing with
    // npm's own error is better than failing silently.
    cachedNpm = {file: 'npm.cmd', prefixArgs: []};
    return cachedNpm;
}

// options.cwd matters: npm discovers the project .npmrc (private registry,
// auth token, proxy) relative to the working directory, so commands run where
// the user's configuration lives rather than in a scratch prefix.
function run(args, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    options = options || {};

    if (runner) return runner(args, options, callback);

    var npm = resolveNpm();

    childProcess.execFile(npm.file, npm.prefixArgs.concat(args), {
        maxBuffer: 64 * 1024 * 1024,
        env: process.env,
        cwd: options.cwd || process.cwd()
    }, function(err, stdout, stderr) {
        if (err) {
            err.message = 'npm ' + args.join(' ') + ' failed: ' +
                (stderr || err.message);
            return callback(err);
        }
        callback(null, stdout);
    });
}

// ---------------------------------------------------------------------------
// Filesystem helpers (Node 10 compatible)
// ---------------------------------------------------------------------------

// Copy into a sibling directory and swap it in, so a failure part-way through
// cannot leave the destination without its previous, working contents.
function copyPackage(source, target) {
    var staging = target + '.tmp-' + process.pid;
    var previous = target + '.old-' + process.pid;

    removeTree(staging);
    copyTree(source, staging);

    var hadPrevious = false;
    try {
        fs.renameSync(target, previous);
        hadPrevious = true;
    } catch (e) { /* nothing installed there yet */ }

    try {
        fs.renameSync(staging, target);
    } catch (e) {
        // Put the previous copy back rather than leaving nothing behind
        if (hadPrevious) {
            try { fs.renameSync(previous, target); } catch (e2) { /* ignore */ }
        }
        removeTree(staging);
        throw e;
    }

    if (hadPrevious) removeTree(previous);
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

// Scratch prefixes hold a full package install. Track them so an unexpected
// exit cannot strand them under the OS temp directory.
function makeScratch() {
    var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitbook-plugin-'));
    scratchDirs.push(dir);

    if (!exitHookInstalled) {
        exitHookInstalled = true;
        process.on('exit', function() {
            scratchDirs.forEach(removeTree);
            scratchDirs = [];
        });
    }

    return dir;
}

function releaseScratch(dir) {
    removeTree(dir);
    var at = scratchDirs.indexOf(dir);
    if (at >= 0) scratchDirs.splice(at, 1);
}

// ---------------------------------------------------------------------------
// npm output handling
// ---------------------------------------------------------------------------

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

// `npm view <spec> --json` answers in three shapes: one object when a single
// version matches, an array of objects when several do, and a bare version
// string in some field-limited cases. Fold all three into the version-keyed
// map the engine expects.
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

// ---------------------------------------------------------------------------
// The npm API surface the engine uses
// ---------------------------------------------------------------------------

var npm = {
    prefix: process.cwd(),

    load: function(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (options && options.prefix) npm.prefix = options.prefix;

        // Resolve the version here rather than in the getter: load() is async
        // and always runs before the engine logs "using npm@X", so nothing
        // has to block the event loop on a synchronous spawn.
        if (cachedVersion !== null) {
            return process.nextTick(function() { callback(null, npm); });
        }

        run(['--version'], function(err, stdout) {
            cachedVersion = err ? 'system' : String(stdout).trim();
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
                ], {cwd: where}, function(err) {
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
                var scratch = makeScratch();

                run([
                    'install', spec,
                    '--prefix', scratch,
                    shallowInstallFlag(),
                    '--no-save', '--no-audit', '--no-fund',
                    '--no-package-lock', '--loglevel', 'error'
                ], {cwd: where}, function(installErr) {
                    if (installErr) {
                        releaseScratch(scratch);
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
                        releaseScratch(scratch);
                        return callback(copyErr);
                    }

                    releaseScratch(scratch);
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
            run(['view', spec, '--json'], function(err, stdout) {
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

// npm 9 renamed --global-style to --install-strategy=shallow and npm 10
// dropped the old flag, so pick whichever this npm understands. Unknown
// versions get the modern spelling: npm 6-8 would silently ignore it, while
// npm 10+ rejects the old one outright.
function shallowInstallFlag() {
    var major = parseInt(cachedVersion, 10);
    return (isNaN(major) || major >= 9) ? '--install-strategy=shallow'
                                        : '--global-style';
}

// Reported in the engine's "installing N plugins using npm@X" log line.
// load() fills this in; it never spawns anything itself.
Object.defineProperty(npm, 'version', {
    enumerable: true,
    get: function() {
        return cachedVersion === null ? 'system' : cachedVersion;
    }
});

// Exposed for the unit tests; the engine only ever uses the npm API above.
npm._normalizeView = normalizeView;
npm._widenRange = widenRange;
npm._shallowInstallFlag = shallowInstallFlag;
npm._resolveNpm = resolveNpm;
npm._setRunner = function(fn) {
    runner = fn;
    cachedVersion = null;
};
npm._setNpmVersion = function(v) { cachedVersion = v; };

module.exports = npm;
