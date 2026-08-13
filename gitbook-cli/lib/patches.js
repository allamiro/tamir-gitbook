var fs = require('fs');
var path = require('path');

// Compatibility fixes applied to a freshly installed GitBook engine so it
// runs on modern Node.js. Every patch is guarded: it only fires when the
// target still contains the legacy code, so re-runs and already-patched
// engines are no-ops.
var STRING_PATCHES = [
    {
        // send < 0.16 reads res._headers, which modern Node removed — any
        // conditional request (browser cache revalidation) crashes
        // `gitbook serve` with "Cannot read properties of undefined".
        file: 'node_modules/send/index.js',
        find: 'this.res._headers',
        replace: '(this.res.getHeaders ? this.res.getHeaders() : this.res._headers || {})',
        // The replacement contains the text it searches for, so re-running
        // would wrap the expression again (and again). Detect the applied
        // form instead of relying on the search text being gone.
        applied: 'this.res.getHeaders ? this.res.getHeaders()'
    }
];

var SHIM_MARKER = 'system-npm shim';
var SHIM_PACKAGE = {
    name: 'gitbook-npm-shim',
    version: '1.0.0',
    main: 'index.js',
    private: true
};

function removeTree(target) {
    if (fs.rmSync) {
        try {
            fs.rmSync(target, {recursive: true, force: true});
        } catch (e) { /* already gone */ }
        return;
    }

    // Node < 14 has no fs.rmSync, and fs.rmdirSync's recursive option only
    // arrived in 12.10 — recurse by hand so this works back to Node 10.
    // Without this the old npm tree survives and only index.js is replaced,
    // leaving a half-shimmed engine.
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

function applyStringPatches(root) {
    STRING_PATCHES.forEach(function(patch) {
        var file = path.resolve(root, patch.file);
        var source;

        try {
            source = fs.readFileSync(file, 'utf8');
        } catch (e) {
            return;
        }

        if (patch.applied && source.indexOf(patch.applied) >= 0) return;
        if (source.indexOf(patch.find) < 0) return;

        fs.writeFileSync(file, source.split(patch.find).join(patch.replace));
        console.log('Applied Node compatibility patch to', patch.file);
    });
}

// The engine bundles a whole npm (~40 MB) only so its plugin installer can
// use npm's programmatic API — removed in npm 8, so on modern Node
// `gitbook install` crashes. Swap it for a small shim over the system npm.
function applyNpmShim(root) {
    var npmDir = path.resolve(root, 'node_modules/npm');
    var npmiDir = path.resolve(root, 'node_modules/npmi');

    if (!fs.existsSync(npmiDir) || !fs.existsSync(npmDir)) return;

    var indexFile = path.join(npmDir, 'index.js');

    // Identify an existing shim by its package name, not just by the marker
    // in index.js: a stale index.js can survive alongside a real npm tree,
    // and that must still count as "needs shimming"
    try {
        var installed = JSON.parse(
            fs.readFileSync(path.join(npmDir, 'package.json'), 'utf8')
        );
        if (installed.name === SHIM_PACKAGE.name &&
            fs.readFileSync(indexFile, 'utf8').indexOf(SHIM_MARKER) >= 0) {
            return; // already shimmed
        }
    } catch (e) { /* not shimmed yet */ }

    var shim = fs.readFileSync(
        path.resolve(__dirname, 'engine-npm-shim.js'), 'utf8'
    );

    removeTree(npmDir);
    fs.mkdirSync(npmDir, {recursive: true});
    // The folder keeps the name "npm" so require('npm') resolves to it, but
    // the package is named for what it actually is
    fs.writeFileSync(
        path.join(npmDir, 'package.json'),
        JSON.stringify(SHIM_PACKAGE, null, 2) + '\n'
    );
    fs.writeFileSync(indexFile, shim);

    console.log('Replaced the engine\'s bundled npm with a system-npm shim');
}

// Apply all patches to an installed engine folder.
function apply(root) {
    applyStringPatches(root);
    applyNpmShim(root);
}

module.exports = {
    apply: apply
};
