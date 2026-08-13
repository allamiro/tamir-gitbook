var fs = require('fs');
var path = require('path');

// How to invoke npm, resolved once.
//
// On Windows the npm launcher is npm.cmd, and modern Node refuses to
// execFile a .cmd file (EINVAL, tightened by the fix for CVE-2024-27980).
// Running npm's own JS entry point with the current node binary avoids that
// without involving a shell — so user-controlled package specs can never be
// interpreted as shell syntax.
//
// lib/engine-npm-shim.js deliberately carries its own copy of this logic:
// it is written into a fetched engine and must stand alone there, with no
// dependency on this package.
var cached = null;

function resolveNpm() {
    if (cached) return cached;

    if (process.platform !== 'win32') {
        cached = {file: 'npm', prefixArgs: []};
        return cached;
    }

    var candidates = [];
    if (process.env.npm_execpath) candidates.push(process.env.npm_execpath);
    candidates.push(path.join(path.dirname(process.execPath),
        'node_modules', 'npm', 'bin', 'npm-cli.js'));

    for (var i = 0; i < candidates.length; i++) {
        try {
            if (candidates[i] && /\.js$/i.test(candidates[i]) &&
                fs.existsSync(candidates[i])) {
                cached = {file: process.execPath, prefixArgs: [candidates[i]]};
                return cached;
            }
        } catch (e) { /* try the next candidate */ }
    }

    cached = {file: 'npm.cmd', prefixArgs: []};
    return cached;
}

// Full argv for a given npm command
function npmArgs(args) {
    return resolveNpm().prefixArgs.concat(args);
}

function npmFile() {
    return resolveNpm().file;
}

module.exports = {
    resolve: resolveNpm,
    file: npmFile,
    args: npmArgs
};
