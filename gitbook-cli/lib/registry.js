var Q = require('q');
var fs = require('fs-extra');
var tmp = require('tmp');
var _ = require('lodash');
var path = require('path');
var childProcess = require('child_process');

var tags = require('./tags');
var config = require('./config');

var NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Run the system npm CLI and resolve with its stdout.
// The CLI historically embedded a full programmatic npm, but npm removed its
// programmatic API in v8 — spawning the system npm works with every npm
// version and keeps this package free of the huge bundled-npm dependency tree.
function execNpm(args) {
    var deferred = Q.defer();

    childProcess.execFile(NPM_BIN, args, {
        maxBuffer: 10 * 1024 * 1024,
        env: process.env
    }, function(err, stdout, stderr) {
        if (err) {
            err.message = 'npm ' + args.join(' ') + ' failed: ' +
                (stderr || err.message);
            deferred.reject(err);
        } else {
            deferred.resolve(stdout);
        }
    });

    return deferred.promise;
}

// Return a list of versions available in the registry (npm)
function availableVersions() {
    return execNpm(['view', 'gitbook', 'versions', 'dist-tags', '--json'])
    .then(function(stdout) {
        var result = JSON.parse(stdout);

        result = {
            versions: _.chain(result.versions)
                .filter(function(v) {
                    return tags.isValid(v);
                })
                .sort(tags.sort)
                .value(),
            tags: _.omitBy(result['dist-tags'], function(tagVersion) {
                return !tags.isValid(tagVersion);
            })
        };

        if (result.versions.length == 0) throw new Error('No valid version on the NPM registry');
        return result;
    });
}

// Resolve a version name or tag to an installable absolute version
function resolveVersion(version) {
    var _version = version;

    return availableVersions()
    .then(function(available) {
        // Resolve if tag
        if (available.tags[version]) version = available.tags[version];

        version = _.find(available.versions, function(v) {
            return tags.satisfies(v, version, {
                // Tag is resolved from npm dist-tags
                acceptTagCondition: false
            });
        });

        // Check version
        if (!version) throw new Error('Invalid version or tag "'+_version+'", see available using "gitbook ls-remote"');
        return version;
    });
}

// Install a specific version of gitbook
function installVersion(version, forceInstall) {
    return resolveVersion(version)
    .then(function(_version) {
        version = _version;
        return Q.nfcall(tmp.dir.bind(tmp));
    })
    .spread(function(tmpDir) {
        console.log('Installing GitBook', version);
        var args = [
            'install', 'gitbook@' + version,
            '--prefix', tmpDir,
            // Keep dependencies nested under node_modules/gitbook (instead of
            // hoisted to the prefix root) — installVersion copies only the
            // gitbook folder, so it must be self-contained
            '--global-style',
            '--loglevel', 'silent',
            '--no-save',
            '--no-audit',
            '--no-package-lock'
        ];
        if (forceInstall) args.push('--force');
        return execNpm(args).thenResolve(tmpDir);
    })
    .then(function(tmpDir) {
        var gitbookRoot = path.resolve(tmpDir, 'node_modules/gitbook');
        var packageJson = fs.readJsonSync(path.resolve(gitbookRoot, 'package.json'));
        var version = packageJson.version;

        var outputFolder = path.resolve(config.VERSIONS_ROOT, version);

        if (!tags.isValid(version)) throw 'Invalid GitBook version, should satisfies '+config.GITBOOK_VERSION;

        // Copy to the install folder
        return Q.nfcall(fs.copy.bind(fs), gitbookRoot, outputFolder)
        .thenResolve(version);
    });
}

module.exports = {
    versions: availableVersions,
    resolve: resolveVersion,
    install: installVersion
};
